
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Customer, Sale, User, StockMovement, CompanyData } from '../types';
import { useProducts } from '../hooks/useProducts';
import { useCustomers } from '../hooks/useCustomers';
import { useSales } from '../hooks/useSales';
import { useUsers } from '../hooks/useUsers';
import { useStockMovements } from '../hooks/useStockMovements';
import { useAuth } from '../hooks/useAuth';

interface AppContextType {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  users: User[];
  stockMovements: StockMovement[];
  currentUser: User | null;
  companyData: CompanyData;
  loading: {
    products: boolean;
    customers: boolean;
    sales: boolean;
    users: boolean;
    stockMovements: boolean;
    auth: boolean;
  };
  
  // Product methods
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Customer methods
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  // Sale methods
  addSale: (sale: Omit<Sale, 'id' | 'date'>) => void;
  updateSale: (id: string, sale: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  
  // User methods
  addUser: (user: { name: string; email: string; role: 'admin' | 'seller'; isActive: boolean }) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  changePassword: (userId: string, newPassword: string) => void;
  
  // Auth methods
  login: (email: string, password: string, signup?: boolean) => Promise<boolean>;
  logout: () => void;
  
  // Stock methods
  updateStock: (productId: string, quantity: number, reason: string) => void;
  
  // Company methods
  updateCompanyData: (data: Partial<CompanyData>) => void;
  
  // Refresh methods
  refetchProducts: () => void;
  refetchCustomers: () => void;
  refetchSales: () => void;
  refetchUsers: () => void;
  refetchStockMovements: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: 'TechStock Assistência Técnica',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
  });

  // Use the centralized auth hook
  const { currentUser, loading: authLoading, login, logout } = useAuth();

  // Use Supabase hooks
  const {
    products,
    loading: productsLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: refetchProducts,
  } = useProducts();

  const {
    customers,
    loading: customersLoading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: refetchCustomers,
  } = useCustomers();

  const {
    sales,
    loading: salesLoading,
    addSale,
    updateSale,
    deleteSale,
    refetch: refetchSales,
  } = useSales();

  const {
    users,
    loading: usersLoading,
    addUser,
    updateUser,
    deleteUser,
    changePassword,
    refetch: refetchUsers,
  } = useUsers();

  const {
    stockMovements,
    loading: stockMovementsLoading,
    addStockMovement,
    refetch: refetchStockMovements,
  } = useStockMovements(refetchProducts);

  const updateStock = (productId: string, quantity: number, reason: string) => {
    const type = quantity > 0 ? 'in' : 'out';
    addStockMovement(productId, Math.abs(quantity), reason, type);
  };

  const updateCompanyData = (data: Partial<CompanyData>) => {
    setCompanyData(prev => ({ ...prev, ...data }));
  };

  return (
    <AppContext.Provider value={{
      products,
      customers,
      sales,
      users,
      stockMovements,
      currentUser,
      companyData,
      loading: {
        products: productsLoading,
        customers: customersLoading,
        sales: salesLoading,
        users: usersLoading,
        stockMovements: stockMovementsLoading,
        auth: authLoading,
      },
      addProduct,
      updateProduct,
      deleteProduct,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addSale,
      updateSale,
      deleteSale,
      addUser,
      updateUser,
      deleteUser,
      changePassword,
      login,
      logout,
      updateStock,
      updateCompanyData,
      refetchProducts,
      refetchCustomers,
      refetchSales,
      refetchUsers,
      refetchStockMovements,
    }}>
      {children}
    </AppContext.Provider>
  );
};
