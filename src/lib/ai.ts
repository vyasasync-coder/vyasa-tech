export type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AIProvider = 'anthropic' | 'openai' | 'openrouter';

const LS_KEYS = {
  ANTHROPIC: 'vyasa_key_anthropic',
  OPENAI: 'vyasa_key_openai',
  OPENROUTER: 'vyasa_key_openrouter',
};

export function getStoredKey(provider: AIProvider): string {
  const map: Record<AIProvider, string> = {
    anthropic: localStorage.getItem(LS_KEYS.ANTHROPIC) || '',
    openai: localStorage.getItem(LS_KEYS.OPENAI) || '',
    openrouter: localStorage.getItem(LS_KEYS.OPENROUTER) || '',
  };
  return map[provider];
}

export function detectProvider(): AIProvider {
  if (localStorage.getItem(LS_KEYS.ANTHROPIC)) return 'anthropic';
  if (localStorage.getItem(LS_KEYS.OPENROUTER)) return 'openrouter';
  if (localStorage.getItem(LS_KEYS.OPENAI)) return 'openai';
  return 'anthropic';
}

// ── Anthropic ─────────────────────────────────────────────────────────────
async function callAnthropic(
  messages: AIMessage[],
  systemPrompt: string,
  apiKey: string,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `Anthropic error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]' || !data) continue;
      try {
        const json = JSON.parse(data);
        const text = json?.delta?.text || '';
        if (text) onChunk(text);
      } catch {}
    }
  }
}

// ── OpenAI / OpenRouter ───────────────────────────────────────────────────
async function callOpenAI(
  messages: AIMessage[],
  systemPrompt: string,
  apiKey: string,
  baseURL: string,
  model: string,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `API error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]' || !data) continue;
      try {
        const json = JSON.parse(data);
        const text = json?.choices?.[0]?.delta?.content || '';
        if (text) onChunk(text);
      } catch {}
    }
  }
}

// ── Unified call ──────────────────────────────────────────────────────────
export async function streamAI(
  messages: AIMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void
): Promise<void> {
  const provider = detectProvider();
  const key = getStoredKey(provider);

  if (!key) throw new Error('Nenhuma API key configurada. Vá em Configurações e adicione sua chave.');

  if (provider === 'anthropic') {
    return callAnthropic(messages, systemPrompt, key, onChunk);
  } else if (provider === 'openrouter') {
    return callOpenAI(messages, systemPrompt, key, 'https://openrouter.ai/api/v1', 'anthropic/claude-sonnet-4-6', onChunk);
  } else {
    return callOpenAI(messages, systemPrompt, key, 'https://api.openai.com/v1', 'gpt-4o', onChunk);
  }
}

// ── File write parser ─────────────────────────────────────────────────────
export type FileWrite = { path: string; content: string };

export function parseFileWrites(text: string): FileWrite[] {
  const writes: FileWrite[] = [];
  const regex = /<write_file path="([^"]+)">([\s\S]*?)<\/write_file>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    writes.push({ path: match[1], content: match[2].trim() });
  }
  return writes;
}

export function stripFileWrites(text: string): string {
  return text.replace(/<write_file path="[^"]+">[\s\S]*?<\/write_file>/g, '').trim();
}
