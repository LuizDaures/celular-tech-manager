
import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { ThemeToggle } from '../ThemeToggle';
import { Button } from '@/components/ui/button';
import { useApp } from '../../context/AppContext';

interface MainLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, onLogout }) => {
  const { currentUser } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="p-2"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-foreground">TechStock</h1>
        <ThemeToggle />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={closeSidebar}>
          <div 
            className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Menu</h2>
              <Button variant="ghost" size="sm" onClick={closeSidebar}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar onLogout={onLogout} currentUser={currentUser} onNavigate={closeSidebar} />
          </div>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-64 bg-card border-r border-border min-h-screen">
          <Sidebar onLogout={onLogout} currentUser={currentUser} />
        </div>

        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          <div className="hidden lg:flex items-center justify-between p-4 border-b border-border bg-card">
            <div></div>
            <ThemeToggle />
          </div>
          
          <main className="p-4 lg:p-6 max-w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
