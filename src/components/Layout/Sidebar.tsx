
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Monitor,
  Shield,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User as UserType } from '../../types';

interface SidebarProps {
  onLogout: () => void;
  currentUser: UserType | null;
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, currentUser, onNavigate }) => {
  const location = useLocation();
  const isAdmin = currentUser?.role === 'admin';

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      name: 'Produtos',
      href: '/produtos',
      icon: Package,
      show: true,
    },
    {
      name: 'Vendas',
      href: '/vendas',
      icon: ShoppingCart,
      show: true,
    },
    {
      name: 'Clientes',
      href: '/clientes',
      icon: Users,
      show: true,
    },
    {
      name: 'Relatórios',
      href: '/relatorios',
      icon: BarChart3,
      show: isAdmin,
    },
    {
      name: 'Configurações',
      href: '/configuracoes',
      icon: Settings,
      show: true,
    },
  ];

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Monitor className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">TechStock</h2>
            <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          if (!item.show) return null;
          
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-muted">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            {isAdmin ? (
              <Shield className="h-4 w-4 text-primary-foreground" />
            ) : (
              <User className="h-4 w-4 text-primary-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {currentUser?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full flex items-center gap-2 text-destructive hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
