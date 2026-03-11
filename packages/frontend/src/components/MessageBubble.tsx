import { User, Bot } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
}

export default function MessageBubble({ role, content, model, input_tokens, output_tokens }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} mb-4`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-blue-600' : 'bg-purple-600'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-sm'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm">{content}</p>
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>
        {!isUser && (input_tokens || output_tokens) ? (
          <div className="flex gap-3 mt-1 px-2 text-xs text-gray-400">
            {model && <span>{model.split('-').slice(0, 2).join(' ')}</span>}
            {input_tokens ? <span>{input_tokens} in</span> : null}
            {output_tokens ? <span>{output_tokens} out</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
