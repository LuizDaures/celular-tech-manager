
export interface Product {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  brand: string;
  model: string;
  costPrice: number;
  price: number;
  stock: number;
  warrantyMonths: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  items: SaleItem[];
  totalAmount: number;
  date: Date;
  status: 'completed' | 'cancelled';
  paymentMethod: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'seller';
  isActive: boolean;
  emailConfirmed?: boolean;
  createdAt?: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  date: Date;
  userId: string;
}

export interface CompanyData {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
}

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export interface SupabaseProduct {
  id: string;
  name: string;
  category_id: string | null;
  brand: string | null;
  sku: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  warranty_months: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  product_categories?: {
    name: string;
  } | null;
}

export interface SupabaseClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null; // Adicionando CPF ao tipo
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseSale {
  id: string;
  client_id: string | null;
  salesperson_name: string;
  total_amount: number;
  sale_date: string;
  status: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
  } | null;
  sale_items?: SupabaseSaleItem[];
}

export interface SupabaseSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  warranty_end_date: string;
  created_at: string;
  products?: {
    name: string;
  } | null;
}

export interface SupabaseStockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  products?: {
    name: string;
  } | null;
}
