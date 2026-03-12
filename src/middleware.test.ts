import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import after env stubs are set in setup.ts
import { middleware } from './middleware';

function makeRequest(path: string, init?: RequestInit): NextRequest {
  return new NextRequest(`http://localhost${path}`, init as any);
}

describe('middleware', () => {
  beforeEach(() => {
    vi.stubEnv('API_KEY', '');
    vi.stubEnv('BASIC_AUTH_ENABLED', '');
    vi.stubEnv('BASIC_AUTH_USER', '');
    vi.stubEnv('BASIC_AUTH_PASS', '');
  });

  describe('public routes', () => {
    const publicPaths = [
      '/',
      '/start',
      '/checkout',
      '/terms',
      '/privacy',
      '/intake',
      '/my-pdfs',
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml',
      '/site.webmanifest',
      '/manifest.json',
      '/apple-touch-icon.png',
      '/apple-touch-icon-precomposed.png',
      '/api/health',
      '/api/scrape',
      '/api/generate-plan',
      '/tiktok',
    ];

    for (const path of publicPaths) {
      it(`allows ${path} without auth`, () => {
        const res = middleware(makeRequest(path));
        expect(res.status).not.toBe(401);
      });
    }

    it('allows /status/:id paths', () => {
      const res = middleware(makeRequest('/status/abc123'));
      expect(res.status).not.toBe(401);
    });

    it('allows /delivery/:id paths', () => {
      const res = middleware(makeRequest('/delivery/order-456'));
      expect(res.status).not.toBe(401);
    });

    it('allows /shared/:token paths', () => {
      const res = middleware(makeRequest('/shared/some-token'));
      expect(res.status).not.toBe(401);
    });

    it('allows /api/shared/:token paths', () => {
      const res = middleware(makeRequest('/api/shared/some-token'));
      expect(res.status).not.toBe(401);
    });

    it('allows /api/pdf/* paths', () => {
      const res = middleware(makeRequest('/api/pdf/orders'));
      expect(res.status).not.toBe(401);
    });
  });

  describe('API key auth', () => {
    beforeEach(() => {
      vi.stubEnv('API_KEY', 'my-secret-key');
      vi.stubEnv('BASIC_AUTH_ENABLED', 'true');
      vi.stubEnv('BASIC_AUTH_USER', 'admin');
      vi.stubEnv('BASIC_AUTH_PASS', 'pass');
    });

    it('allows access with valid x-api-key header', () => {
      const res = middleware(makeRequest('/api/plans', {
        headers: { 'x-api-key': 'my-secret-key' },
      }));
      expect(res.status).not.toBe(401);
    });

    it('allows access with valid api_key query param', () => {
      const res = middleware(makeRequest('/api/plans?api_key=my-secret-key'));
      expect(res.status).not.toBe(401);
    });

    it('does not allow invalid API key', () => {
      const res = middleware(makeRequest('/api/plans', {
        headers: { 'x-api-key': 'wrong-key' },
      }));
      expect(res.status).toBe(401);
    });
  });

  describe('basic auth disabled', () => {
    it('allows all routes when BASIC_AUTH_ENABLED is not set', () => {
      const res = middleware(makeRequest('/api/plans'));
      expect(res.status).not.toBe(401);
    });
  });

  describe('basic auth enabled', () => {
    beforeEach(() => {
      vi.stubEnv('BASIC_AUTH_ENABLED', 'true');
      vi.stubEnv('BASIC_AUTH_USER', 'admin');
      vi.stubEnv('BASIC_AUTH_PASS', 'pass');
    });

    it('allows valid credentials', () => {
      const encoded = btoa('admin:pass');
      const res = middleware(makeRequest('/api/plans', {
        headers: { authorization: `Basic ${encoded}` },
      }));
      expect(res.status).not.toBe(401);
    });

    it('returns 401 for invalid credentials', () => {
      const encoded = btoa('admin:wrong');
      const res = middleware(makeRequest('/api/plans', {
        headers: { authorization: `Basic ${encoded}` },
      }));
      expect(res.status).toBe(401);
    });

    it('returns 401 with WWW-Authenticate header', () => {
      const res = middleware(makeRequest('/api/plans'));
      expect(res.status).toBe(401);
      expect(res.headers.get('WWW-Authenticate')).toContain('Basic realm=');
    });

    it('returns 401 when no auth header is provided', () => {
      const res = middleware(makeRequest('/api/plans'));
      expect(res.status).toBe(401);
    });

    it('passes through when user/pass env vars are empty', () => {
      vi.stubEnv('BASIC_AUTH_USER', '');
      vi.stubEnv('BASIC_AUTH_PASS', '');
      const res = middleware(makeRequest('/api/plans'));
      expect(res.status).not.toBe(401);
    });
  });

  describe('isAuthEnabled variants', () => {
    beforeEach(() => {
      vi.stubEnv('BASIC_AUTH_USER', 'admin');
      vi.stubEnv('BASIC_AUTH_PASS', 'pass');
    });

    for (const val of ['1', 'true', 'yes', 'on', 'TRUE', 'Yes', 'ON']) {
      it(`recognizes BASIC_AUTH_ENABLED=${val}`, () => {
        vi.stubEnv('BASIC_AUTH_ENABLED', val);
        const res = middleware(makeRequest('/api/plans'));
        expect(res.status).toBe(401);
      });
    }

    for (const val of ['0', 'false', 'no', 'off', '']) {
      it(`does not enable auth for BASIC_AUTH_ENABLED=${val}`, () => {
        vi.stubEnv('BASIC_AUTH_ENABLED', val);
        const res = middleware(makeRequest('/api/plans'));
        expect(res.status).not.toBe(401);
      });
    }
  });
});
