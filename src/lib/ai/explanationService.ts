import { ScientificContext } from '../contracts/scientificContext';
import { buildScientificContext } from './scientificContext';
import { retrieveRelevantKnowledge, RetrievedDocument } from './knowledgeRetriever';
import { buildExplanationContext } from './contextBuilder';
import { SCIENTIFIC_EXPLANATION_SYSTEM_PROMPT } from './prompts';
import { getActiveLLMProvider } from './openrouter';
import { ChatMessage, ILLMProvider, LLMProviderUnavailableError } from './provider';

export interface ExplanationServiceRequest {
  query: string;
  scientificContext?: ScientificContext;
  authoritativeState?: any;
  forecastSnapshot?: any;
  probabilityData?: any;
  verificationData?: any;
  hazardState?: any;
  districtId?: string;
  history?: ChatMessage[];
  providerOverride?: ILLMProvider;
}

export interface ExplanationServiceSuccessResult {
  success: true;
  explanation: string;
  structured_data_status: 'COMPLETE' | 'PARTIAL';
  provenance: {
    snapshot_id: string;
    provider: string;
    model_id: string;
    model_status: string;
    initialization_time: string | null;
    valid_time: string | null;
    issue_time: string | null;
    verification_status: 'VERIFIED' | 'NOT_VALIDATED';
    calibration_status: string;
    data_sources: string[];
  };
  retrieved_references: Array<{
    id: string;
    title: string;
    category: string;
    source_file: string;
    relevance_score: number;
  }>;
  hazards_summary: {
    meteorological_intensity: string;
    flood_risk: string;
    road_risk: string;
    infrastructure_risk: string;
    population_risk: string;
  };
  timestamp: string;
  llm_model?: string;
}

export interface ExplanationServiceErrorResult {
  success: false;
  status: 'DATA_UNAVAILABLE' | 'LLM_UNAVAILABLE' | 'ERROR';
  error: string;
  details?: string;
  provenance?: Partial<ExplanationServiceSuccessResult['provenance']>;
  timestamp: string;
}

export type ExplanationServiceResult = ExplanationServiceSuccessResult | ExplanationServiceErrorResult;

/**
 * Unified server-side explanation service for both /api/explain and /api/chat.
 * Adheres strictly to the architectural pipeline:
 * Structured Application State -> ScientificContext -> Obsidian Retrieval -> OpenRouter -> ExplanationResponse
 */
export async function generateExplanation(
  request: ExplanationServiceRequest
): Promise<ExplanationServiceResult> {
  const timestamp = new Date().toISOString();

  // 1. Resolve and Validate ScientificContext (Authoritative Runtime Ground Truth)
  let context: ScientificContext;
  try {
    if (request.scientificContext) {
      context = buildScientificContext({ directContext: request.scientificContext });
    } else if (request.authoritativeState) {
      context = buildScientificContext({
        impactResult: request.authoritativeState,
        districtId: request.districtId
      });
    } else if (request.forecastSnapshot) {
      context = buildScientificContext({
        forecastSnapshot: request.forecastSnapshot,
        probabilityData: request.probabilityData,
        verificationData: request.verificationData,
        hazardState: request.hazardState,
        districtId: request.districtId
      });
    } else {
      return {
        success: false,
        status: 'DATA_UNAVAILABLE',
        error: 'Missing runtime data: No authoritative forecast snapshot or scientific context provided.',
        timestamp
      };
    }
  } catch (ctxErr) {
    const msg = ctxErr instanceof Error ? ctxErr.message : String(ctxErr);
    return {
      success: false,
      status: 'DATA_UNAVAILABLE',
      error: `Failed to construct valid ScientificContext: ${msg}`,
      timestamp
    };
  }

  // 2. Retrieve Relevant Obsidian Notes
  let retrievedDocs: RetrievedDocument[] = [];
  try {
    retrievedDocs = retrieveRelevantKnowledge(request.query || 'general forecast interpretation', context, 3);
  } catch (ragErr) {
    console.warn('[ExplanationService] Knowledge retrieval warning:', ragErr);
    // Retrieval failure does NOT corrupt runtime truth; continues with empty references
    retrievedDocs = [];
  }

  // 3. Assemble Structured Prompt Context
  const structuredPrompt = buildExplanationContext(context, retrievedDocs);

  const sanitizedHistory = (request.history || [])
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({
      role: msg.role,
      content: msg.content
    }));

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SCIENTIFIC_EXPLANATION_SYSTEM_PROMPT}\n\n${structuredPrompt}`
    },
    ...sanitizedHistory,
    {
      role: 'user',
      content: request.query || 'Explain the current meteorological forecast and hazard implications.'
    }
  ];

  // 4. Invoke Server-Side Provider
  const provider = request.providerOverride || getActiveLLMProvider();

  try {
    const llmRes = await provider.chat(messages);

    // 5. Build Unified ExplanationResponse with Full Provenance Preservation
    return {
      success: true,
      explanation: llmRes.reply,
      structured_data_status: context.probability_available ? 'COMPLETE' : 'PARTIAL',
      provenance: {
        snapshot_id: context.snapshot_id,
        provider: context.provider,
        model_id: context.deployed_model_id,
        model_status: context.model_status,
        initialization_time: context.nwp_initialization_time ?? null,
        valid_time: context.nwp_valid_time ?? null,
        issue_time: context.issue_time ?? null,
        verification_status: context.verification_status,
        calibration_status: context.calibration_status,
        data_sources: context.data_sources
      },
      retrieved_references: retrievedDocs.map((d) => ({
        id: d.doc_id,
        title: d.title,
        category: d.category,
        source_file: d.source_file,
        relevance_score: d.relevance_score
      })),
      hazards_summary: {
        meteorological_intensity: context.meteorological_intensity,
        flood_risk: context.hazard_states.flood_risk.risk_level,
        road_risk: context.hazard_states.road_risk.risk_level,
        infrastructure_risk: context.hazard_states.infrastructure_risk.risk_level,
        population_risk: context.hazard_states.population_risk.risk_level
      },
      timestamp,
      llm_model: llmRes.model
    };
  } catch (llmErr) {
    const isUnavailable = llmErr instanceof LLMProviderUnavailableError;
    const msg = llmErr instanceof Error ? llmErr.message : String(llmErr);

    return {
      success: false,
      status: 'LLM_UNAVAILABLE',
      error: isUnavailable
        ? `LLM explanation service is unavailable: ${msg}`
        : `Explanation generation failed: ${msg}`,
      details: msg,
      provenance: {
        snapshot_id: context.snapshot_id,
        provider: context.provider,
        model_id: context.deployed_model_id,
        verification_status: context.verification_status
      },
      timestamp
    };
  }
}
