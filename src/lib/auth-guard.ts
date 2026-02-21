import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export function secureCompare(input: string, expected: string): boolean {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  const maxLength = Math.max(inputBuffer.length, expectedBuffer.length);

  const left = Buffer.alloc(maxLength);
  const right = Buffer.alloc(maxLength);
  inputBuffer.copy(left);
  expectedBuffer.copy(right);

  const equal = timingSafeEqual(left, right);
  return equal && inputBuffer.length === expectedBuffer.length;
}

export function hasValidApiKey(request: NextRequest): boolean {
  const expectedApiKey = process.env.API_KEY;
  if (!expectedApiKey) return false;

  const headerApiKey = request.headers.get('x-api-key');
  if (headerApiKey && secureCompare(headerApiKey, expectedApiKey)) {
    return true;
  }

  const queryApiKey = request.nextUrl.searchParams.get('api_key');
  return Boolean(queryApiKey && secureCompare(queryApiKey, expectedApiKey));
}

export function hasValidBasicAuth(request: NextRequest): boolean {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASS;
  if (!expectedUser || !expectedPass) return false;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const [scheme, encoded] = authHeader.split(' ');
  if (!scheme || !encoded || scheme.toLowerCase() !== 'basic') {
    return false;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return false;

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

  return secureCompare(user, expectedUser) && secureCompare(pass, expectedPass);
}

export function requireOrchestratorAuth(request: NextRequest): NextResponse | null {
  if (hasValidApiKey(request) || hasValidBasicAuth(request)) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
