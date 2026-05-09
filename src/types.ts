export type UserRole = 'attendant' | 'cashier' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  number: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'finalized' | 'cancelled';
  createdAt: string;
  finalizedAt?: string;
  attendantId?: string;
  attendantName?: string;
}
