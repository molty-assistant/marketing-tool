import { NextRequest, NextResponse } from 'next/server';
import { saveContent } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

export async function POST(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, { endpoint: '/api/keyword-research', bucket: 'ai' });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { planId, appName, category } = await req.json();

    if (!planId || !appName) {
      return NextResponse.json({ error: 'planId and appName are required' }, { status: 400 });
    }

    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: 'PERPLEXITY_API_KEY not configured' }, { status: 500 });
    }

    const prompt = `You are an ASO/SEO keyword research expert. For the app "${appName}"${category ? ` in the "${category}" category` : ''}, provide keyword research data.

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "keywords": [
    { "keyword": "example keyword", "volume": 5000, "difficulty": 45, "relevance": 90 }
  ],
  "longTail": [
    { "keyword": "long tail example keyword", "volume": 500, "difficulty": 20, "relevance": 85 }
  ],
  "suggestions": "Brief strategic suggestions for keyword targeting."
}

Provide 10-15 main keywords and 8-12 long-tail keywords. Volume is estimated monthly search volume. Difficulty is 0-100 (higher = harder). Relevance is 0-100 (higher = more relevant to the app).`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a keyword research assistant. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Perplexity API error:', errText);
      return NextResponse.json({ error: 'Failed to fetch keyword data' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response (handle potential markdown fences)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse Perplexity response:', content);
      return NextResponse.json({ error: 'Failed to parse keyword data' }, { status: 500 });
    }

    // Ensure structure
    const finalResult = {
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
      longTail: Array.isArray(result.longTail) ? result.longTail : [],
      suggestions: typeof result.suggestions === 'string' ? result.suggestions : '',
    };

    // Save to DB
    saveContent(planId, 'keyword-research', null, JSON.stringify(finalResult));

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error('Keyword research error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
