import { describe, expect, it } from "vitest";
import type { Book, CheckoutForm, Order } from "@/lib/types";
import { addToCart, buildCartLines, calculateTotals, setCartQuantity, validateQuantity, DELIVERY_FEE } from "@/lib/core/cart";
import { placeOrder, validateCheckoutForm } from "@/lib/core/checkout";
import { parseStockInput, stockLevel } from "@/lib/core/inventory";
import { computeSalesStats } from "@/lib/core/reports";
import { areaForPath, canAccess, canChangeRole, canManageInventory } from "@/lib/core/access";
import { filterBooks } from "@/lib/core/catalog";
import { nextStatus } from "@/lib/core/orders";
import { SEED_BOOKS } from "@/lib/demo/seed";

const book = (over: Partial<Book> = {}): Book => ({
  id: "b1",
  title: "Test Book",
  author: "Author",
  category: "Fiction",
  summary: "",
  price: 40,
  stock: 5,
  pages: 100,
  year: 2020,
  featured: false,
  coverFrom: "#000",
  coverTo: "#fff",
  ...over,
});

const validForm: CheckoutForm = {
  recipientName: "Sara Ahmed",
  phone: "0551234567",
  city: "Riyadh",
  address: "King Fahd Road, Olaya District, Building 12",
};

describe("cart calculations", () => {
  it("computes line totals, subtotal, delivery fee and total", () => {
    const books = [book({ id: "a", price: 39.5 }), book({ id: "b", price: 20 })];
    const lines = buildCartLines([{ bookId: "a", quantity: 2 }, { bookId: "b", quantity: 1 }], books);
    const totals = calculateTotals(lines);
    expect(totals.subtotal).toBe(99);
    expect(totals.deliveryFee).toBe(DELIVERY_FEE);
    expect(totals.total).toBe(114);
    expect(totals.itemCount).toBe(3);
  });

  it("gives free delivery from 200 SAR", () => {
    const totals = calculateTotals(buildCartLines([{ bookId: "a", quantity: 5 }], [book({ id: "a", price: 40, stock: 10 })]));
    expect(totals.subtotal).toBe(200);
    expect(totals.deliveryFee).toBe(0);
  });

  it("has no fee for an empty cart", () => {
    expect(calculateTotals([]).total).toBe(0);
  });

  it("rejects invalid quantities", () => {
    expect(validateQuantity(0, 5)).toMatch(/at least 1/);
    expect(validateQuantity(-1, 5)).toMatch(/at least 1/);
    expect(validateQuantity(1.5, 5)).toMatch(/whole number/);
    expect(validateQuantity(6, 5)).toMatch(/Only 5/);
    expect(validateQuantity(1, 0)).toMatch(/out of stock/);
    expect(validateQuantity(5, 5)).toBeNull();
  });

  it("does not let the cart exceed stock when adding repeatedly", () => {
    const b = book({ stock: 3 });
    const first = addToCart([], b, 2);
    expect(first.ok).toBe(true);
    const second = addToCart(first.ok ? first.cart : [], b, 2);
    expect(second.ok).toBe(false);
  });

  it("sets an exact quantity", () => {
    const b = book({ stock: 3 });
    const r = setCartQuantity([{ bookId: "b1", quantity: 1 }], b, 3);
    expect(r.ok && r.cart[0].quantity).toBe(3);
    expect(setCartQuantity([{ bookId: "b1", quantity: 1 }], b, 4).ok).toBe(false);
  });
});

describe("checkout (demo logic)", () => {
  const base = {
    form: validForm,
    userId: "u1",
    customerName: "Sara",
    orderId: "o1",
    orderNumber: "BN-00001",
    now: "2026-11-23T10:00:00.000Z",
  };

  it("validates the delivery form", () => {
    expect(validateCheckoutForm(validForm)).toEqual({});
    const errors = validateCheckoutForm({ recipientName: "A", phone: "123", city: "Paris", address: "short" });
    expect(Object.keys(errors).sort()).toEqual(["address", "city", "phone", "recipientName"]);
  });

  it("creates an order, snapshots prices and reduces stock", () => {
    const books = [book({ id: "a", price: 50, stock: 4 }), book({ id: "b", price: 30, stock: 2 })];
    const result = placeOrder({ ...base, books, cart: [{ bookId: "a", quantity: 3 }, { bookId: "b", quantity: 2 }] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.items).toEqual([
      { bookId: "a", title: "Test Book", unitPrice: 50, quantity: 3 },
      { bookId: "b", title: "Test Book", unitPrice: 30, quantity: 2 },
    ]);
    expect(result.order.subtotal).toBe(210);
    expect(result.order.total).toBe(210);
    expect(result.order.status).toBe("placed");
    expect(result.books.find((b) => b.id === "a")!.stock).toBe(1);
    expect(result.books.find((b) => b.id === "b")!.stock).toBe(0);
    // input was not mutated
    expect(books[0].stock).toBe(4);
  });

  it("fails without changing anything when one line is out of stock", () => {
    const books = [book({ id: "a", stock: 4 }), book({ id: "b", stock: 1, title: "Rare" })];
    const result = placeOrder({ ...base, books, cart: [{ bookId: "a", quantity: 1 }, { bookId: "b", quantity: 2 }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Not enough stock for "Rare"/);
    expect(books.map((b) => b.stock)).toEqual([4, 1]);
  });

  it("fails for an empty cart and for invalid form data", () => {
    expect(placeOrder({ ...base, books: [book()], cart: [] }).ok).toBe(false);
    const bad = placeOrder({ ...base, books: [book()], cart: [{ bookId: "b1", quantity: 1 }], form: { ...validForm, phone: "x" } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.fieldErrors?.phone).toBeDefined();
  });
});

describe("inventory rules", () => {
  it("classifies stock levels", () => {
    expect(stockLevel(0)).toBe("out");
    expect(stockLevel(5)).toBe("low");
    expect(stockLevel(6)).toBe("ok");
  });

  it("parses stock input safely", () => {
    expect(parseStockInput("12")).toEqual({ ok: true, value: 12 });
    expect(parseStockInput("0")).toEqual({ ok: true, value: 0 });
    expect(parseStockInput("-3").ok).toBe(false);
    expect(parseStockInput("2.5").ok).toBe(false);
    expect(parseStockInput("abc").ok).toBe(false);
    expect(parseStockInput("").ok).toBe(false);
    expect(parseStockInput("10001").ok).toBe(false);
  });
});

describe("order status pipeline", () => {
  it("moves forward one step at a time and stops at delivered", () => {
    expect(nextStatus("placed")).toBe("processing");
    expect(nextStatus("processing")).toBe("shipped");
    expect(nextStatus("shipped")).toBe("delivered");
    expect(nextStatus("delivered")).toBeNull();
  });
});

describe("sales report", () => {
  it("computes totals, status counts and top books", () => {
    const order = (id: string, status: Order["status"], items: Order["items"], total: number): Order => ({
      id, orderNumber: id, userId: "u", customerName: "c", recipientName: "r", phone: "", city: "", address: "",
      items, subtotal: total, deliveryFee: 0, total, status, history: [], createdAt: "",
    });
    const stats = computeSalesStats([
      order("1", "placed", [{ bookId: "a", title: "A", unitPrice: 10, quantity: 2 }], 20),
      order("2", "delivered", [{ bookId: "b", title: "B", unitPrice: 50, quantity: 1 }, { bookId: "a", title: "A", unitPrice: 12, quantity: 1 }], 62),
    ]);
    expect(stats.totalOrders).toBe(2);
    expect(stats.totalValue).toBe(82);
    expect(stats.booksSold).toBe(4);
    expect(stats.byStatus).toEqual({ placed: 1, processing: 0, shipped: 0, delivered: 1 });
    expect(stats.topBooks[0]).toEqual({ bookId: "a", title: "A", quantity: 3, revenue: 32 });
  });

  it("handles no orders", () => {
    expect(computeSalesStats([]).averageOrderValue).toBe(0);
  });
});

describe("access control rules", () => {
  it("restricts dashboards by role", () => {
    expect(canAccess("customer", "warehouse")).toBe(false);
    expect(canAccess("customer", "admin")).toBe(false);
    expect(canAccess("warehouse_manager", "warehouse")).toBe(true);
    expect(canAccess("warehouse_manager", "admin")).toBe(false);
    expect(canAccess("admin", "admin")).toBe(true);
    expect(canAccess(null, "account")).toBe(false);
    expect(canManageInventory("customer")).toBe(false);
  });

  it("only lets admins change other users' roles", () => {
    expect(canChangeRole("admin", "a", "b")).toBe(true);
    expect(canChangeRole("admin", "a", "a")).toBe(false);
    expect(canChangeRole("customer", "a", "a")).toBe(false);
    expect(canChangeRole("warehouse_manager", "a", "b")).toBe(false);
  });

  it("maps paths to protected areas", () => {
    expect(areaForPath("/admin")).toBe("admin");
    expect(areaForPath("/warehouse")).toBe("warehouse");
    expect(areaForPath("/orders/123")).toBe("account");
    expect(areaForPath("/checkout")).toBe("account");
    expect(areaForPath("/books")).toBeNull();
    expect(areaForPath("/administrator-info")).toBeNull();
  });
});

describe("catalog search", () => {
  it("has 15-20 seed books with valid data", () => {
    expect(SEED_BOOKS.length).toBeGreaterThanOrEqual(15);
    expect(SEED_BOOKS.length).toBeLessThanOrEqual(20);
    expect(new Set(SEED_BOOKS.map((b) => b.id)).size).toBe(SEED_BOOKS.length);
    for (const b of SEED_BOOKS) {
      expect(b.price).toBeGreaterThan(0);
      expect(b.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it("searches by title or author, case-insensitive", () => {
    expect(filterBooks(SEED_BOOKS, { q: "austen" }).map((b) => b.id)).toEqual(["pride-and-prejudice"]);
    expect(filterBooks(SEED_BOOKS, { q: "TIME MACHINE" })).toHaveLength(1);
    expect(filterBooks(SEED_BOOKS, { q: "zzz-no-match" })).toHaveLength(0);
  });

  it("filters by category and sorts by price", () => {
    const children = filterBooks(SEED_BOOKS, { category: "Children", sort: "price-asc" });
    expect(children.every((b) => b.category === "Children")).toBe(true);
    const prices = children.map((b) => b.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
