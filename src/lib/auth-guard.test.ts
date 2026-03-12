import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { secureCompare, hasValidApiKey, hasValidBasicAuth, requireOrchestratorAuth } from './auth-guard';

function makeRequest(url = 'http://localhost/api/test', init?: RequestInit): NextRequest {
  return new NextRequest(url, init as any);
}

describe('secureCompare', () => {
  it('returns true for equal strings', () => {
    expect(secureCompare('hello', 'hello')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(secureCompare('hello', 'world')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(secureCompare('short', 'a longer string')).toBe(false);
  });

  it('returns true for empty strings', () => {
    expect(secureCompare('', '')).toBe(true);
  });

  it('returns false when one is empty', () => {
    expect(secureCompare('', 'notempty')).toBe(false);
  });

  it('handles unicode strings', () => {
    expect(secureCompare('héllo wörld', 'héllo wörld')).toBe(true);
    expect(secureCompare('héllo', 'hello')).toBe(false);
  });
});

describe('hasValidApiKey', () => {
  beforeEach(() => {
    vi.stubEnv('API_KEY', 'test-api-key');
  });

  it('returns false when API_KEY env is not set', () => {
    vi.stubEnv('API_KEY', '');
    const req = makeRequest();
    expect(hasValidApiKey(req)).toBe(false);
  });

  it('returns true when x-api-key header matches', () => {
    const req = makeRequest('http://localhost/api/test', {
      headers: { 'x-api-key': 'test-api-key' },
    });
    expect(hasValidApiKey(req)).toBe(true);
  });

  it('returns true when api_key query param matches', () => {
    const req = makeRequest('http://localhost/api/test?api_key=test-api-key');
    expect(hasValidApiKey(req)).toBe(true);
  });

  it('returns false when header key is wrong', () => {
    const req = makeRequest('http://localhost/api/test', {
      headers: { 'x-api-key': 'wrong-key' },
    });
    expect(hasValidApiKey(req)).toBe(false);
  });

  it('returns false when both header and query are absent', () => {
    const req = makeRequest();
    expect(hasValidApiKey(req)).toBe(false);
  });
});

describe('hasValidBasicAuth', () => {
  beforeEach(() => {
    vi.stubEnv('BASIC_AUTH_USER', 'admin');
    vi.stubEnv('BASIC_AUTH_PASS', 'secret');
  });

  it('returns false when env vars are not set', () => {
    vi.stubEnv('BASIC_AUTH_USER', '');
    vi.stubEnv('BASIC_AUTH_PASS', '');
    const req = makeRequest();
    expect(hasValidBasicAuth(req)).toBe(false);
  });

  it('returns true for valid basic auth header', () => {
    const encoded = Buffer.from('admin:secret').toString('base64');
    const req = makeRequest('http://localhost/api/test', {
      headers: { authorization: `Basic ${encoded}` },
    });
    expect(hasValidBasicAuth(req)).toBe(true);
  });

  it('returns false for invalid credentials', () => {
    const encoded = Buffer.from('admin:wrong').toString('base64');
    const req = makeRequest('http://localhost/api/test', {
      headers: { authorization: `Basic ${encoded}` },
    });
    expect(hasValidBasicAuth(req)).toBe(false);
  });

  it('returns false when no authorization header', () => {
    const req = makeRequest();
    expect(hasValidBasicAuth(req)).toBe(false);
  });

  it('returns false for non-Basic scheme', () => {
    const req = makeRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer some-token' },
    });
    expect(hasValidBasicAuth(req)).toBe(false);
  });

  it('returns false for malformed base64', () => {
    const req = makeRequest('http://localhost/api/test', {
      headers: { authorization: 'Basic %%%notbase64%%%' },
    });
    expect(hasValidBasicAuth(req)).toBe(false);
  });

  it('returns false when no colon in decoded string', () => {
    const encoded = Buffer.from('nocolon').toString('base64');
    const req = makeRequest('http://localhost/api/test', {
      headers: { authorization: `Basic ${encoded}` },
    });
    expect(hasValidBasicAuth(req)).toBe(false);
  });

  it('handles password containing colons (splits on first colon)', () => {
    vi.stubEnv('BASIC_AUTH_PASS', 'pass:with:colons');
    const encoded = Buffer.from('admin:pass:with:colons').toString('base64');
    const req = makeRequest('http://localhost/api/test', {
      headers: { authorization: `Basic ${encoded}` },
    });
    expect(hasValidBasicAuth(req)).toBe(true);
  });
});

describe('requireOrchestratorAuth', () => {
  beforeEach(() => {
    vi.stubEnv('API_KEY', 'test-api-key');
    vi.stubEnv('BASIC_AUTH_USER', 'admin');
    vi.stubEnv('BASIC_AUTH_PASS', 'secret');
  });

  it('returns null when API key is valid', () => {
    const req = makeRequest('http://localhost/api/test', {
      headers: { 'x-api-key': 'test-api-key' },
    });
    expect(requireOrchestratorAuth(req)).toBeNull();
  });

  it('returns null when basic auth is valid', () => {
    const encoded = Buffer.from('admin:secret').toString('base64');
    const req = makeRequest('http://localhost/api/test', {
      headers: { authorization: `Basic ${encoded}` },
    });
    expect(requireOrchestratorAuth(req)).toBeNull();
  });

  it('returns 401 response when neither auth method succeeds', () => {
    vi.stubEnv('API_KEY', 'test-api-key');
    const req = makeRequest('http://localhost/api/test', {
      headers: { 'x-api-key': 'wrong-key' },
    });
    const result = requireOrchestratorAuth(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});
