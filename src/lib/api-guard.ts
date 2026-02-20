import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  consumeApiRateLimit,
  trackApiUsage,
  type RateLimitActorType,
} from '@/lib/db';

interface ApiGuardOptions {
  endpoint?: string;
  windowSeconds?: number;
  maxRequests?: number;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function hashApiKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function extractClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const candidates = [
    request.headers.get('x-real-ip'),
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-client-ip'),
    request.headers.get('fastly-client-ip'),
    (request as NextRequest & { ip?: string }).ip,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function getActorIdentity(request: NextRequest): {
  actorType: RateLimitActorType;
  actorKey: string;
} {
  const apiKey = request.headers.get('x-api-key')?.trim();
  if (apiKey) {
    return {
      actorType: 'api_key',
      actorKey: hashApiKey(apiKey),
    };
  }

  const ip = extractClientIp(request);
  if (ip) {
    return {
      actorType: 'ip',
      actorKey: ip.slice(0, 128),
    };
  }

  return {
    actorType: 'unknown',
    actorKey: 'unknown',
  };
}

export function guardApiRoute(request: NextRequest, options: ApiGuardOptions = {}): NextResponse | null {
  const endpoint = options.endpoint ?? request.nextUrl.pathname;
  const windowSeconds = parsePositiveInt(
    options.windowSeconds ?? process.env.API_RATE_LIMIT_WINDOW_SECONDS,
    60
  );
  const maxRequests = parsePositiveInt(
    options.maxRequests ?? process.env.API_RATE_LIMIT_MAX_REQUESTS,
    30
  );
  const actor = getActorIdentity(request);

  try {
    const rate = consumeApiRateLimit({
      endpoint,
      actorType: actor.actorType,
      actorKey: actor.actorKey,
      windowSeconds,
      maxRequests,
    });

    trackApiUsage({
      endpoint,
      actorType: actor.actorType,
      actorKey: actor.actorKey,
      blocked: !rate.allowed,
    });

    if (rate.allowed) {
      return null;
    }

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        endpoint,
        limit: rate.limit,
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfterSeconds),
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': String(rate.remaining),
          'X-RateLimit-Reset': String(rate.resetAtEpochSeconds),
        },
      }
    );
  } catch (error) {
    console.error('Rate limiter failure, allowing request:', error);
    return null;
  }
}
