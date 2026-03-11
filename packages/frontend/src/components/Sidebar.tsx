import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Edit3, Check, X, BarChart3, Settings, Shield, LogOut } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import ThemeToggle from './ThemeToggle';

export type Page = 'chat' | 'analytics' | 'settings' | 'admin';

interface Props {
  dark: boolean;
  onToggleTheme: () => void;
  onNavigate: (page: Page) => void;
  currentPage: string;
}

export default function Sidebar({ dark, onToggleTheme, onNavigate, currentPage }: Props) {
  const { conversations, activeConversationId, setActiveConversation, setMessages, setConversations, removeConversation } = useChatStore();
  const { user, logout } = useAuthStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleNew = async () => {
    try {
      const conv = await api.createConversation();
      setConversations([conv, ...conversations]);
      setActiveConversation(conv.id);
      setMessages([]);
      onNavigate('chat');
    } catch (err: any) {
      alert(err.message || 'Failed to create conversation');
    }
  };

  const handleSelect = async (id: string) => {
    setActiveConversation(id);
    const msgs = await api.getMessages(id);
    setMessages(msgs);
    onNavigate('chat');
  };

  const handleDelete = async (id: string) => {
    await api.deleteConversation(id);
    removeConversation(id);
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    await api.updateConversation(id, { title: editTitle.trim() });
    useChatStore.getState().updateConversationTitle(id, editTitle.trim());
    setEditingId(null);
  };

  const tierColors: Record<string, string> = { free: 'bg-gray-600', pro: 'bg-blue-600', enterprise: 'bg-purple-600' };

  return (
    <div className="w-72 bg-gray-900 dark:bg-gray-950 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold mb-3">AI Chat</h1>
        <button onClick={handleNew}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Chat
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((conv) => (
          <div key={conv.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              activeConversationId === conv.id && currentPage === 'chat' ? 'bg-gray-700' : 'hover:bg-gray-800'
            }`}
            onClick={() => handleSelect(conv.id)}>
            <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {editingId === conv.id ? (
              <div className="flex-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(conv.id)}
                  className="flex-1 bg-gray-800 px-2 py-0.5 rounded text-sm" autoFocus />
                <button onClick={() => handleRename(conv.id)} className="p-0.5"><Check className="w-3.5 h-3.5 text-green-400" /></button>
                <button onClick={() => setEditingId(null)} className="p-0.5"><X className="w-3.5 h-3.5 text-gray-400" /></button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm truncate text-gray-200">{conv.title}</span>
                <div className="hidden group-hover:flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setEditingId(conv.id); setEditTitle(conv.title); }} className="p-0.5 hover:text-blue-400">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(conv.id)} className="p-0.5 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Nav */}
      <div className="p-2 border-t border-gray-800 space-y-1">
        {[
          { page: 'analytics' as Page, icon: BarChart3, label: 'Analytics' },
          { page: 'settings' as Page, icon: Settings, label: 'Settings & API' },
          ...(user?.role === 'admin' ? [{ page: 'admin' as Page, icon: Shield, label: 'Admin' }] : []),
        ].map(item => (
          <button key={item.page} onClick={() => onNavigate(item.page)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === item.page ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}>
            <item.icon className="w-4 h-4" /> {item.label}
          </button>
        ))}
      </div>

      {/* User */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${tierColors[user?.tier || 'free']}`}>
                {user?.tier}
              </span>
            </div>
          </div>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
          <button onClick={logout} className="p-1.5 hover:bg-gray-800 rounded-lg" title="Logout">
            <LogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
