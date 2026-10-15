import React from 'react';
import {
  LayoutDashboard,
  Users2,
  GitPullRequest,
  Clock,
  UserCheck,
  PackageCheck,
  Search,
  ShieldCheck,
  LogOut,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed
}) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads Management', icon: Users2 },
    { id: 'pipeline', label: 'Sales Funnel (Kanban)', icon: GitPullRequest },
    { id: 'forms', label: 'Form Builder', icon: FileText },
    { id: 'followups', label: 'Follow-ups & Reminders', icon: Clock },
    { id: 'customers', label: 'Customer Profiles', icon: UserCheck },
    { id: 'orders', label: 'Orders & Tracking', icon: PackageCheck },
    { id: 'search', label: 'Global Phone Search', icon: Search },
    { id: 'users', label: 'Users & Roles', icon: ShieldCheck, adminOnly: true }
  ];

  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col transition-all duration-300 border-r border-slate-800 select-none z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <div
          onClick={() => setCurrentTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-200 bg-clip-text text-transparent flex items-center gap-1.5">
                CRMX
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Enterprise CRM & Orders</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-300 ${
              collapsed ? '' : 'rotate-180'
            }`}
          />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role === 'agent') return null;
          const Icon = item.icon;
          const active = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.id === 'pipeline' && (
                <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                  D&D
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">

        {/* User Profile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-slate-700 shrink-0 object-cover"
            />
            {!collapsed && (
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-200 truncate">{user?.name}</div>
                <div className="text-[11px] text-slate-400 capitalize">{user?.role}</div>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
