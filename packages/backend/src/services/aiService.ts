import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from '../config.js';
const client = new Anthropic({ apiKey: CONFIG.anthropicApiKey });

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: (usage: { input_tokens: number; output_tokens: number }) => void;
  onError: (error: string) => void;
}

export async function streamChat(
  model: string,
  systemPrompt: string | null,
  messages: { role: string; content: string }[],
  callbacks: StreamCallbacks
) {
  try {
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    stream.on('text', (text) => {
      callbacks.onDelta(text);
    });

    const finalMessage = await stream.finalMessage();
    callbacks.onDone({
      input_tokens: finalMessage.usage.input_tokens,
      output_tokens: finalMessage.usage.output_tokens,
    });
  } catch (err: any) {
    callbacks.onError(err.message || 'AI service error');
  }
}
