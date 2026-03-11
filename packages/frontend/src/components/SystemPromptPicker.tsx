import { useState, useEffect } from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import { api } from '../api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: string | null) => void;
  currentPrompt: string | null;
}

export default function SystemPromptPicker({ isOpen, onClose, onSelect, currentPrompt }: Props) {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [customName, setCustomName] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (isOpen) api.getPrompts().then(setPrompts).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCustom = async () => {
    if (!customName.trim() || !customContent.trim()) return;
    await api.createPrompt(customName.trim(), customContent.trim());
    const updated = await api.getPrompts();
    setPrompts(updated);
    setCustomName('');
    setCustomContent('');
    setShowCustom(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">System Prompt</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
          {/* None option */}
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              !currentPrompt ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="font-medium text-sm">No system prompt</div>
            <div className="text-xs text-gray-500 mt-0.5">Default Claude behavior</div>
          </button>

          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.content); onClose(); }}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                currentPrompt === p.content ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{p.name}</span>
                {p.is_default ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">preset</span>
                ) : null}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.content}</div>
            </button>
          ))}

          {/* Add custom */}
          {showCustom ? (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Prompt name..."
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
              />
              <textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="System prompt content..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCustom(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={handleSaveCustom} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 justify-center"
            >
              <Plus className="w-4 h-4" /> Add Custom Prompt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
