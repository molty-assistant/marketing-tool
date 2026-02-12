import { NextRequest, NextResponse } from 'next/server';
import { getAllPlans, savePlan } from '@/lib/db';
import { MarketingPlan } from '@/lib/types';

export async function GET() {
  try {
    const rows = getAllPlans();
    const plans = rows.map((row) => ({
      id: row.id,
      config: JSON.parse(row.config),
      scraped: JSON.parse(row.scraped),
      generated: row.generated,
      stages: JSON.parse(row.stages),
      createdAt: row.created_at,
    }));
    return NextResponse.json(plans);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch plans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const plan = (await request.json()) as MarketingPlan;

    if (!plan.id || !plan.config || !plan.generated) {
      return NextResponse.json({ error: 'Invalid plan data' }, { status: 400 });
    }

    savePlan(plan);
    return NextResponse.json({ success: true, id: plan.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
