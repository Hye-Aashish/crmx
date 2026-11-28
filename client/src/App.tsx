import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
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
import { Login } from './pages/Login';

const MainLayout: React.FC = () => {
  const { user, isLoading, hasPermission } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Navigations with params
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(undefined);
  const [selectedCustomerIdForOrder, setSelectedCustomerIdForOrder] = useState<string | undefined>(undefined);
  const [ordersFilter, setOrdersFilter] = useState<string | undefined>(undefined);
  const [followupsTab, setFollowupsTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed' | undefined>(undefined);

  // Modal triggers
  const [openLeadModalTrigger, setOpenLeadModalTrigger] = useState(0);

  // Must run before any early return (Rules of Hooks)
  useEffect(() => {
    if (!user) return;
    const permittedTabs = [
      hasPermission('view_analytics') && 'dashboard',
      hasPermission('view_leads') && 'leads',
      hasPermission('view_pipeline') && 'pipeline',
      hasPermission('manage_followups') && 'followups',
      hasPermission('view_customers') && 'customers',
      hasPermission('view_orders') && 'orders',
      'search',
      (hasPermission('manage_roles') || hasPermission('manage_users')) && 'users'
    ].filter(Boolean) as string[];

    if (!permittedTabs.includes(currentTab) && permittedTabs[0]) {
      setCurrentTab(permittedTabs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, user?.permissions, currentTab]);

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

  const handleSetCurrentTab = (tab: string) => {
    if (tab === 'orders') {
      setOrdersFilter(undefined);
      setSelectedOrderId(undefined);
    }
    if (tab === 'followups') {
      setFollowupsTab(undefined);
    }
    setCurrentTab(tab);
    setMobileSidebarOpen(false);
  };

  const handleNavigate = (tab: string, param?: string) => {
    if (tab === 'orders') {
      if (param === 'invoice_pending' || param === 'invoice_sent' || param === 'due_payment') {
        setOrdersFilter(param);
        setSelectedOrderId(undefined);
      } else if (param) {
        setSelectedOrderId(param);
        setOrdersFilter(undefined);
      } else {
        setOrdersFilter(undefined);
      }
    }
    if (tab === 'followups' && param) {
      if (param === 'today' || param === 'upcoming' || param === 'overdue' || param === 'completed') {
        setFollowupsTab(param);
      }
    }
    if (tab === 'customers' && param) {
      setSelectedCustomerId(param);
    }
    setCurrentTab(tab);
  };

  return (
    <div className="flex h-[100dvh] text-slate-800 overflow-hidden font-sans app-shell">
      {/* Collapsible / Mobile Drawer Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleSetCurrentTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full app-main">
        {/* Universal Top Header with Live Search Omnibar */}
        <Navbar
          onMenuClick={() => setMobileSidebarOpen(true)}
          onSearch={handleGlobalSearch}
          openCreateLeadModal={() => {
            setCurrentTab('leads');
            setOpenLeadModalTrigger(Date.now());
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
            setSelectedLeadId(lId);
            setCurrentTab('leads');
          }}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          {currentTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentTab === 'leads' && (
            <Leads
              onOpenCustomer={(cId) => {
                setSelectedCustomerId(cId);
                setCurrentTab('customers');
              }}
              openCreateModalTrigger={openLeadModalTrigger}
              initialLeadId={selectedLeadId}
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
          {currentTab === 'followups' && <FollowUps initialTab={followupsTab} />}
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
              initialFilter={ordersFilter}
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
              onNavigateToLead={(lId) => {
                setSelectedLeadId(lId);
                setCurrentTab('leads');
              }}
            />
          )}
          {currentTab === 'users' &&
            (hasPermission('manage_roles') || hasPermission('manage_users')) && <UsersPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return <MainLayout />;
}
