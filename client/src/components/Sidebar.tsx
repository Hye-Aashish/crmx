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
  TrendingUp,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  onMobileClose
}) => {
  const { user, logout } = useAuth();

  /** Desktop icon-rail mode (labels hidden). Mobile drawer always shows labels. */
  const rail = collapsed && !mobileOpen;

  const can = (permission: string) =>
    user?.role === 'admin' || !!user?.permissions?.includes(permission);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_analytics' },
    { id: 'leads', label: 'Leads Management', icon: Users2, permission: 'view_leads' },
    { id: 'pipeline', label: 'Sales Funnel (Kanban)', icon: GitPullRequest, permission: 'view_pipeline' },
    { id: 'followups', label: 'Follow-ups & Reminders', icon: Clock, permission: 'manage_followups' },
    { id: 'customers', label: 'Customer Profiles', icon: UserCheck, permission: 'view_customers' },
    { id: 'orders', label: 'Orders & Tracking', icon: PackageCheck, permission: 'view_orders' },
    { id: 'search', label: 'Global Phone Search', icon: Search },
    { id: 'users', label: 'Users & Roles', icon: ShieldCheck, anyOf: ['manage_roles', 'manage_users'] as string[] }
  ];

  const handleNav = (id: string) => {
    setCurrentTab(id);
    onMobileClose();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[4px] md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          text-white flex flex-col select-none relative overflow-hidden
          transition-[width,transform] duration-300 ease-out
          fixed inset-y-0 left-0 z-50 w-72
          md:static md:z-30 md:translate-x-0
          ${collapsed ? 'md:w-[4.5rem]' : 'md:w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          border-r border-white/5
          shadow-[8px_0_40px_rgba(2,44,34,0.35)]
        `}
        style={{
          background:
            'linear-gradient(175deg, #020617 0%, #0b1220 42%, #022c22 100%)'
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 right-[-20%] w-56 h-56 rounded-full bg-emerald-500/20 blur-[70px]" />
          <div className="absolute bottom-10 left-[-30%] w-48 h-48 rounded-full bg-teal-400/10 blur-[60px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
              backgroundSize: '28px 28px'
            }}
          />
        </div>

        {/* Header */}
        <div
          className={`relative shrink-0 border-b border-white/[0.06] ${
            rail
              ? 'flex flex-col items-center gap-2 py-3 px-2'
              : 'h-14 sm:h-16 flex items-center justify-between px-3.5'
          }`}
        >
          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            className={`flex items-center overflow-hidden text-left ${
              rail ? 'justify-center' : 'gap-3'
            }`}
            title="CRMX Dashboard"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/35 shrink-0 ring-1 ring-white/25">
              <TrendingUp className="w-[18px] h-[18px] text-white" />
            </div>
            {!rail && (
              <div>
                <div className="font-display font-bold text-[1.05rem] tracking-tight text-white flex items-center gap-1.5">
                  CRMX
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-emerald-400/15 text-emerald-300 border border-emerald-300/25 tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">Enterprise CRM</p>
              </div>
            )}
          </button>

          {/* Desktop collapse / expand */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden md:inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-300 hover:bg-white/5 transition-colors ${
              rail ? 'w-8 h-8' : 'p-1.5'
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {rail ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav
          className={`relative flex-1 py-3 overflow-y-auto overscroll-contain ${
            rail ? 'px-2 space-y-1' : 'px-2.5 space-y-0.5'
          }`}
        >
          {!rail && (
            <div className="px-2.5 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Workspace
            </div>
          )}
          {menuItems.map((item) => {
            if (item.permission && !can(item.permission)) return null;
            if (item.anyOf && !item.anyOf.some((p) => can(p))) return null;
            const Icon = item.icon;
            const active = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                title={item.label}
                className={`group flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  rail
                    ? `w-full justify-center h-10 px-0 ${
                        active
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-600/35'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
                      }`
                    : `w-full gap-3 px-3 py-2.5 ${
                        active
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]'
                      }`
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    active ? 'text-white' : 'text-slate-500 group-hover:text-emerald-300'
                  }`}
                />
                {!rail && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.id === 'pipeline' && (
                      <span className="ml-auto text-[9px] font-bold tracking-wide bg-black/20 text-emerald-100 px-1.5 py-0.5 rounded-md">
                        D&D
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={`relative shrink-0 border-t border-white/[0.06] bg-black/25 safe-area-bottom ${
            rail ? 'p-2' : 'p-2.5'
          }`}
        >
          {rail ? (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                  alt=""
                  className="w-8 h-8 rounded-full border border-emerald-400/40 object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-9 h-9 inline-flex items-center justify-center rounded-xl hover:bg-red-500/15 text-slate-500 hover:text-red-300 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/[0.06] px-2.5 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full border border-emerald-400/40 object-cover"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                </div>
                <div className="truncate min-w-0">
                  <div className="text-xs font-semibold text-slate-100 truncate">{user?.name}</div>
                  <div className="text-[10px] text-emerald-300/90 capitalize font-medium">{user?.role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-300 transition-colors shrink-0"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
