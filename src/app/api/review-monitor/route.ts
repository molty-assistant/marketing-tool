import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getDb } from '@/lib/db';

/**
 * Review Monitor — automated review checking + sentiment + response suggestions
 * 
 * POST /api/review-monitor
 * { planId: string }
 * 
 * This is the "set and forget" endpoint. It:
 * 1. Scrapes latest reviews
 * 2. Compares against previously seen reviews
 * 3. Analyses sentiment on new ones
 * 4. Generates response suggestions for negative reviews
 * 5. Returns a summary + any alerts
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = body.planId;
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const appUrl = config.app_url || '';
    
    if (!appUrl) {
      return NextResponse.json({ error: 'No app URL in plan config' }, { status: 400 });
    }

    // Ensure review_snapshots table exists
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS review_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL,
        reviews TEXT NOT NULL,
        sentiment TEXT,
        alerts TEXT,
        response_suggestions TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Step 1: Scrape reviews via our own API
    const baseUrl = request.nextUrl.origin;
    const scrapeRes = await fetch(`${baseUrl}/api/scrape-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });

    if (!scrapeRes.ok) {
      const err = await scrapeRes.json().catch(() => ({}));
      return NextResponse.json({ 
        error: 'Failed to scrape reviews', 
        detail: err 
      }, { status: 502 });
    }

    const scrapeData = await scrapeRes.json();
    const reviews = scrapeData.reviews || [];

    if (reviews.length === 0) {
      return NextResponse.json({
        status: 'no_reviews',
        message: 'No reviews found to monitor',
      });
    }

    // Step 2: Get previous snapshot to find new reviews
    const prevSnapshot = db.prepare(
      'SELECT reviews FROM review_snapshots WHERE plan_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(planId) as { reviews: string } | undefined;

    let previousReviews: Array<{ author: string; title: string }> = [];
    if (prevSnapshot) {
      try {
        previousReviews = JSON.parse(prevSnapshot.reviews);
      } catch { /* ignore */ }
    }

    const prevKeys = new Set(previousReviews.map(r => `${r.author}::${r.title}`));
    const newReviews = reviews.filter((r: { author: string; title: string }) => 
      !prevKeys.has(`${r.author}::${r.title}`)
    );

    // Step 3: Analyse sentiment via our API
    const sentimentRes = await fetch(`${baseUrl}/api/review-sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });

    let sentiment = null;
    if (sentimentRes.ok) {
      sentiment = await sentimentRes.json();
    }

    // Step 4: Generate response suggestions for negative reviews (≤ 3 stars)
    const negativeReviews = reviews.filter((r: { rating: number }) => r.rating <= 3);
    let responseSuggestions: Array<{ review: string; suggestedResponse: string }> = [];

    if (negativeReviews.length > 0) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const prompt = `You are a customer support specialist for ${config.app_name || 'this app'}. 
Generate professional, empathetic responses for these negative reviews. Be helpful and solution-oriented.

Return valid JSON array:
[{ "reviewTitle": "string", "suggestedResponse": "string" }]

Reviews:
${negativeReviews.map((r: { title: string; body: string; rating: number }) => 
  `- "${r.title}" (${r.rating}★): ${r.body}`
).join('\n')}`;

        try {
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              responseSuggestions = JSON.parse(text);
            }
          }
        } catch { /* continue without suggestions */ }
      }
    }

    // Step 5: Build alerts
    const alerts: string[] = [];
    
    if (newReviews.length > 0) {
      alerts.push(`${newReviews.length} new review(s) since last check`);
    }
    
    if (negativeReviews.length > 0) {
      alerts.push(`${negativeReviews.length} negative review(s) (≤3★) need attention`);
    }

    const avgRating = reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length;
    if (avgRating < 4.0) {
      alerts.push(`Average rating is ${avgRating.toFixed(1)}★ — below 4.0 threshold`);
    }

    // Step 6: Save snapshot
    db.prepare(`
      INSERT INTO review_snapshots (plan_id, reviews, sentiment, alerts, response_suggestions)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      planId,
      JSON.stringify(reviews),
      JSON.stringify(sentiment),
      JSON.stringify(alerts),
      JSON.stringify(responseSuggestions)
    );

    return NextResponse.json({
      status: alerts.length > 0 ? 'attention_needed' : 'all_clear',
      summary: {
        totalReviews: reviews.length,
        newReviews: newReviews.length,
        negativeReviews: negativeReviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
      },
      alerts,
      newReviews: newReviews.slice(0, 10),
      sentiment: sentiment?.analysis || null,
      responseSuggestions,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('review-monitor error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: review monitoring history
export async function GET(request: NextRequest) {
  try {
    const planId = request.nextUrl.searchParams.get('planId');
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS review_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL,
        reviews TEXT NOT NULL,
        sentiment TEXT,
        alerts TEXT,
        response_suggestions TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    const snapshots = db.prepare(
      'SELECT id, alerts, created_at FROM review_snapshots WHERE plan_id = ? ORDER BY created_at DESC LIMIT 20'
    ).all(planId);

    return NextResponse.json({ snapshots });
  } catch (err) {
    console.error('review-monitor GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
