import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  sidebarOpen: boolean;

  setConversations: (convs: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  appendToLastMessage: (text: string) => void;
  updateLastMessageUsage: (usage: { input_tokens: number; output_tokens: number }) => void;
  setStreaming: (v: boolean) => void;
  toggleSidebar: () => void;
  updateConversationTitle: (id: string, title: string) => void;
  removeConversation: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  sidebarOpen: true,

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  setMessages: (messages) => set({ messages }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  appendToLastMessage: (text) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + text };
      }
      return { messages: msgs };
    }),

  updateLastMessageUsage: (usage) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...usage };
      }
      return { messages: msgs };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  updateConversationTitle: (id, title) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    })),

  removeConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      ...(s.activeConversationId === id ? { activeConversationId: null, messages: [] } : {}),
    })),
}));
