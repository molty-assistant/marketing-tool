import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mockLookup is available inside the vi.mock factory
const { mockLookup } = vi.hoisted(() => ({
  mockLookup: vi.fn(),
}));

vi.mock('dns/promises', () => ({
  default: { lookup: mockLookup },
  lookup: mockLookup,
}));

import { detectUrlType, scrapeUrl, scrapeAppStore, scrapeWebsite } from './scraper';

beforeEach(() => {
  vi.restoreAllMocks();
  // Default: DNS resolves to a safe public IP
  mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
});

describe('detectUrlType', () => {
  it('detects App Store URLs', () => {
    expect(detectUrlType('https://apps.apple.com/us/app/example/id123456789')).toBe('appstore');
    expect(detectUrlType('https://itunes.apple.com/app/id123456789')).toBe('appstore');
  });

  it('detects Google Play URLs', () => {
    expect(detectUrlType('https://play.google.com/store/apps/details?id=com.example.app')).toBe('googleplay');
  });

  it('detects generic websites', () => {
    expect(detectUrlType('https://example.com')).toBe('website');
    expect(detectUrlType('https://myapp.io/landing')).toBe('website');
  });
});

describe('SSRF protection', () => {
  it('blocks localhost', async () => {
    await expect(scrapeUrl('http://localhost/test')).rejects.toThrow('localhost is not allowed');
  });

  it('blocks loopback IPv4 (127.0.0.1)', async () => {
    await expect(scrapeUrl('http://127.0.0.1/test')).rejects.toThrow('loopback IP');
  });

  it('blocks loopback 127.x range', async () => {
    await expect(scrapeUrl('http://127.0.0.2/test')).rejects.toThrow('loopback IP');
  });

  it('blocks private network 10.x', async () => {
    await expect(scrapeUrl('http://10.0.0.1/test')).rejects.toThrow('private network (10.x)');
  });

  it('blocks private network 172.16-31.x', async () => {
    await expect(scrapeUrl('http://172.16.0.1/test')).rejects.toThrow('private network (172.16-31.x)');
    await expect(scrapeUrl('http://172.31.255.255/test')).rejects.toThrow('private network (172.16-31.x)');
  });

  it('does not block 172.15.x or 172.32.x', async () => {
    // These should not be blocked by the 172.16-31 check, but will fail on fetch
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch error')));
    // 172.15 is not private in the 172.16-31 range — check it passes SSRF validation
    // but will fail on the actual fetch
    await expect(scrapeUrl('http://172.15.0.1/test')).rejects.toThrow('fetch error');
  });

  it('blocks private network 192.168.x', async () => {
    await expect(scrapeUrl('http://192.168.1.1/test')).rejects.toThrow('private network (192.168.x)');
  });

  it('blocks metadata IP 169.254.x', async () => {
    await expect(scrapeUrl('http://169.254.169.254/test')).rejects.toThrow('metadata IP');
  });

  it('blocks 0.0.0.0', async () => {
    await expect(scrapeUrl('http://0.0.0.0/test')).rejects.toThrow('0.0.x.x');
  });

  it('blocks loopback IPv6 (::1)', async () => {
    await expect(scrapeUrl('http://[::1]/test')).rejects.toThrow('loopback IPv6');
  });

  it('blocks unique local address (fd00::)', async () => {
    await expect(scrapeUrl('http://[fd00::1]/test')).rejects.toThrow('unique local address');
  });

  it('blocks link-local address (fe80::)', async () => {
    await expect(scrapeUrl('http://[fe80::1]/test')).rejects.toThrow('link-local address');
  });

  it('blocks IPv4-mapped IPv6 literal in URL', async () => {
    // Test the IP check directly via URL with IPv4-mapped IPv6
    await expect(scrapeUrl('http://[::ffff:127.0.0.1]/test')).rejects.toThrow('loopback IP');
  });

  it('blocks fc00:: unique local addresses', async () => {
    await expect(scrapeUrl('http://[fc00::1]/test')).rejects.toThrow('unique local address');
  });
});

describe('scrapeAppStore', () => {
  it('extracts app data from iTunes API response', async () => {
    const mockResponse = {
      results: [{
        trackName: 'Test App',
        artworkUrl512: 'https://example.com/icon.png',
        description: '- Feature one\n- Feature two\nGreat app for testing.',
        averageUserRating: 4.5,
        userRatingCount: 1000,
        primaryGenreName: 'Utilities',
        artistName: 'Test Developer',
        price: 0,
        genres: ['Utilities', 'Productivity'],
        screenshotUrls: ['https://example.com/ss1.png'],
        ipadScreenshotUrls: [],
      }],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const result = await scrapeAppStore('https://apps.apple.com/us/app/test/id123456789');
    expect(result.name).toBe('Test App');
    expect(result.source).toBe('appstore');
    expect(result.rating).toBe(4.5);
    expect(result.pricing).toBe('Free');
    expect(result.features.length).toBeGreaterThan(0);
  });

  it('throws when app ID cannot be extracted', async () => {
    await expect(scrapeAppStore('https://apps.apple.com/us/app/test')).rejects.toThrow('Could not extract App Store ID');
  });
});

describe('scrapeWebsite', () => {
  it('extracts metadata from HTML', async () => {
    const html = `
      <html>
        <head>
          <title>My Cool App | Landing</title>
          <meta property="og:title" content="My Cool App" />
          <meta property="og:description" content="The best app for testing things." />
          <meta property="og:image" content="https://example.com/og.png" />
          <meta name="keywords" content="testing, app, cool" />
        </head>
        <body>
          <h2>Feature Alpha</h2>
          <h3>Feature Beta</h3>
          <p>Some content with free access.</p>
        </body>
      </html>
    `;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    }));

    const result = await scrapeWebsite('https://example.com');
    expect(result.name).toBe('My Cool App');
    expect(result.description).toBe('The best app for testing things.');
    expect(result.icon).toBe('https://example.com/og.png');
    expect(result.features).toContain('Feature Alpha');
    expect(result.features).toContain('Feature Beta');
    expect(result.pricing).toBe('Free');
  });
});

describe('HTML entity decoding', () => {
  it('decodes entities in meta content', async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Tom &amp; Jerry&#39;s App" />
        <meta property="og:description" content="A &lt;great&gt; &quot;app&quot;" />
      </head><body></body></html>
    `;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    }));

    const result = await scrapeWebsite('https://example.com');
    expect(result.name).toBe("Tom & Jerry's App");
    expect(result.description).toBe('A <great> "app"');
  });
});

describe('extractFeatures', () => {
  it('extracts bullet-point features from description', async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="App" />
        <meta property="og:description" content="- Track your daily tasks easily\n- Set reminders and alerts\n• Share with your team" />
      </head><body></body></html>
    `;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    }));

    // scrapeWebsite falls back to extractFeatures(description) when no headings
    const result = await scrapeWebsite('https://example.com');
    expect(result.features).toContain('Track your daily tasks easily');
    expect(result.features).toContain('Set reminders and alerts');
    expect(result.features).toContain('Share with your team');
  });

  it('caps features at 10', async () => {
    const bullets = Array.from({ length: 15 }, (_, i) => `- Feature number ${i + 1} is great`).join('\n');
    const html = `
      <html><head>
        <meta property="og:title" content="App" />
        <meta property="og:description" content="${bullets}" />
      </head><body></body></html>
    `;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    }));

    const result = await scrapeWebsite('https://example.com');
    expect(result.features.length).toBeLessThanOrEqual(10);
  });
});

describe('reversed meta attribute order', () => {
  it('extracts meta when content comes before property', async () => {
    const html = `
      <html><head>
        <meta content="Reversed App" property="og:title" />
        <meta content="A reversed description" name="description" />
      </head><body></body></html>
    `;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    }));

    const result = await scrapeWebsite('https://example.com');
    expect(result.name).toBe('Reversed App');
    expect(result.description).toBe('A reversed description');
  });
});
