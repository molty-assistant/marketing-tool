import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { NextRequest } from 'next/server';
import { createTestDb } from '../test/db-helper';

let testDb: Database.Database;

vi.mock('@/lib/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...original,
    getDb: () => testDb,
  };
});

import { guardApiRoute } from './api-guard';

beforeEach(() => {
  testDb = createTestDb();
  vi.stubEnv('API_KEY', '');
});

function makeRequest(path: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: headers ?? {},
  });
}

describe('guardApiRoute', () => {
  it('allows the first request', () => {
    const req = makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' });
    const result = guardApiRoute(req, { maxRequests: 3, windowSeconds: 60 });
    expect(result).toBeNull();
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 3; i++) {
      const req = makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' });
      const result = guardApiRoute(req, { maxRequests: 3, windowSeconds: 60 });
      expect(result).toBeNull();
    }
  });

  it('returns 429 when over the limit', () => {
    for (let i = 0; i < 3; i++) {
      const req = makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' });
      guardApiRoute(req, { maxRequests: 3, windowSeconds: 60 });
    }

    const req = makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' });
    const result = guardApiRoute(req, { maxRequests: 3, windowSeconds: 60 });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    expect(result!.headers.get('Retry-After')).toBeTruthy();
    expect(result!.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(result!.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('tracks API key actors separately from IP', () => {
    // Exhaust rate limit for IP actor
    for (let i = 0; i < 2; i++) {
      guardApiRoute(
        makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' }),
        { maxRequests: 2, windowSeconds: 60 }
      );
    }
    const ipBlocked = guardApiRoute(
      makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' }),
      { maxRequests: 2, windowSeconds: 60 }
    );
    expect(ipBlocked).not.toBeNull();

    // API key actor should still be allowed
    const apiKeyReq = makeRequest('/api/test', { 'x-api-key': 'some-key' });
    const result = guardApiRoute(apiKeyReq, { maxRequests: 2, windowSeconds: 60 });
    expect(result).toBeNull();
  });

  it('uses x-forwarded-for (first IP) for identification', () => {
    const req = makeRequest('/api/test', { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' });
    const result = guardApiRoute(req, { maxRequests: 5, windowSeconds: 60 });
    expect(result).toBeNull();
  });

  it('falls back through IP header chain', () => {
    // x-real-ip
    const req1 = makeRequest('/api/test', { 'x-real-ip': '3.3.3.3' });
    expect(guardApiRoute(req1, { maxRequests: 5, windowSeconds: 60 })).toBeNull();

    // cf-connecting-ip
    const req2 = makeRequest('/api/test', { 'cf-connecting-ip': '4.4.4.4' });
    expect(guardApiRoute(req2, { maxRequests: 5, windowSeconds: 60 })).toBeNull();
  });

  it('uses endpoint option when provided', () => {
    // Exhaust with custom endpoint
    for (let i = 0; i < 2; i++) {
      guardApiRoute(
        makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' }),
        { endpoint: '/custom', maxRequests: 2, windowSeconds: 60 }
      );
    }

    // Same path but default endpoint (pathname) should still work
    const result = guardApiRoute(
      makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' }),
      { maxRequests: 2, windowSeconds: 60 }
    );
    expect(result).toBeNull();
  });
});
