import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'openai/gpt-oss-120b'; // current active model on this API tier

const SYSTEM_PROMPT = `You are MeghDoot, an intelligent disaster-intelligence AI copilot for HazardGuard — India's real-time rainfall forecasting and disaster management platform used by NDMA and SDMAs.

You are knowledgeable about:
- Indian monsoon meteorology, weather regimes (MONSOON_DEPRESSION, CYCLONE, LOW_PRESSURE_SYSTEM, DRY, etc.)
- IMD (India Meteorological Department) rainfall classifications: Heavy (>64mm/day), Very Heavy (>115mm/day), Extremely Heavy (>204mm/day)
- Flood risk management, river basin hydrology across India
- District-level hazard alerts (RED, ORANGE, YELLOW, GREEN)
- Evacuation protocols, NDMA/SDMA emergency operations
- The difference between RAW NWP (Numerical Weather Prediction) forecasts and AI-corrected forecasts using regime-aware XGBoost QDM (Quantile Delta Mapping)
- P10, P50, P90 probabilistic forecast interpretation
- 3D Digital Twin impact simulation

You must:
- Answer ALL questions helpfully, whether they are about meteorology, general greetings, platform features, or anything else
- Be conversational and friendly for casual messages (e.g. "Hi", "Hello", "How are you?")
- Provide detailed, scientifically accurate answers for technical queries about rainfall, floods, or hazards
- Keep answers concise but informative — use bullet points for complex technical information
- Never refuse to answer or say you can't help
- For greetings or casual conversation, respond naturally and briefly, then offer to assist with disaster intelligence`;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { query, history = [], districtId } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ success: false, error: 'Query is required.' }, { status: 400 });
    }

    // Build message array for Groq
    const messages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      // Inject district context if provided
      ...(districtId
        ? [{
            role: 'system' as const,
            content: `Current user context: District "${districtId}" is selected on the map.`,
          }]
        : []),
      // Conversation history (last 10 turns to avoid token limit)
      ...(Array.isArray(history)
        ? history.slice(-10).map((m: { role: string; content: string }) => ({
            role: (m.role === 'user' || m.role === 'assistant') ? m.role : 'user' as 'user' | 'assistant',
            content: String(m.content),
          }))
        : []),
      { role: 'user', content: query.trim() },
    ];

    if (!GROQ_API_KEY) {
      // Fallback: provide a helpful response without AI
      return NextResponse.json({
        success: true,
        reply: `Namaste! I'm MeghDoot, your disaster intelligence copilot. I'm currently running in offline mode as the AI service key isn't configured. For rainfall alerts and forecasts, please check the map view or use the district detail panel. For immediate emergency assistance, contact NDMA at 1078.`,
      });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 512,
        stream: false,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', errText);
      return NextResponse.json(
        { success: false, error: `AI service error: ${groqRes.status}`, reply: '⚠️ AI service temporarily unavailable. Please try again in a moment.' },
        { status: 200 } // return 200 so client shows the message, not a broken error
      );
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || 'No response generated.';

    return NextResponse.json({ success: true, reply });
  } catch (error: unknown) {
    console.error('Chat route error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: true, // still 200 so client shows message
        reply: `⚠️ I encountered an issue: ${msg}. Please try again.`,
      },
      { status: 200 }
    );
  }
}
