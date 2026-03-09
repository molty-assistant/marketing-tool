import { vi } from 'vitest';

// Stub env vars commonly needed across tests
vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
vi.stubEnv('API_KEY', 'test-api-key');
vi.stubEnv('BASIC_AUTH_USER', 'admin');
vi.stubEnv('BASIC_AUTH_PASS', 'secret');
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_secret');
