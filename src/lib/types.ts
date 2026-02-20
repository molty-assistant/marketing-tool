// Core types for the marketing tool

export interface ScrapedApp {
  url: string;
  source: 'appstore' | 'googleplay' | 'website';
  name: string;
  icon?: string;
  description: string;
  shortDescription?: string;
  screenshots?: string[];
  pricing: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
  developer?: string;
  features: string[];
  keywords?: string[];

  // Extra optional metadata (used when available; safe for existing pipeline)
  lastUpdated?: string;
}

export interface AppConfig {
  app_name: string;
  app_url: string;
  app_type: 'web' | 'mobile' | 'saas' | 'desktop' | 'cli' | 'api' | 'browser-extension';
  category: string;
  one_liner: string;
  target_audience: string;
  pricing: string;
  differentiators: string[];
  competitors: string[];
  distribution_channels: string[];
  repo_url?: string;
  icon?: string;
}

export interface MarketingPlan {
  id: string;
  config: AppConfig;
  scraped: ScrapedApp;
  generated: string; // Full markdown
  createdAt: string;
  stages: {
    research: string;
    foundation: string;
    structure: string;
    assets: string;
    distribution: string;
  };
}

export interface AssetConfig {
  name: string;
  tagline: string;
  icon: string;
  url: string;
  features: string[];
  colors: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
  };
}

export interface GeneratedAsset {
  type: 'og-image' | 'social-card' | 'github-social';
  label: string;
  width: number;
  height: number;
  html: string;
}

export interface RecentAnalysis {
  id: string;
  url: string;
  name: string;
  icon?: string;
  source: string;
  createdAt: string;
}
