import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Mail,
  Phone,
  Shield,
  Search,
  CheckCircle,
  X,
  Key,
  Plus,
  Trash2,
  Lock,
  Check,
  Save,
  Users,
  Layers,
  Sparkles,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { User, Role, PermissionDef } from '../types';
import { useAuth } from '../context/AuthContext';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionsList, setPermissionsList] = useState<PermissionDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Selected role for permissions matrix
  const [selectedRoleSlug, setSelectedRoleSlug] = useState<string>('agent');
  const [selectedRolePerms, setSelectedRolePerms] = useState<string[]>([]);
  const [permsSaving, setPermsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    phone: ''
  });

  // Change User Role Modal
  const [userToEditRole, setUserToEditRole] = useState<User | null>(null);
  const [updatedRoleVal, setUpdatedRoleVal] = useState('');

  // Create Role Modal
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#10b981',
    permissions: [] as string[]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes, pRes] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getPermissions()
      ]);
      setUsers(uRes || []);
      setRoles(rRes || []);
      setPermissionsList(pRes || []);

      // Set initial selected role perms
      if (rRes && rRes.length > 0) {
        const found = rRes.find((r: Role) => r.slug === selectedRoleSlug) || rRes[0];
        setSelectedRoleSlug(found.slug);
        setSelectedRolePerms(found.permissions || []);
      }
    } catch (err) {
      console.error('Failed to load access control data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selected role changes, update its current permissions
  const handleSelectRole = (slug: string) => {
    setSelectedRoleSlug(slug);
    const target = roles.find((r) => r.slug === slug);
    if (target) {
      setSelectedRolePerms([...(target.permissions || [])]);
    }
    setSaveSuccessMsg('');
  };

  // Toggle single permission for current role
  const handleTogglePermission = (permId: string) => {
    if (selectedRoleSlug === 'admin') return; // Admin has permanent full access
    if (selectedRolePerms.includes(permId)) {
      setSelectedRolePerms(selectedRolePerms.filter((p) => p !== permId));
    } else {
      setSelectedRolePerms([...selectedRolePerms, permId]);
    }
  };

  // Quick permission helpers
  const handleSelectAllPerms = () => {
    if (selectedRoleSlug === 'admin') return;
    setSelectedRolePerms(permissionsList.map((p) => p.id));
  };

  const handleClearAllPerms = () => {
    if (selectedRoleSlug === 'admin') return;
    setSelectedRolePerms([]);
  };

  // Save updated permissions to backend
  const handleSavePermissions = async () => {
    if (selectedRoleSlug === 'admin') return;
    setPermsSaving(true);
    try {
      await api.updateRolePermissions(selectedRoleSlug, selectedRolePerms);
      setSaveSuccessMsg(`Permissions for '${selectedRole?.name}' saved successfully!`);
      // Update local roles state
      setRoles((prev) =>
        prev.map((r) =>
          r.slug === selectedRoleSlug ? { ...r, permissions: selectedRolePerms } : r
        )
      );
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save permissions');
    } finally {
      setPermsSaving(false);
    }
  };

  // Create Role Submit
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name.trim()) return;

    try {
      const generatedSlug = newRole.slug.trim()
        ? newRole.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
        : newRole.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      await api.createRole({
        ...newRole,
        slug: generatedSlug
      });

      setShowCreateRoleModal(false);
      setNewRole({
        name: '',
        slug: '',
        description: '',
        color: '#10b981',
        permissions: []
      });
      await loadData();
      setSelectedRoleSlug(generatedSlug);
    } catch (err: any) {
      alert(err.message || 'Failed to create role');
    }
  };

  // Delete Role
  const handleDeleteRole = async (role: Role) => {
    if (role.is_system === 1) {
      alert('System default roles cannot be deleted.');
      return;
    }
    if ((role.user_count || 0) > 0) {
      alert(`Cannot delete role '${role.name}'. It currently has ${role.user_count} assigned users.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete role '${role.name}'?`)) return;

    try {
      await api.deleteRole(role.id);
      await loadData();
      setSelectedRoleSlug('agent');
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    }
  };

  // Add User Submit
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setShowAddUserModal(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: roles[0]?.slug || 'agent',
        phone: ''
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Change User Role Submit
  const handleChangeUserRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEditRole || !updatedRoleVal) return;
    try {
      await api.updateUserRole(userToEditRole.id, updatedRoleVal);
      setUserToEditRole(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  // Delete User
  const handleDeleteUser = async (u: User) => {
    if (u.id === currentUser?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user ${u.name}?`)) return;
    try {
      await api.deleteUser(u.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const selectedRole = roles.find((r) => r.slug === selectedRoleSlug);

  // Group permissions by category
  const categories = Array.from(new Set(permissionsList.map((p) => p.category)));

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    const q = searchUserQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  const colorPresets = [
    { label: 'Emerald', hex: '#10b981' },
    { label: 'Teal', hex: '#0d9488' },
    { label: 'Cyan', hex: '#06b6d4' },
    { label: 'Blue', hex: '#3b82f6' },
    { label: 'Violet', hex: '#8b5cf6' },
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Rose', hex: '#f43f5e' },
    { label: 'Slate', hex: '#64748b' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            Admin: Roles & Permissions Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create custom roles, assign granular functional permissions, and manage staff access.
          </p>
        </div>

        {/* Action Button depends on active tab */}
        <div className="flex items-center gap-2.5">
          {activeTab === 'users' ? (
            <button
              onClick={() => {
                setNewUser({
                  name: '',
                  email: '',
                  password: '',
                  role: roles[0]?.slug || 'agent',
                  phone: ''
                });
                setShowAddUserModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Team Member
            </button>
          ) : (
            <button
              onClick={() => setShowCreateRoleModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New Role
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Members & Staff</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 font-mono text-slate-600 font-bold">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'roles'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Roles & Permissions Matrix</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 font-mono text-emerald-700 font-bold">
            {roles.length} Roles
          </span>
        </button>
      </div>

      {/* ================= TAB 1: USERS & STAFF ================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Users</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Active accounts</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">System Admins</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {users.filter((u) => u.role === 'admin').length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Full unrestricted privileges</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sales Managers</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {users.filter((u) => u.role === 'manager').length}
              </div>
              <div className="text-[11px] text-teal-600 font-medium mt-0.5">Pipeline & tracking oversight</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Agents & Custom Roles</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {users.filter((u) => u.role !== 'admin' && u.role !== 'manager').length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Front-line operations</div>
            </div>
          </div>

          {/* Search and Table Filter */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter users by name, email, role..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-emerald-500"
                />
              </div>

              <div className="text-xs text-slate-400 font-medium">
                Showing {filteredUsers.length} of {users.length} members
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">User / Agent Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Loading team members...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No team members match the search query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const roleObj = roles.find((r) => r.slug === u.role);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                              />
                              <div>
                                <div className="font-bold text-slate-900">{u.name}</div>
                                {u.id === currentUser?.id && (
                                  <span className="text-[10px] text-emerald-600 font-semibold">(You)</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase inline-flex items-center gap-1.5"
                              style={{
                                backgroundColor: roleObj?.color ? `${roleObj.color}15` : '#f1f5f9',
                                color: roleObj?.color || '#334155',
                                border: `1px solid ${roleObj?.color ? `${roleObj.color}40` : '#cbd5e1'}`
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: roleObj?.color || '#64748b' }}
                              ></span>
                              {roleObj?.name || u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{u.phone || '—'}</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setUserToEditRole(u);
                                  setUpdatedRoleVal(u.role);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                              >
                                Change Role
                              </button>
                              {u.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: ROLES & PERMISSIONS MATRIX ================= */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Roles Selector Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Available Roles ({roles.length})
              </h2>
              <span className="text-xs text-slate-400">
                Click any role card below to configure its permissions
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {roles.map((r) => {
                const isSelected = r.slug === selectedRoleSlug;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r.slug)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: r.color || '#10b981' }}
                          ></span>
                          <span className="font-extrabold text-sm text-slate-900">{r.name}</span>
                        </div>
                        {r.is_system === 1 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            System
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Custom
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {r.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="font-medium text-slate-600 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.user_count || 0} Members</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-700 font-bold">
                          {r.slug === 'admin' ? permissionsList.length : (r.permissions || []).length} / {permissionsList.length} Perms
                        </span>
                        {r.is_system === 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(r);
                            }}
                            className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded"
                            title="Delete role"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permissions Matrix Panel */}
          {selectedRole && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: selectedRole.color || '#10b981' }}
                    ></span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Configuring Permissions: <span className="text-emerald-700">{selectedRole.name}</span>
                    </h3>
                    <span className="text-xs font-mono bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded">
                      slug: {selectedRole.slug}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{selectedRole.description}</p>
                </div>

                {selectedRole.slug !== 'admin' ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleSelectAllPerms}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleClearAllPerms}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      Deselect All
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={permsSaving}
                      className="btn-primary flex items-center gap-1.5 py-1.5 px-4 text-xs"
                    >
                      {permsSaving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Save Permissions
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    Administrator role retains 100% full security privileges
                  </div>
                )}
              </div>

              {/* Notification Banner */}
              {saveSuccessMsg && (
                <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {saveSuccessMsg}
                </div>
              )}

              {/* Categorized Permissions Grid */}
              <div className="p-6 space-y-6">
                {categories.map((category) => {
                  const catPerms = permissionsList.filter((p) => p.category === category);
                  const isRoleAdmin = selectedRole.slug === 'admin';

                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          {category} Permissions
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({catPerms.filter((p) => isRoleAdmin || selectedRolePerms.includes(p.id)).length} / {catPerms.length} enabled)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catPerms.map((perm) => {
                          const isChecked = isRoleAdmin || selectedRolePerms.includes(perm.id);

                          return (
                            <div
                              key={perm.id}
                              onClick={() => handleTogglePermission(perm.id)}
                              className={`p-3 rounded-xl border text-xs transition-all flex items-start gap-3 select-none ${
                                isRoleAdmin
                                  ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-90'
                                  : isChecked
                                  ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 cursor-pointer shadow-xs'
                                  : 'bg-white border-slate-200/90 hover:border-slate-300 text-slate-600 cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isRoleAdmin}
                                onChange={() => {}} // handled by parent onClick
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                              />

                              <div className="flex-1">
                                <div className="font-bold flex items-center justify-between">
                                  <span className={isChecked ? 'text-slate-900 font-extrabold' : 'text-slate-700'}>
                                    {perm.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {perm.id}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                  {perm.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sticky Save Bar for non-admin roles */}
              {selectedRole.slug !== 'admin' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    <span className="font-bold text-slate-800">{selectedRolePerms.length}</span> permissions assigned to role <span className="font-bold text-emerald-700">{selectedRole.name}</span>
                  </span>
                  <button
                    onClick={handleSavePermissions}
                    disabled={permsSaving}
                    className="btn-primary flex items-center gap-1.5 py-2 px-5 text-xs"
                  >
                    {permsSaving ? 'Saving...' : 'Save Permissions Matrix'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: ADD USER ================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Add New Team Member
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Vikas Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="vikas@crmx.io"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                >
                  {roles.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name} {r.is_system === 1 ? '(System)' : '(Custom)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+1 (555) 234-5678"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE USER ROLE ================= */}
      {userToEditRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Change Role: {userToEditRole.name}</h3>
              <button onClick={() => setUserToEditRole(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangeUserRoleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select New Role</label>
                <select
                  value={updatedRoleVal}
                  onChange={(e) => setUpdatedRoleVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                >
                  {roles.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name} ({r.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToEditRole(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE ROLE ================= */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-600" />
                Create New Role
              </h3>
              <button
                onClick={() => setShowCreateRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="mt-4 space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operations Coordinator"
                  value={newRole.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                    setNewRole({ ...newRole, name, slug: autoSlug });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Key / Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. operations_coordinator"
                  value={newRole.slug}
                  onChange={(e) => setNewRole({ ...newRole, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe duties and expected authority for this role..."
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Accent Color</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((cp) => (
                    <button
                      key={cp.hex}
                      type="button"
                      onClick={() => setNewRole({ ...newRole, color: cp.hex })}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        newRole.color === cp.hex ? 'scale-110 ring-2 ring-slate-900' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: cp.hex }}
                      title={cp.label}
                    >
                      {newRole.color === cp.hex && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700">Initial Permissions</label>
                  <span className="text-[10px] text-slate-400">
                    {newRole.permissions.length} selected
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50/50">
                  {permissionsList.map((p) => {
                    const isChecked = newRole.permissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white text-[11px] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRole({
                                ...newRole,
                                permissions: [...newRole.permissions, p.id]
                              });
                            } else {
                              setNewRole({
                                ...newRole,
                                permissions: newRole.permissions.filter((pid) => pid !== p.id)
                              });
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-slate-800">{p.name}</span>
                        <span className="text-slate-400 text-[10px] ml-auto">[{p.category}]</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
