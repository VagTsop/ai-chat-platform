import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, X, Trash2 } from 'lucide-react';
import { api } from '../api/client';

interface Props {
  conversationId: string | null;
  isOpen: boolean;
  onToggle: () => void;
}

export default function DocumentPanel({ conversationId, isOpen, onToggle }: Props) {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversationId) {
      api.getDocuments(conversationId).then(setDocs).catch(() => {});
    }
  }, [conversationId]);

  const handleUpload = async (file: File) => {
    if (!conversationId) return;
    setUploading(true);
    try {
      await api.uploadDocument(file, conversationId);
      const updated = await api.getDocuments(conversationId);
      setDocs(updated);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    await api.deleteDocument(id);
    setDocs((d) => d.filter((doc) => doc.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="w-4 h-4 text-blue-500" />
          Documents ({docs.length})
        </div>
        <button onClick={onToggle} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".txt,.pdf,.md,.csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading || !conversationId}
        className="w-full p-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:bg-white dark:hover:bg-gray-700 flex items-center justify-center gap-2 disabled:opacity-50 mb-2"
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Uploading...' : 'Upload file (PDF, TXT, MD, CSV)'}
      </button>

      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg text-sm">
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="flex-1 truncate">{doc.original_name}</span>
          <span className="text-xs text-gray-400">{doc.chunk_count} chunks</span>
          <button onClick={() => handleDelete(doc.id)} className="p-1 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
