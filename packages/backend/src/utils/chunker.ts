const CHUNK_SIZE = 1500; // chars (~375 tokens)
const OVERLAP = 200;

export function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap from end of previous chunk
      current = current.slice(-OVERLAP) + '\n\n' + trimmed;
    } else {
      current += (current ? '\n\n' : '') + trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  // If no paragraph breaks, split by sentences
  if (chunks.length === 0 && text.trim().length > 0) {
    let remaining = text.trim();
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, CHUNK_SIZE));
      remaining = remaining.slice(CHUNK_SIZE - OVERLAP);
    }
  }

  return chunks;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
