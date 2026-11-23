// Core domain entities for BookNest.
// These map to the Supabase tables in supabase/migrations (books, profiles,
// cart_items, orders, order_items) and to the Demo Mode localStorage state.

export type Role = "customer" | "warehouse_manager" | "admin";

export const ROLES: Role[] = ["customer", "warehouse_manager", "admin"];

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  warehouse_manager: "Warehouse Manager",
  admin: "Administrator",
};

export type OrderStatus = "placed" | "processing" | "shipped" | "delivered";

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  summary: string;
  price: number; // SAR
  stock: number;
  pages: number;
  year: number;
  featured: boolean;
  coverFrom: string; // cover gradient start colour (hex)
  coverTo: string; // cover gradient end colour (hex)
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface CartItem {
  bookId: string;
  quantity: number;
}

export interface OrderItem {
  bookId: string;
  title: string; // snapshot at purchase time
  unitPrice: number; // price snapshot at purchase time (SAR)
  quantity: number;
}

export interface StatusEvent {
  status: OrderStatus;
  at: string; // ISO timestamp
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  recipientName: string;
  phone: string;
  city: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  history: StatusEvent[];
  createdAt: string;
}

export interface CheckoutForm {
  recipientName: string;
  phone: string;
  city: string;
  address: string;
}
