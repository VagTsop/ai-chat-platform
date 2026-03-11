import { useState, useEffect } from 'react';
import { BarChart3, Zap, DollarSign, MessageSquare, Hash } from 'lucide-react';
import { api } from '../api/client';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);

  useEffect(() => {
    api.getUsageSummary().then(setSummary);
    api.getDailyUsage(30).then(setUsage);
    api.getCostsByModel(30).then(setCosts);
  }, []);

  const stats = [
    { label: 'Conversations', value: summary?.conversationCount || 0, icon: MessageSquare, color: 'text-blue-500' },
    { label: 'Messages', value: summary?.messageCount || 0, icon: Hash, color: 'text-purple-500' },
    { label: 'Total Tokens', value: ((summary?.totalInputTokens || 0) + (summary?.totalOutputTokens || 0)).toLocaleString(), icon: Zap, color: 'text-amber-500' },
    { label: 'Est. Cost', value: `$${(summary?.totalCostUsd || 0).toFixed(4)}`, icon: DollarSign, color: 'text-green-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Usage Analytics</h2>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-sm text-gray-500">{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Token Usage Chart */}
        {usage.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4">Token Usage (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={usage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="inputTokens" stackId="1" stroke="#3b82f6" fill="#93c5fd" name="Input Tokens" />
                <Area type="monotone" dataKey="outputTokens" stackId="1" stroke="#8b5cf6" fill="#c4b5fd" name="Output Tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost by Model */}
        {costs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4">Cost by Model</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={costs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="model" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split('-').slice(0, 2).join(' ')} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, 'Cost']} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {costs.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4">Model Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={costs} dataKey="cost" nameKey="model" cx="50%" cy="50%" outerRadius={90} label={(e) => e.model?.split('-').slice(0, 2).join(' ')}>
                    {costs.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, 'Cost']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!usage.length && !costs.length && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📊</div>
            <p>No usage data yet. Start chatting to see analytics!</p>
          </div>
        )}
      </div>
    </div>
  );
}
