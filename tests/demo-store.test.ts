import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_STORAGE_KEY, DemoStore, type KeyValueStorage } from "@/lib/demo/demo-store";
import type { CheckoutForm } from "@/lib/types";

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const form: CheckoutForm = {
  recipientName: "Sara Ahmed",
  phone: "0551234567",
  city: "Riyadh",
  address: "King Fahd Road, Olaya District, Building 12",
};

let storage: MemoryStorage;
let store: DemoStore;
let n = 0;

beforeEach(() => {
  storage = new MemoryStorage();
  n = 0;
  store = new DemoStore(storage, () => `id-${++n}`, () => new Date("2026-11-23T10:00:00Z"));
});

const stockOf = (id: string) => store.getState().books.find((b) => b.id === id)!.stock;

describe("DemoStore", () => {
  it("starts with seed data and the customer persona", () => {
    expect(store.activeUser?.role).toBe("customer");
    expect(store.getState().books.length).toBeGreaterThanOrEqual(15);
    expect(storage.getItem(DEMO_STORAGE_KEY)).not.toBeNull();
  });

  it("places an order atomically: stock down, cart cleared, order recorded", () => {
    const before = stockOf("the-time-machine");
    expect(store.addToCart("the-time-machine", 2).ok).toBe(true);
    const result = store.placeOrder(form);
    expect(result.ok).toBe(true);
    expect(stockOf("the-time-machine")).toBe(before - 2);
    expect(store.currentCart()).toEqual([]);
    expect(store.visibleOrders()[0].orderNumber).toBe("BN-00006");
  });

  it("does not create an order or change stock when stock is insufficient", () => {
    store.addToCart("the-silk-notebook", 2); // stock 2
    // Warehouse reduces stock after the customer filled the cart.
    store.switchPersona("demo-warehouse");
    expect(store.setStock("the-silk-notebook", 1).ok).toBe(true);
    store.switchPersona("demo-customer");
    const ordersBefore = store.getState().orders.length;
    const result = store.placeOrder(form);
    expect(result.ok).toBe(false);
    expect(store.getState().orders.length).toBe(ordersBefore);
    expect(stockOf("the-silk-notebook")).toBe(1);
    expect(store.currentCart()).toHaveLength(1);
  });

  it("prevents customers from changing stock or roles", () => {
    expect(store.setStock("meditations", 99).ok).toBe(false);
    expect(store.setUserRole("demo-customer", "admin").ok).toBe(false);
    expect(store.advanceOrderStatus("seed-order-5").ok).toBe(false);
  });

  it("lets warehouse managers set stock and advance orders", () => {
    store.switchPersona("demo-warehouse");
    expect(store.setStock("meditations", 3).ok).toBe(true);
    expect(stockOf("meditations")).toBe(3);
    expect(store.setStock("meditations", -1).ok).toBe(false);
    const r = store.advanceOrderStatus("seed-order-5");
    expect(r.ok && r.value.status).toBe("processing");
  });

  it("customers only see their own orders; staff see all", () => {
    expect(store.visibleOrders().every((o) => o.userId === "demo-customer")).toBe(true);
    store.switchPersona("demo-admin");
    expect(store.visibleOrders().length).toBe(store.getState().orders.length);
  });

  it("admins can change other users' roles but not their own", () => {
    store.switchPersona("demo-admin");
    expect(store.setUserRole("demo-customer-2", "warehouse_manager").ok).toBe(true);
    expect(store.setUserRole("demo-admin", "customer").ok).toBe(false);
    expect(store.visibleProfiles().length).toBe(5);
  });

  it("notifies subscribers on change (observer) and resets to seed", () => {
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.addToCart("meditations", 1);
    expect(calls).toBe(1);
    store.reset();
    expect(calls).toBe(2);
    expect(store.currentCart()).toEqual([]);
    unsubscribe();
    store.addToCart("meditations", 1);
    expect(calls).toBe(2);
  });

  it("persists to storage and reloads", () => {
    store.addToCart("meditations", 2);
    const reloaded = new DemoStore(storage);
    expect(reloaded.currentCart()).toEqual([{ bookId: "meditations", quantity: 2 }]);
  });
});
