import { describe, it, expect } from 'vitest';
import { buildCompositeHtml } from './screenshot-compositor';

describe('buildCompositeHtml', () => {
  const baseInput = {
    headline: 'Ship Faster',
    imageUrl: 'https://example.com/screenshot.png',
  };

  it('returns HTML with correct dimensions', () => {
    const result = buildCompositeHtml(baseInput);
    expect(result.width).toBe(1290);
    expect(result.height).toBe(2796);
    expect(result.html).toContain('1290px');
    expect(result.html).toContain('2796px');
  });

  it('includes the headline in output', () => {
    const result = buildCompositeHtml(baseInput);
    expect(result.html).toContain('Ship Faster');
  });

  it('HTML-escapes the headline', () => {
    const result = buildCompositeHtml({
      ...baseInput,
      headline: '<script>alert("xss")</script>',
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('HTML-escapes special characters', () => {
    const result = buildCompositeHtml({
      ...baseInput,
      headline: 'A & B "quoted" <tag>',
    });
    expect(result.html).toContain('A &amp; B &quot;quoted&quot; &lt;tag&gt;');
  });

  it('includes subheadline when provided', () => {
    const result = buildCompositeHtml({
      ...baseInput,
      subheadline: 'Build better apps',
    });
    expect(result.html).toContain('Build better apps');
  });

  it('includes badge when provided', () => {
    const result = buildCompositeHtml({
      ...baseInput,
      badge: 'NEW',
    });
    expect(result.html).toContain('NEW');
  });

  it('includes app name when provided', () => {
    const result = buildCompositeHtml({
      ...baseInput,
      appName: 'MyApp',
    });
    expect(result.html).toContain('MyApp');
  });

  it('throws when headline is missing', () => {
    expect(() => buildCompositeHtml({
      headline: '',
      imageUrl: 'https://example.com/ss.png',
    })).toThrow('headline is required');
  });

  it('throws when neither imageUrl nor imageBase64 provided', () => {
    expect(() => buildCompositeHtml({
      headline: 'Test',
    })).toThrow('Either imageUrl or imageBase64 is required');
  });

  describe('device profiles', () => {
    it('uses iPhone 15 by default', () => {
      const result = buildCompositeHtml(baseInput);
      // iPhone 15 has frame radius 68
      expect(result.html).toContain('68px');
    });

    it('uses iPhone 15 Pro profile', () => {
      const result = buildCompositeHtml({ ...baseInput, device: 'iphone-15-pro' });
      // Pro has darker frame color
      expect(result.html).toContain('#0b0b0d');
    });

    it('uses Android profile', () => {
      const result = buildCompositeHtml({ ...baseInput, device: 'android' });
      // Android has frame radius 56 and punch-hole cutout
      expect(result.html).toContain('56px');
    });

    it('different devices produce different frames', () => {
      const iphone = buildCompositeHtml({ ...baseInput, device: 'iphone-15' });
      const android = buildCompositeHtml({ ...baseInput, device: 'android' });
      // They should differ (at minimum in frame radius)
      expect(iphone.html).not.toBe(android.html);
    });
  });

  describe('image source normalization', () => {
    it('passes imageUrl through as-is', () => {
      const result = buildCompositeHtml(baseInput);
      expect(result.html).toContain('https://example.com/screenshot.png');
    });

    it('passes base64 with data prefix through', () => {
      const result = buildCompositeHtml({
        headline: 'Test',
        imageBase64: 'data:image/png;base64,iVBOR...',
      });
      expect(result.html).toContain('data:image/png;base64,iVBOR...');
    });

    it('adds data prefix to raw base64', () => {
      const result = buildCompositeHtml({
        headline: 'Test',
        imageBase64: 'iVBOR...',
      });
      expect(result.html).toContain('data:image/png;base64,iVBOR...');
    });
  });

  it('applies custom background color', () => {
    const result = buildCompositeHtml({
      ...baseInput,
      backgroundColor: '#ff0000',
    });
    expect(result.html).toContain('#ff0000');
  });

  it('applies custom text color', () => {
    const result = buildCompositeHtml({
      ...baseInput,
      textColor: '#00ff00',
    });
    expect(result.html).toContain('#00ff00');
  });

  it('generates valid HTML document', () => {
    const result = buildCompositeHtml(baseInput);
    expect(result.html).toContain('<!doctype html>');
    expect(result.html).toContain('</html>');
  });
});
