export type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AIProvider = 'groq' | 'openrouter';

// ── Catálogo de modelos ──────────────────────────────────────────────────────
export interface ModelOption {
  id: string;
  label: string;
  provider: AIProvider;
  model: string;
  free: boolean;
}

export const MODEL_CATALOG: ModelOption[] = [
  // ── Groq (free) ──
  { id: 'groq-llama3-70b', label: 'Llama 3.3 70B', provider: 'groq', model: 'llama-3.3-70b-versatile', free: true },
  { id: 'groq-llama3-8b', label: 'Llama 3.1 8B', provider: 'groq', model: 'llama-3.1-8b-instant', free: true },
  { id: 'groq-gemma2', label: 'Gemma 2 9B', provider: 'groq', model: 'gemma2-9b-it', free: true },
  { id: 'groq-mixtral', label: 'Mixtral 8x7B', provider: 'groq', model: 'mixtral-8x7b-32768', free: true },
  { id: 'groq-qwen', label: 'Qwen QwQ 32B', provider: 'groq', model: 'qwen-qwq-32b', free: true },

  // ── OpenRouter (free) ──
  { id: 'or-llama3-free', label: 'Llama 3.1 8B', provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free', free: true },
  { id: 'or-gemma-free', label: 'Gemma 2 9B', provider: 'openrouter', model: 'google/gemma-2-9b-it:free', free: true },
  { id: 'or-mistral-free', label: 'Mistral 7B', provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free', free: true },
  { id: 'or-qwen-free', label: 'Qwen 2.5 72B', provider: 'openrouter', model: 'qwen/qwen-2.5-72b-instruct:free', free: true },
  { id: 'or-deepseek-free', label: 'DeepSeek V3', provider: 'openrouter', model: 'deepseek/deepseek-chat:free', free: true },
  { id: 'or-deepseek-r1', label: 'DeepSeek R1', provider: 'openrouter', model: 'deepseek/deepseek-r1:free', free: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getAvailableModels(): ModelOption[] {
  return MODEL_CATALOG.filter((m) => !!getStoredKey(m.provider));
}

export function getDefaultModel(): ModelOption | null {
  const available = getAvailableModels();
  if (available.length === 0) return null;
  // Prioridade: DeepSeek V3 > Qwen 72B > qualquer OpenRouter > Groq
  return (
    available.find((m) => m.id === 'or-deepseek-free') ||
    available.find((m) => m.id === 'or-qwen-free') ||
    available.find((m) => m.provider === 'openrouter') ||
    available.find((m) => m.provider === 'groq') ||
    available[0]
  );
}

// ── Storage ──────────────────────────────────────────────────────────────────
const LS_KEYS: Record<AIProvider, string> = {
  groq: 'vyasa_key_groq',
  openrouter: 'vyasa_key_openrouter',
};

export function getStoredKey(provider: AIProvider): string {
  return localStorage.getItem(LS_KEYS[provider]) || '';
}

// ── Provider endpoints ───────────────────────────────────────────────────────
const PROVIDER_BASE_URL: Record<AIProvider, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

// ── OpenAI-compatible (Groq, OpenRouter) ─────────────────────────────────
async function callOpenAICompat(
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
  onChunk: (text: string) => void,
  selectedModel?: ModelOption | null
): Promise<void> {
  const modelOpt = selectedModel || getDefaultModel();

  if (!modelOpt) {
    throw new Error('Nenhuma API key configurada. Vá em Configurações e adicione sua chave Groq ou OpenRouter (ambas gratuitas).');
  }

  const key = getStoredKey(modelOpt.provider);
  if (!key) {
    throw new Error(`API key não encontrada para ${modelOpt.provider}. Configure em Configurações.`);
  }

  const baseURL = PROVIDER_BASE_URL[modelOpt.provider];
  return callOpenAICompat(messages, systemPrompt, key, baseURL, modelOpt.model, onChunk);
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
