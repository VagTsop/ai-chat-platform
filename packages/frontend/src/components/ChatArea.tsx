import { useRef, useEffect, useState } from 'react';
import { Download, Sparkles, Paperclip, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { api } from '../api/client';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ModelSelector from './ModelSelector';
import SystemPromptPicker from './SystemPromptPicker';
import DocumentPanel from './DocumentPanel';

export default function ChatArea() {
  const { messages, activeConversationId, conversations, isStreaming, setStreaming, addMessage, appendToLastMessage, updateLastMessageUsage, sidebarOpen, toggleSidebar } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!activeConversationId) return;
    setStreaming(true);

    // Add user message optimistically
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    });

    // Add placeholder for assistant
    addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    });

    await api.streamChat(
      activeConversationId,
      content,
      (text) => appendToLastMessage(text),
      (usage) => {
        updateLastMessageUsage(usage);
        setStreaming(false);
        // Refresh conversations to get updated title
        api.getConversations().then(useChatStore.getState().setConversations);
      },
      (error) => {
        appendToLastMessage(`\n\n*Error: ${error}*`);
        setStreaming(false);
      }
    );
  };

  const handleModelChange = async (model: string) => {
    if (!activeConversationId) return;
    await api.updateConversation(activeConversationId, { model });
    useChatStore.getState().setConversations(
      conversations.map((c) => (c.id === activeConversationId ? { ...c, model } : c))
    );
  };

  const handlePromptSelect = async (prompt: string | null) => {
    if (!activeConversationId) return;
    await api.updateConversation(activeConversationId, { system_prompt: prompt || '' });
  };

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-2 mb-2">
          {!sidebarOpen && (
            <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg absolute top-4 left-4">
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="text-6xl mb-4">🤖</div>
        <h2 className="text-xl font-semibold mb-2">AI Chat Platform</h2>
        <p className="text-sm">Create a new chat or select an existing one to get started</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button onClick={toggleSidebar} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}
          {sidebarOpen && (
            <button onClick={toggleSidebar} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}
          <h3 className="font-medium truncate max-w-xs">{activeConv?.title || 'Chat'}</h3>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector value={activeConv?.model || 'claude-sonnet-4-20250514'} onChange={handleModelChange} disabled={isStreaming} />
          <button
            onClick={() => setPromptOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="System Prompt"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
          </button>
          <button
            onClick={() => setDocsOpen(!docsOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Documents"
          >
            <Paperclip className="w-4 h-4 text-gray-500" />
          </button>
          <a
            href={api.exportConversation(activeConversationId)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Export as Markdown"
          >
            <Download className="w-4 h-4 text-gray-500" />
          </a>
        </div>
      </div>

      {/* Documents Panel */}
      <DocumentPanel conversationId={activeConversationId} isOpen={docsOpen} onToggle={() => setDocsOpen(false)} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 chat-scroll">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">💬</div>
              <p>Send a message to start the conversation</p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              model={msg.model}
              input_tokens={msg.input_tokens}
              output_tokens={msg.output_tokens}
            />
          ))}
          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex gap-1 ml-11 mb-4">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />

      {/* System Prompt Modal */}
      <SystemPromptPicker
        isOpen={promptOpen}
        onClose={() => setPromptOpen(false)}
        onSelect={handlePromptSelect}
        currentPrompt={activeConv?.system_prompt || null}
      />
    </div>
  );
}
