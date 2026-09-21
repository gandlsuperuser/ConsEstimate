'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, PermissionLevel, ModulePermissions, ROLE_CONFIG } from '@/lib/auth-types';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  is_active: boolean;
  permissions: ModulePermissions;
  created_at: string;
  updated_at?: string;
}

const MODULE_LABELS: Record<keyof ModulePermissions, { title: string; desc: string; icon: string }> = {
  estimates: { title: 'Estimates & Takeoffs', desc: 'Line items, unit pricing, margins & formulas', icon: '📊' },
  bidding: { title: 'Bidding & RFP Packages', desc: 'Subcontractor bids, invitations & leveling', icon: '📋' },
  contracts: { title: 'Commitments & Contracts', desc: 'Subcontracts, purchase orders & change orders', icon: '📜' },
  submittals: { title: 'Submittals & Approvals', desc: 'Packages, lead-times, revisions & schedule links', icon: '📤' },
  timeline: { title: 'Schedule & Gantt Master', desc: 'Project schedule, tasks, WBS, milestones & dependencies', icon: '📅' },
  drawings: { title: 'Drawings & 2D Markup', desc: 'Architectural sheets, markups, layers & pins', icon: '📐' },
  financials: { title: 'Financials & Pay Apps', desc: 'Budget tracking, owner billings, receipts & disbursements', icon: '💰' },
  field_logs: { title: 'Field Work & Observations', desc: 'Daily logs, site conditions, inspections & punch lists', icon: '👷' },
  user_management: { title: 'User & Team Permissions', desc: 'Assign roles, adjust permissions & invite team members', icon: '⚙️' },
};

const PERMISSION_LEVEL_CONFIG: Record<PermissionLevel, { label: string; color: string; desc: string }> = {
  none: { label: 'No Access', color: 'bg-zinc-900 text-zinc-400 border-zinc-700', desc: 'Module hidden or blocked' },
  view: { label: 'View Only', color: 'bg-blue-950/60 text-blue-300 border-blue-800/60', desc: 'Read-only access' },
  edit: { label: 'Edit & Work', color: 'bg-amber-950/60 text-amber-300 border-amber-800/60', desc: 'Create & edit items' },
  admin: { label: 'Full Admin', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60', desc: 'Full create, edit, delete, approve' },
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'permissions'>('info');
  const [modalFormData, setModalFormData] = useState({
    name: '',
    email: '',
    role: 'project_manager' as UserRole,
    department: '',
    phone: '',
    password: '',
    is_active: true,
    permissions: {} as ModulePermissions,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/auth/session'),
      ]);

      if (uRes.ok) {
        const data = await uRes.json();
        setUsers(data.users || []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setCurrentUser(sData.user);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    const defaultRole: UserRole = 'project_manager';
    setEditingUser(null);
    setModalFormData({
      name: '',
      email: '',
      role: defaultRole,
      department: '',
      phone: '',
      password: '',
      is_active: true,
      permissions: { ...ROLE_CONFIG[defaultRole].defaultPermissions },
    });
    setModalError(null);
    setActiveModalTab('info');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserData) => {
    setEditingUser(user);
    setModalFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      phone: user.phone || '',
      password: '',
      is_active: user.is_active,
      permissions: { ...user.permissions },
    });
    setModalError(null);
    setActiveModalTab('info');
    setIsModalOpen(true);
  };

  const handleRoleChangeInModal = (newRole: UserRole) => {
    setModalFormData((prev) => ({
      ...prev,
      role: newRole,
      permissions: { ...ROLE_CONFIG[newRole].defaultPermissions },
    }));
  };

  const handlePermissionChange = (moduleKey: keyof ModulePermissions, level: PermissionLevel) => {
    setModalFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: level,
      },
    }));
  };

  const handleResetPermissionsToRoleDefaults = () => {
    setModalFormData((prev) => ({
      ...prev,
      permissions: { ...ROLE_CONFIG[prev.role].defaultPermissions },
    }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalFormData.name.trim() || !modalFormData.email.trim()) {
      setModalError('Name and email are required fields.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: modalFormData.name,
            email: modalFormData.email,
            role: modalFormData.role,
            department: modalFormData.department,
            phone: modalFormData.phone,
            is_active: modalFormData.is_active,
            permissions: modalFormData.permissions,
            ...(modalFormData.password ? { password: modalFormData.password } : {}),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setModalError(data.error || 'Failed to update user.');
          setIsSaving(false);
          return;
        }

        showToast(`Updated user "${data.user.name}" successfully.`);
      } else {
        // Create user
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modalFormData),
        });

        const data = await res.json();
        if (!res.ok) {
          setModalError(data.error || 'Failed to create user.');
          setIsSaving(false);
          return;
        }

        showToast(`Added new team member "${data.user.name}".`);
      }

      setIsModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      console.error('Save user error:', err);
      setModalError('A network error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (!confirm(`Are you sure you want to permanently remove "${user.name}" (${user.email}) from the team?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete user.');
        return;
      }
      showToast(`Removed user "${user.name}".`);
      await fetchUsers();
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  const handleToggleStatus = async (user: UserData) => {
    const nextStatus = !user.is_active;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      if (res.ok) {
        showToast(`${user.name} is now ${nextStatus ? 'Active' : 'Deactivated'}.`);
        await fetchUsers();
      }
    } catch (e) {
      alert('Error changing status.');
    }
  };

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q);

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'inactive' && !u.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Role stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const pms = users.filter((u) => u.role === 'project_manager').length;
    return { total, active, admins, pms };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-600/80 text-emerald-100 text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <span className="text-emerald-400 font-bold text-base">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-orange-950/60 text-orange-400 border border-orange-800/60">
                Admin Control Panel
              </span>
              <span className="text-zinc-400 text-xs">· Settings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f4f4f5] tracking-tight">
              User Management & Role Permissions
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Assign company roles, configure granular module permissions, and manage team credentials across ConsEstimate.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-[0.98]"
            >
              <span>➕</span>
              <span>Add Team Member</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#27272a]">
          <div className="bg-[#18181b]/70 border border-[#27272a] rounded-xl p-3">
            <span className="text-xs text-zinc-400 block font-medium">Total Team Members</span>
            <span className="text-xl font-bold text-[#f4f4f5] mt-0.5 block">{stats.total}</span>
          </div>
          <div className="bg-[#18181b]/70 border border-[#27272a] rounded-xl p-3">
            <span className="text-xs text-zinc-400 block font-medium">Active Accounts</span>
            <span className="text-xl font-bold text-emerald-400 mt-0.5 block">{stats.active}</span>
          </div>
          <div className="bg-[#18181b]/70 border border-[#27272a] rounded-xl p-3">
            <span className="text-xs text-zinc-400 block font-medium">Administrators</span>
            <span className="text-xl font-bold text-orange-400 mt-0.5 block">{stats.admins}</span>
          </div>
          <div className="bg-[#18181b]/70 border border-[#27272a] rounded-xl p-3">
            <span className="text-xs text-zinc-400 block font-medium">Project Managers</span>
            <span className="text-xl font-bold text-blue-400 mt-0.5 block">{stats.pms}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, department..."
            className="w-full bg-[#121215] border border-[#27272a] rounded-xl px-3.5 py-2 text-sm text-[#f4f4f5] placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#121215] border border-[#27272a] rounded-xl px-3 py-2 text-xs font-semibold text-[#f4f4f5] focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
          >
            <option value="all">All Roles</option>
            {Object.entries(ROLE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#121215] border border-[#27272a] rounded-xl px-3 py-2 text-xs font-semibold text-[#f4f4f5] focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#18181b]/50 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Team Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Department / Trade</th>
                <th className="py-3.5 px-4">Key Module Access</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                      <span>Loading team directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No team members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.project_manager;
                  const isSelf = currentUser?.userId === u.id || currentUser?.email?.toLowerCase() === u.email.toLowerCase();

                  return (
                    <tr key={u.id} className="hover:bg-[#18181b]/40 transition-colors">
                      {/* Member Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#f4f4f5]">{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-400 block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${roleCfg.badgeColor}`}>
                          {roleCfg.label}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-xs text-zinc-300">
                        {u.department || '—'}
                      </td>

                      {/* Key Permissions Summary */}
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <span>🛡️</span> All 9 Modules (Full Admin)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {Object.entries(u.permissions || {}).map(([mod, lvl]) => {
                              if (lvl === 'none') return null;
                              return (
                                <span
                                  key={mod}
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                                    lvl === 'admin'
                                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                                      : lvl === 'edit'
                                      ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                                      : 'bg-blue-950/40 text-blue-300 border-blue-800/40'
                                  }`}
                                  title={`${MODULE_LABELS[mod as keyof ModulePermissions]?.title}: ${lvl}`}
                                >
                                  {mod.slice(0, 4)}:{lvl.charAt(0).toUpperCase()}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                            u.is_active
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
                          } ${isSelf ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                          title={isSelf ? 'Cannot deactivate yourself' : 'Click to toggle status'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                          <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[#f4f4f5] border border-[#27272a] transition-colors"
                            title="Edit user details and custom permissions"
                          >
                            Edit
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/40 transition-colors"
                              title="Delete user"
                            >
                              ✕
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

      {/* Edit / Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#f4f4f5]">
                  {editingUser ? `Edit Team Member — ${editingUser.name}` : 'Add New Team Member'}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure role assignment, personal details, and granular permissions.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-[#27272a] px-5 bg-[#18181b]/40">
              <button
                type="button"
                onClick={() => setActiveModalTab('info')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
                  activeModalTab === 'info'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                👤 1. Account Details & Role
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('permissions')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
                  activeModalTab === 'permissions'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🛡️ 2. Granular Permissions Matrix
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
                  ⚠️ {modalError}
                </div>
              )}

              {activeModalTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={modalFormData.name}
                        onChange={(e) => setModalFormData({ ...modalFormData, name: e.target.value })}
                        required
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-sm text-[#f4f4f5] focus:ring-2 focus:ring-orange-500/50 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={modalFormData.email}
                        onChange={(e) => setModalFormData({ ...modalFormData, email: e.target.value })}
                        required
                        placeholder="sjenkins@btxconstruction.com"
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-sm text-[#f4f4f5] focus:ring-2 focus:ring-orange-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        Department / Trade
                      </label>
                      <input
                        type="text"
                        value={modalFormData.department}
                        onChange={(e) => setModalFormData({ ...modalFormData, department: e.target.value })}
                        placeholder="e.g. Electrical, Project Management"
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-sm text-[#f4f4f5] focus:ring-2 focus:ring-orange-500/50 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        {editingUser ? 'Reset Password (Leave blank to keep current)' : 'Password (Default: 123123)'}
                      </label>
                      <input
                        type="password"
                        value={modalFormData.password}
                        onChange={(e) => setModalFormData({ ...modalFormData, password: e.target.value })}
                        placeholder={editingUser ? '••••••••' : '123123'}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2 text-sm text-[#f4f4f5] focus:ring-2 focus:ring-orange-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Role Assignment Card Selection */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      Select Primary Role
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.entries(ROLE_CONFIG).map(([roleKey, roleVal]) => {
                        const isSelected = modalFormData.role === roleKey;
                        return (
                          <div
                            key={roleKey}
                            onClick={() => handleRoleChangeInModal(roleKey as UserRole)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-orange-950/30 border-orange-500/80 ring-1 ring-orange-500/40'
                                : 'bg-[#18181b]/60 border-[#27272a] hover:bg-[#202025]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-[#f4f4f5]">{roleVal.label}</span>
                              {isSelected && <span className="text-xs text-orange-400 font-bold">✓ Selected</span>}
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-tight">
                              {roleVal.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-[#18181b]/60 border border-[#27272a]">
                    <div>
                      <span className="text-sm font-semibold text-[#f4f4f5] block">Account Status</span>
                      <span className="text-xs text-zinc-400">Allow this user to sign into ConsEstimate</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalFormData.is_active}
                        onChange={(e) => setModalFormData({ ...modalFormData, is_active: e.target.checked })}
                        className="rounded bg-[#09090b] border-[#27272a] text-orange-500 focus:ring-orange-500/20 w-4 h-4"
                      />
                      <span className={`text-xs font-bold ${modalFormData.is_active ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {modalFormData.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {activeModalTab === 'permissions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#18181b]/60 p-3 rounded-xl border border-[#27272a]">
                    <div>
                      <p className="text-xs text-zinc-300">
                        Current Role Preset: <strong className="text-orange-400">{ROLE_CONFIG[modalFormData.role]?.label}</strong>
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Customize access levels per module. Custom settings persist even if roles differ.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPermissionsToRoleDefaults}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#27272a] hover:bg-zinc-700 text-[#f4f4f5] transition-colors"
                    >
                      ↺ Reset to Role Defaults
                    </button>
                  </div>

                  {/* Matrix List */}
                  <div className="space-y-2.5">
                    {Object.entries(MODULE_LABELS).map(([modKey, modInfo]) => {
                      const currentLevel = (modalFormData.permissions?.[modKey as keyof ModulePermissions] || 'none') as PermissionLevel;
                      const isUserMgmt = modKey === 'user_management';

                      return (
                        <div
                          key={modKey}
                          className="bg-[#18181b]/50 border border-[#27272a] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-xl">{modInfo.icon}</span>
                            <div>
                              <span className="text-sm font-bold text-[#f4f4f5] block">{modInfo.title}</span>
                              <span className="text-[11px] text-zinc-400 block">{modInfo.desc}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 self-end sm:self-center">
                            {(['none', 'view', ...(isUserMgmt ? [] : ['edit']), 'admin'] as PermissionLevel[]).map((lvl) => {
                              const isSelected = currentLevel === lvl;
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => handlePermissionChange(modKey as keyof ModulePermissions, lvl)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                    isSelected
                                      ? `${PERMISSION_LEVEL_CONFIG[lvl].color} shadow-sm ring-1 ring-white/10`
                                      : 'bg-[#09090b] text-zinc-400 border-zinc-800 hover:text-zinc-200'
                                  }`}
                                >
                                  {PERMISSION_LEVEL_CONFIG[lvl].label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-[#27272a] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-300 border border-[#27272a] transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingUser ? 'Save Changes' : 'Create Team Member'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
