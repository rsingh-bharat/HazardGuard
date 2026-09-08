export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LLMConfig {
  provider: 'openrouter' | 'groq' | 'offline_deterministic';
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  reply: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export class LLMProviderUnavailableError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code = 'LLM_PROVIDER_UNAVAILABLE', status = 503) {
    super(message);
    this.name = 'LLMProviderUnavailableError';
    this.code = code;
    this.status = status;
  }
}

export interface ILLMProvider {
  readonly providerName: string;
  chat(messages: ChatMessage[]): Promise<LLMResponse>;
}
