import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check, Zap, Crown, Code2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

const TIER_INFO: Record<string, { color: string; features: string[] }> = {
  free: { color: 'border-gray-300', features: ['100K tokens/month', '10 conversations', '3 documents', 'Haiku model only'] },
  pro: { color: 'border-blue-400', features: ['1M tokens/month', '100 conversations', '20 documents', 'Haiku + Sonnet models'] },
  enterprise: { color: 'border-purple-400', features: ['10M tokens/month', 'Unlimited conversations', 'Unlimited documents', 'All models (incl. Opus)'] },
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.getApiKeys().then(setApiKeys);
    api.getMe().then(setProfile);
  }, []);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    const result = await api.createApiKey(newKeyName.trim());
    setCreatedKey(result.key);
    setNewKeyName('');
    setApiKeys([result, ...apiKeys]);
  };

  const handleDeleteKey = async (id: string) => {
    await api.deleteApiKey(id);
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tier = user?.tier || 'free';
  const tierInfo = TIER_INFO[tier];
  const usagePercent = profile ? Math.min(100, (profile.monthlyUsage / profile.tierLimits?.monthlyTokens) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">Settings</h2>

        {/* Current Plan */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 ${tierInfo?.color} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold">Current Plan: <span className="capitalize">{tier}</span></h3>
            </div>
            {tier !== 'enterprise' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                Contact admin to upgrade
              </span>
            )}
          </div>

          {/* Usage bar */}
          {profile && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Monthly Usage</span>
                <span>{(profile.monthlyUsage || 0).toLocaleString()} / {(profile.tierLimits?.monthlyTokens || 0).toLocaleString()} tokens</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {tierInfo?.features.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Zap className="w-3.5 h-3.5 text-blue-500" /> {f}
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(TIER_INFO).map(([t, info]) => (
            <div key={t} className={`bg-white dark:bg-gray-800 rounded-xl border ${tier === t ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 dark:border-gray-700'} p-4`}>
              <h4 className="font-semibold capitalize mb-2">{t}</h4>
              <div className="text-2xl font-bold mb-3">{t === 'free' ? 'Free' : t === 'pro' ? '$29' : '$99'}<span className="text-sm text-gray-400 font-normal">/mo</span></div>
              <ul className="text-xs space-y-1 text-gray-500">
                {info.features.map(f => <li key={f}>- {f}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {/* API Keys */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold">API Keys</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Use API keys to access the chat API programmatically or embed the widget on your website.</p>

          {/* Create new key */}
          <div className="flex gap-2 mb-4">
            <input
              value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
              placeholder="Key name (e.g., 'My Website')"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700"
            />
            <button onClick={handleCreateKey} disabled={!newKeyName.trim()}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              <Plus className="w-4 h-4" /> Create
            </button>
          </div>

          {/* Newly created key */}
          {createdKey && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Key created! Copy it now - you won't see it again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white dark:bg-gray-800 px-3 py-2 rounded border font-mono break-all">{createdKey}</code>
                <button onClick={copyKey} className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Key list */}
          <div className="space-y-2">
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Key className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{k.name}</div>
                  <div className="text-xs text-gray-400">{k.key_prefix} | Created: {new Date(k.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => handleDeleteKey(k.id)} className="p-1 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {apiKeys.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No API keys yet</p>}
          </div>
        </div>

        {/* Widget Embed Code */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-5 h-5 text-teal-500" />
            <h3 className="text-lg font-semibold">Embeddable Widget</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">Add an AI chat widget to any website with this snippet:</p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`<script>
  window.AIChatConfig = {
    apiKey: 'YOUR_API_KEY_HERE',
    baseUrl: '${window.location.origin}',
    theme: 'light',
    title: 'AI Assistant'
  };
</script>
<script src="${window.location.origin}/api/widget/embed.js"></script>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
