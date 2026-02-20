import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type ActorType = 'api_key' | 'ip' | 'unknown';
type RateLimitBucket = 'default' | 'ai' | 'public' | 'heavy';

type RequestLike = Request & { ip?: string | null };

export interface RateLimitOptions {
  endpoint: string;
  bucket?: RateLimitBucket;
  maxRequests?: number;
  windowSec?: number;
  envKey?: string;
}

type BucketDefaults = {
  maxRequests: number;
  windowSec: number;
};

const BUCKET_DEFAULTS: Record<RateLimitBucket, BucketDefaults> = {
  default: { maxRequests: 60, windowSec: 60 },
  ai: { maxRequests: 12, windowSec: 60 },
  public: { maxRequests: 45, windowSec: 60 },
  heavy: { maxRequests: 8, windowSec: 60 },
};

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function endpointToEnvSegment(endpoint: string): string {
  const segment = endpoint
    .replace(/^\/api\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return (segment || 'ROOT').toUpperCase();
}

function getClientIp(request: RequestLike): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor
      .split(',')
      .map((x) => x.trim())
      .find(Boolean);
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp?.trim()) return cfIp.trim();

  const directIp = request.ip;
  if (typeof directIp === 'string' && directIp.trim()) return directIp.trim();

  return null;
}

function resolveActor(request: RequestLike): { type: ActorType; value: string } {
  const apiKey = request.headers.get('x-api-key')?.trim();
  if (apiKey) {
    return { type: 'api_key', value: apiKey };
  }

  const ip = getClientIp(request);
  if (ip) {
    return { type: 'ip', value: ip };
  }

  return { type: 'unknown', value: 'unknown' };
}

function hashActor(actorType: ActorType, actorValue: string): string {
  const salt = process.env.RATE_LIMIT_HASH_SALT || '';
  return createHash('sha256').update(salt).update(`${actorType}:${actorValue}`).digest('hex');
}

function toJsDate(sqliteDate: string | null): Date | null {
  if (!sqliteDate) return null;
  const normalized = sqliteDate.includes('T') ? sqliteDate : sqliteDate.replace(' ', 'T');
  const d = new Date(`${normalized}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveLimitConfig(options: RateLimitOptions): BucketDefaults {
  const bucket = options.bucket || 'default';
  const defaults = BUCKET_DEFAULTS[bucket];
  const endpointSegment = endpointToEnvSegment(options.envKey || options.endpoint);

  const endpointMax = parsePositiveInt(process.env[`RATE_LIMIT_${endpointSegment}_MAX_REQUESTS`]);
  const endpointWindow = parsePositiveInt(process.env[`RATE_LIMIT_${endpointSegment}_WINDOW_SEC`]);

  const bucketName = bucket.toUpperCase();
  const bucketMax = parsePositiveInt(process.env[`RATE_LIMIT_${bucketName}_MAX_REQUESTS`]);
  const bucketWindow = parsePositiveInt(process.env[`RATE_LIMIT_${bucketName}_WINDOW_SEC`]);

  const globalMax = parsePositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS);
  const globalWindow = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_SEC);

  return {
    maxRequests:
      options.maxRequests || endpointMax || bucketMax || globalMax || defaults.maxRequests,
    windowSec: options.windowSec || endpointWindow || bucketWindow || globalWindow || defaults.windowSec,
  };
}

function cleanupOldEvents(retentionDays: number): void {
  const db = getDb();
  db.prepare("DELETE FROM api_request_events WHERE created_at < datetime('now', ?)").run(
    `-${retentionDays} days`
  );
}

function recordRequestUsage(params: {
  endpoint: string;
  actorHash: string;
  actorType: ActorType;
  blocked: boolean;
}): void {
  const db = getDb();
  const blockedInt = params.blocked ? 1 : 0;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO api_request_events (endpoint, actor_hash, actor_type, blocked, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(params.endpoint, params.actorHash, params.actorType, blockedInt);

    db.prepare(
      `INSERT INTO api_usage_daily (usage_date, endpoint, total_requests, blocked_requests, updated_at)
       VALUES (date('now'), ?, 1, ?, datetime('now'))
       ON CONFLICT(usage_date, endpoint)
       DO UPDATE SET
         total_requests = api_usage_daily.total_requests + 1,
         blocked_requests = api_usage_daily.blocked_requests + excluded.blocked_requests,
         updated_at = datetime('now')`
    ).run(params.endpoint, blockedInt);
  });

  tx();
}

function buildBlockedResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      retryAfterSec,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}

export function enforceRateLimit(
  request: RequestLike,
  options: RateLimitOptions
): NextResponse | null {
  const enabled = parseBoolean(process.env.RATE_LIMIT_ENABLED, true);
  const retentionDays = parsePositiveInt(process.env.RATE_LIMIT_RETENTION_DAYS) || 14;

  cleanupOldEvents(retentionDays);

  const actor = resolveActor(request);
  const actorHash = hashActor(actor.type, actor.value);

  if (!enabled) {
    recordRequestUsage({
      endpoint: options.endpoint,
      actorHash,
      actorType: actor.type,
      blocked: false,
    });
    return null;
  }

  const config = resolveLimitConfig(options);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) as request_count, MIN(created_at) as oldest
       FROM api_request_events
       WHERE endpoint = ?
         AND actor_hash = ?
         AND created_at >= datetime('now', ?)`
    )
    .get(options.endpoint, actorHash, `-${config.windowSec} seconds`) as {
    request_count: number;
    oldest: string | null;
  };

  const blocked = row.request_count >= config.maxRequests;

  recordRequestUsage({
    endpoint: options.endpoint,
    actorHash,
    actorType: actor.type,
    blocked,
  });

  if (!blocked) {
    return null;
  }

  const oldestDate = toJsDate(row.oldest);
  if (!oldestDate) {
    return buildBlockedResponse(config.windowSec);
  }

  const resetAt = oldestDate.getTime() + config.windowSec * 1000;
  const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return buildBlockedResponse(retryAfterSec);
}
