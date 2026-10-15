import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Pipeline } from './pages/Pipeline';
import { FollowUps } from './pages/FollowUps';
import { Customers } from './pages/Customers';
import { Orders } from './pages/Orders';
import { GlobalSearch } from './pages/GlobalSearch';
import { UsersPage } from './pages/Users';
import { FormBuilder } from './pages/FormBuilder';
import { PublicForm } from './pages/PublicForm';
import { Login } from './pages/Login';

const getPublicFormParam = (): string | null => {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const qForm = searchParams.get('form');
  if (qForm) return qForm;

  if (window.location.hash) {
    const hashMatch = window.location.hash.match(/^#\/?form\/([^/?#]+)/);
    if (hashMatch && hashMatch[1]) return hashMatch[1];
  }

  const pathMatch = window.location.pathname.match(/^\/form\/([^/?#]+)/);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  return null;
};

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Navigations with params
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [selectedCustomerIdForOrder, setSelectedCustomerIdForOrder] = useState<string | undefined>(undefined);

  // Modal triggers
  const [openLeadModalTrigger, setOpenLeadModalTrigger] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          Loading CRMX System...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleGlobalSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentTab('search');
  };

  const handleNavigate = (tab: string, param?: string) => {
    if (tab === 'orders' && param) {
      setSelectedOrderId(param);
    }
    if (tab === 'customers' && param) {
      setSelectedCustomerId(param);
    }
    setCurrentTab(tab);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Universal Top Header with Live Search Omnibar */}
        <Navbar
          onSearch={handleGlobalSearch}
          openCreateLeadModal={() => {
            setCurrentTab('leads');
            setOpenLeadModalTrigger(true);
          }}
          openCreateOrderModal={() => {
            setSelectedCustomerIdForOrder(undefined);
            setCurrentTab('orders');
          }}
          onSelectCustomer={(cId) => {
            setSelectedCustomerId(cId);
            setCurrentTab('customers');
          }}
          onSelectOrder={(oId) => {
            setSelectedOrderId(oId);
            setCurrentTab('orders');
          }}
          onSelectLead={(lId) => {
            setCurrentTab('leads');
          }}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentTab === 'leads' && (
            <Leads
              onOpenCustomer={(cId) => {
                setSelectedCustomerId(cId);
                setCurrentTab('customers');
              }}
              openCreateModalTrigger={openLeadModalTrigger}
            />
          )}
          {currentTab === 'pipeline' && (
            <Pipeline
              onOpenCustomer={(cId) => {
                setSelectedCustomerId(cId);
                setCurrentTab('customers');
              }}
            />
          )}
          {currentTab === 'followups' && <FollowUps />}
          {currentTab === 'customers' && (
            <Customers
              initialCustomerId={selectedCustomerId}
              onSelectCustomer={(cId) => {
                setSelectedCustomerId(cId);
              }}
              openCreateOrderWithCustomerId={(cId) => {
                setSelectedCustomerIdForOrder(cId);
                setCurrentTab('orders');
              }}
              onNavigateToOrder={(oId) => {
                setSelectedOrderId(oId);
                setCurrentTab('orders');
              }}
            />
          )}
          {currentTab === 'orders' && (
            <Orders
              initialOrderId={selectedOrderId}
              preselectedCustomerId={selectedCustomerIdForOrder}
            />
          )}
          {currentTab === 'search' && (
            <GlobalSearch
              initialQuery={searchQuery}
              onNavigateToCustomer={(cId) => {
                setSelectedCustomerId(cId);
                setCurrentTab('customers');
              }}
              onNavigateToOrder={(oId) => {
                setSelectedOrderId(oId);
                setCurrentTab('orders');
              }}
            />
          )}
          {currentTab === 'forms' && <FormBuilder />}
          {currentTab === 'users' && <UsersPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const [publicFormId, setPublicFormId] = useState<string | null>(() => getPublicFormParam());

  useEffect(() => {
    const handleUrlChange = () => {
      setPublicFormId(getPublicFormParam());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  if (publicFormId) {
    return <PublicForm formIdOrSlug={publicFormId} />;
  }

  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
