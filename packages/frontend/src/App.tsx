import { useEffect, useState } from 'react';
import { useChatStore } from './stores/chatStore';
import { useAuthStore } from './stores/authStore';
import { useTheme } from './hooks/useTheme';
import { api } from './api/client';
import Sidebar, { type Page } from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { dark, toggle } = useTheme();
  const { token } = useAuthStore();
  const { setConversations, sidebarOpen } = useChatStore();
  const [page, setPage] = useState<Page>('chat');

  useEffect(() => {
    if (token) {
      api.getConversations().then(setConversations).catch(() => {});
    }
  }, [token, setConversations]);

  // Keyboard shortcut: Ctrl+N for new chat
  useEffect(() => {
    if (!token) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        api.createConversation().then((conv) => {
          const state = useChatStore.getState();
          state.setConversations([conv, ...state.conversations]);
          state.setActiveConversation(conv.id);
          state.setMessages([]);
          setPage('chat');
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [token]);

  if (!token) return <LoginPage />;

  const pageComponent = {
    chat: <ChatArea />,
    analytics: <AnalyticsPage />,
    admin: <AdminPage />,
    settings: <SettingsPage />,
  }[page] || <ChatArea />;

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <Sidebar dark={dark} onToggleTheme={toggle} onNavigate={setPage} currentPage={page} />
      )}
      {pageComponent}
    </div>
  );
}
