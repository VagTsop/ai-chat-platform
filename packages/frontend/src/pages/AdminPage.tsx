import { useState, useEffect } from 'react';
import { Users, BarChart3, Zap, DollarSign, Shield, Trash2, Crown } from 'lucide-react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
const TIER_COLORS: Record<string, string> = { free: 'bg-gray-100 text-gray-700', pro: 'bg-blue-100 text-blue-700', enterprise: 'bg-purple-100 text-purple-700' };

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'users'>('overview');

  useEffect(() => {
    api.getAdminStats().then(setStats);
    api.getAdminUsers().then(setUsers);
  }, []);

  const handleTierChange = async (userId: string, tier: string) => {
    await api.updateAdminUser(userId, { tier });
    setUsers(users.map(u => u.id === userId ? { ...u, tier } : u));
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await api.updateAdminUser(userId, { role });
    setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user and all their data?')) return;
    await api.deleteAdminUser(userId);
    setUsers(users.filter(u => u.id !== userId));
  };

  const statCards = [
    { label: 'Total Users', value: stats?.users || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Conversations', value: stats?.conversations || 0, icon: BarChart3, color: 'text-purple-500' },
    { label: 'Messages', value: stats?.messages || 0, icon: Zap, color: 'text-amber-500' },
    { label: 'Total Cost', value: `$${(stats?.totalCost || 0).toFixed(4)}`, icon: DollarSign, color: 'text-green-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-500" />
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['overview', 'users'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-sm text-gray-500">{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        {tab === 'overview' && stats && (
          <>
            {/* Tier Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4">User Tier Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={stats.tierDist || []} dataKey="count" nameKey="tier" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.tier} (${e.count})`}>
                      {(stats.tierDist || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4">Model Usage</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.modelUsage || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.split('-').slice(0, 2).join(' ')} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} name="API Calls" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Usage */}
            {(stats.dailyUsage || []).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4">Daily Token Usage</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="tokens" stroke="#3b82f6" fill="#93c5fd" name="Tokens" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {tab === 'users' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Tier</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Conversations</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Messages</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Tokens</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Cost</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select value={u.tier} onChange={(e) => handleTierChange(u.id, e.target.value)}
                        className={`text-xs border rounded px-2 py-1 font-medium ${TIER_COLORS[u.tier] || ''}`}>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">{u.conversations}</td>
                    <td className="py-3 px-4">{u.messages}</td>
                    <td className="py-3 px-4">{(u.totalTokens || 0).toLocaleString()}</td>
                    <td className="py-3 px-4">${(u.totalCost || 0).toFixed(4)}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleDelete(u.id)} className="p-1 hover:text-red-500" title="Delete user">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
