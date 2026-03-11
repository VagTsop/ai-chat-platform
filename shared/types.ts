export type Model = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514';

export interface Conversation {
  id: string;
  title: string;
  model: Model;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

export interface Document {
  id: string;
  conversation_id: string | null;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  chunk_count: number;
  uploaded_at: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
}

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  messageCount: number;
  conversationCount: number;
}

export interface StreamEvent {
  type: 'delta' | 'done' | 'error';
  content?: string;
  input_tokens?: number;
  output_tokens?: number;
  error?: string;
}

export const MODEL_PRICING: Record<Model, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
};

export const MODEL_NAMES: Record<Model, string> = {
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-opus-4-20250514': 'Claude Opus 4',
};
