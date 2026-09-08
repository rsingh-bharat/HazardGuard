import { ChatMessage, ILLMProvider, LLMConfig, LLMResponse, LLMProviderUnavailableError } from './provider';

/**
 * Server-Side OpenRouter LLM Provider.
 * Communicates with OpenRouter API.
 * Invariant: Never fabricates canned fallback responses when the service is unreachable.
 */
export class OpenRouterLLMProvider implements ILLMProvider {
  readonly providerName = 'openrouter';
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: { apiKey: string; model?: string; temperature?: number; maxTokens?: number }) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new LLMProviderUnavailableError('OPENROUTER_API_KEY is not configured or empty.');
    }
    this.apiKey = config.apiKey.trim();
    this.model = config.model || 'meta-llama/llama-3.3-70b-instruct';
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 1024;
  }

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://hazardguard.in',
          'X-Title': 'HazardGuard SIH26080 Disaster Intelligence',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new LLMProviderUnavailableError(
          `OpenRouter upstream returned error HTTP ${response.status}: ${errText}`,
          'OPENROUTER_API_ERROR',
          response.status >= 500 ? 502 : response.status
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new LLMProviderUnavailableError(
          'OpenRouter response did not contain valid text choices.',
          'OPENROUTER_EMPTY_RESPONSE'
        );
      }

      return {
        reply: content.trim(),
        model: data.model || this.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
        },
      };
    } catch (err: unknown) {
      if (err instanceof LLMProviderUnavailableError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new LLMProviderUnavailableError(
        `OpenRouter service unreachable: ${msg}`,
        'OPENROUTER_NETWORK_ERROR'
      );
    }
  }
}

/**
 * Server-Side Groq LLM Provider.
 */
export class GroqLLMProvider implements ILLMProvider {
  readonly providerName = 'groq';
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: { apiKey: string; model?: string; temperature?: number; maxTokens?: number }) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new LLMProviderUnavailableError('GROQ_API_KEY is not configured or empty.');
    }
    this.apiKey = config.apiKey.trim();
    this.model = config.model || 'groq/compound';
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 1024;
  }

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new LLMProviderUnavailableError(
          `Groq upstream returned error HTTP ${response.status}: ${errText}`,
          'GROQ_API_ERROR',
          response.status >= 500 ? 502 : response.status
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new LLMProviderUnavailableError(
          'Groq response did not contain valid text choices.',
          'GROQ_EMPTY_RESPONSE'
        );
      }

      return {
        reply: content.trim(),
        model: data.model || this.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
        },
      };
    } catch (err: unknown) {
      if (err instanceof LLMProviderUnavailableError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new LLMProviderUnavailableError(
        `Groq service unreachable: ${msg}`,
        'GROQ_NETWORK_ERROR'
      );
    }
  }
}

/**
 * Deterministic Test/Offline Provider.
 * Strictly adheres to all scientific invariants without fabricating numbers.
 */
export class OfflineDeterministicLLMProvider implements ILLMProvider {
  readonly providerName = 'offline_deterministic';

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    // Check system prompt and user query to produce deterministic, verified answers
    const sysMsg = messages.find((m) => m.role === 'system')?.content || '';
    const userMsg = messages.find((m) => m.role === 'user')?.content || '';

    // Extract runtime variables embedded in system prompt to construct factual explanation
    const rainfallMatch = sysMsg.match(/Authoritative Forecast Rainfall:\s*([\d.]+)\s*mm/);
    const rainfall = rainfallMatch ? rainfallMatch[1] : 'UNAVAILABLE';

    const probMatch = sysMsg.match(/Event Exceedance Probability \(>= 15\.6 mm\):\s*([^\n]+)/);
    const probStr = probMatch ? probMatch[1].trim() : 'UNAVAILABLE';

    const providerMatch = sysMsg.match(/Provider Source:\s*([^\n]+)/);
    const provider = providerMatch ? providerMatch[1].trim() : 'UNKNOWN';

    const customMatch = sysMsg.match(/Is Custom Scenario:\s*(true|false)/);
    const isCustom = customMatch ? customMatch[1] === 'true' : false;

    const customRainfallMatch = sysMsg.match(/Scenario Rainfall Load:\s*([\d.]+)\s*mm/);
    const customRainfall = customRainfallMatch ? customRainfallMatch[1] : null;

    let text = `[HazardGuard Deterministic Explanation]\n`;
    text += `Forecast rainfall is ${rainfall} mm based on ${provider}.\n`;

    if (probStr.includes('UNAVAILABLE') || probStr.includes('null')) {
      text += `Rainfall exceedance probability is UNAVAILABLE.\n`;
    } else {
      text += `Rainfall exceedance probability (>= 15.6 mm) is ${probStr} (UNCALIBRATED_RAW_ENSEMBLE).\n`;
    }

    if (provider.includes('weathernext') || provider === 'weathernext3_statistics') {
      text += `For WeatherNext, the accumulated rainfall represents the sum of hourly means over the window.\n`;
    }

    text += `Flood consequence modeling is UNKNOWN / MODEL_UNAVAILABLE. Infrastructure and population exposure is DATA_UNAVAILABLE.\n`;

    if (isCustom && customRainfall) {
      text += `This hydraulic simulation reflects a hypothetical user CUSTOM scenario with ${customRainfall} mm load; authoritative forecast rainfall remains ${rainfall} mm.\n`;
    }

    text += `Comparison scenarios LOW, BASE, and HIGH represent deterministic sensitivity stress tests and are NOT statistical quantiles (P10/P50/P90).\n`;

    return {
      reply: text.trim(),
      model: 'deterministic-scientific-rules-engine'
    };
  }
}

/**
 * Fallback Unconfigured Provider that strictly throws an explicit unavailable error.
 * Does NOT generate fake advice or hallucinated responses.
 */
class UnconfiguredLLMProvider implements ILLMProvider {
  readonly providerName = 'unconfigured';

  async chat(): Promise<LLMResponse> {
    throw new LLMProviderUnavailableError(
      'LLM provider is not configured. Please supply OPENROUTER_API_KEY in .env.local.',
      'LLM_PROVIDER_NOT_CONFIGURED',
      503
    );
  }
}

/**
 * Returns the active configured LLM provider adhering to server-side only constraints.
 */
export function getActiveLLMProvider(): ILLMProvider {
  // If explicitly requested offline/deterministic mode
  if (process.env.HAZARDGUARD_OFFLINE_LLM === 'true') {
    return new OfflineDeterministicLLMProvider();
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey.trim().length > 0) {
    return new OpenRouterLLMProvider({
      apiKey: openrouterKey,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey.trim().length > 0) {
    return new GroqLLMProvider({
      apiKey: groqKey,
      model: process.env.GROQ_MODEL || 'groq/compound',
    });
  }

  // Fails closed with explicit unavailable error on invocation
  return new UnconfiguredLLMProvider();
}
