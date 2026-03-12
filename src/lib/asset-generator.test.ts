import { describe, it, expect } from 'vitest';
import { generateAssets } from './asset-generator';
import type { AssetConfig } from './types';

const testConfig: AssetConfig = {
  name: 'TestApp',
  tagline: 'The best testing app',
  icon: 'https://example.com/icon.png',
  url: 'https://testapp.com',
  features: ['Lightning fast', 'Easy to use', 'Open source', 'Cross-platform'],
  colors: {
    background: '#0a0a0a',
    text: '#ffffff',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
  },
};

describe('generateAssets', () => {
  it('returns 3 asset types', () => {
    const assets = generateAssets(testConfig);
    expect(assets).toHaveLength(3);
    expect(assets.map((a) => a.type)).toEqual(['og-image', 'social-card', 'github-social']);
  });

  it('has correct dimensions for OG image', () => {
    const assets = generateAssets(testConfig);
    const og = assets.find((a) => a.type === 'og-image')!;
    expect(og.width).toBe(1200);
    expect(og.height).toBe(630);
  });

  it('has correct dimensions for social card', () => {
    const assets = generateAssets(testConfig);
    const social = assets.find((a) => a.type === 'social-card')!;
    expect(social.width).toBe(1080);
    expect(social.height).toBe(1080);
  });

  it('has correct dimensions for GitHub social', () => {
    const assets = generateAssets(testConfig);
    const github = assets.find((a) => a.type === 'github-social')!;
    expect(github.width).toBe(1280);
    expect(github.height).toBe(640);
  });

  it('substitutes {{name}} in HTML', () => {
    const assets = generateAssets(testConfig);
    for (const asset of assets) {
      expect(asset.html).toContain('TestApp');
      expect(asset.html).not.toContain('{{name}}');
    }
  });

  it('substitutes {{tagline}} in HTML', () => {
    const assets = generateAssets(testConfig);
    for (const asset of assets) {
      expect(asset.html).toContain('The best testing app');
      expect(asset.html).not.toContain('{{tagline}}');
    }
  });

  it('substitutes {{url}} in templates that use it', () => {
    const assets = generateAssets(testConfig);
    const og = assets.find((a) => a.type === 'og-image')!;
    const github = assets.find((a) => a.type === 'github-social')!;
    expect(og.html).toContain('https://testapp.com');
    expect(github.html).toContain('https://testapp.com');
  });

  it('substitutes color tokens', () => {
    const assets = generateAssets(testConfig);
    for (const asset of assets) {
      expect(asset.html).not.toContain('{{background}}');
      expect(asset.html).not.toContain('{{text}}');
      expect(asset.html).not.toContain('{{primary}}');
      expect(asset.html).not.toContain('{{secondary}}');
    }
  });

  it('substitutes feature placeholders in templates that use them', () => {
    const assets = generateAssets(testConfig);
    const social = assets.find((a) => a.type === 'social-card')!;
    const github = assets.find((a) => a.type === 'github-social')!;
    expect(social.html).toContain('Lightning fast');
    expect(github.html).toContain('Lightning fast');
    expect(social.html).not.toContain('{{feature_1}}');
    expect(github.html).not.toContain('{{feature_1}}');
  });

  it('uses fallback for missing features', () => {
    const config = { ...testConfig, features: ['Only one'] };
    const assets = generateAssets(config);
    const github = assets.find((a) => a.type === 'github-social')!;
    expect(github.html).toContain('Only one');
    // Features beyond index 0 should get fallback
    expect(github.html).toContain('Feature 2');
  });

  it('substitutes {{year}} with current year', () => {
    const assets = generateAssets(testConfig);
    const github = assets.find((a) => a.type === 'github-social')!;
    expect(github.html).toContain(new Date().getFullYear().toString());
    expect(github.html).not.toContain('{{year}}');
  });

  it('all assets have labels', () => {
    const assets = generateAssets(testConfig);
    for (const asset of assets) {
      expect(asset.label).toBeTruthy();
    }
  });

  it('all assets produce valid HTML', () => {
    const assets = generateAssets(testConfig);
    for (const asset of assets) {
      expect(asset.html).toContain('<!DOCTYPE html>');
      expect(asset.html).toContain('</html>');
    }
  });
});
