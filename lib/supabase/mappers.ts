// Converts Supabase rows (snake_case) to the app's domain types (camelCase).
import type { Book, Order, OrderStatus, Profile, Role } from "@/lib/types";

export interface BookRow {
  id: string;
  title: string;
  author: string;
  category: string;
  summary: string;
  price: number | string;
  stock: number;
  pages: number;
  year: number;
  featured: boolean;
  cover_from: string;
  cover_to: string;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string;
  recipient_name: string;
  phone: string;
  city: string;
  address: string;
  subtotal: number | string;
  delivery_fee: number | string;
  total: number | string;
  status: OrderStatus;
  created_at: string;
  order_items: { book_id: string; title: string; unit_price: number | string; quantity: number }[] | null;
  order_status_events: { status: OrderStatus; created_at: string }[] | null;
}

export function mapBook(r: BookRow): Book {
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    category: r.category,
    summary: r.summary,
    price: Number(r.price),
    stock: r.stock,
    pages: r.pages,
    year: r.year,
    featured: r.featured,
    coverFrom: r.cover_from,
    coverTo: r.cover_to,
  };
}

export function mapProfile(r: ProfileRow): Profile {
  return { id: r.id, fullName: r.full_name, email: r.email, role: r.role, createdAt: r.created_at };
}

export function mapOrder(r: OrderRow): Order {
  return {
    id: r.id,
    orderNumber: r.order_number,
    userId: r.user_id,
    customerName: r.customer_name,
    recipientName: r.recipient_name,
    phone: r.phone,
    city: r.city,
    address: r.address,
    subtotal: Number(r.subtotal),
    deliveryFee: Number(r.delivery_fee),
    total: Number(r.total),
    status: r.status,
    createdAt: r.created_at,
    items: (r.order_items ?? []).map((i) => ({
      bookId: i.book_id,
      title: i.title,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
    })),
    history: (r.order_status_events ?? [])
      .map((e) => ({ status: e.status, at: e.created_at }))
      .sort((a, b) => a.at.localeCompare(b.at)),
  };
}
