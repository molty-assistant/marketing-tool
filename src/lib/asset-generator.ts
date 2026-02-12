import { AssetConfig, GeneratedAsset } from './types';

function fillTemplate(html: string, config: AssetConfig): string {
  let result = html;
  result = result.replace(/\{\{name\}\}/g, config.name);
  result = result.replace(/\{\{tagline\}\}/g, config.tagline);
  result = result.replace(/\{\{icon\}\}/g, config.icon);
  result = result.replace(/\{\{url\}\}/g, config.url);
  result = result.replace(/\{\{background\}\}/g, config.colors.background);
  result = result.replace(/\{\{text\}\}/g, config.colors.text);
  result = result.replace(/\{\{primary\}\}/g, config.colors.primary);
  result = result.replace(/\{\{secondary\}\}/g, config.colors.secondary);
  result = result.replace(/\{\{year\}\}/g, new Date().getFullYear().toString());

  // Features
  for (let i = 0; i < 10; i++) {
    result = result.replace(
      new RegExp(`\\{\\{feature_${i + 1}\\}\\}`, 'g'),
      config.features[i] || `Feature ${i + 1}`
    );
  }
  result = result.replace(/\{\{feature_count\}\}/g, config.features.length.toString());

  return result;
}

const OG_IMAGE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1200">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  body { background: {{background}}; color: {{text}}; position: relative; display: flex; align-items: center; justify-content: center; }
  .bg-gradient { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 10% 90%, {{primary}}22 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 85% 20%, {{secondary}}33 0%, transparent 50%); }
  .bg-grid { position: absolute; inset: 0; background-image: linear-gradient({{text}}06 1px, transparent 1px), linear-gradient(90deg, {{text}}06 1px, transparent 1px); background-size: 40px 40px; }
  .glow-orb { position: absolute; width: 400px; height: 400px; border-radius: 50%; background: {{primary}}; opacity: 0.07; filter: blur(100px); top: -80px; right: -60px; }
  .content { position: relative; z-index: 1; width: 100%; height: 100%; padding: 64px 72px; display: flex; flex-direction: column; justify-content: center; }
  .icon { font-size: 56px; margin-bottom: 24px; filter: drop-shadow(0 4px 24px {{primary}}44); line-height: 1; }
  .app-name { font-size: 64px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 16px; background: linear-gradient(135deg, {{text}} 0%, {{text}}cc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .tagline { font-size: 26px; font-weight: 500; color: {{text}}aa; line-height: 1.4; max-width: 700px; margin-bottom: 40px; }
  .url-badge { display: inline-flex; align-items: center; gap: 8px; background: {{text}}0a; border: 1px solid {{text}}15; border-radius: 100px; padding: 10px 20px; font-size: 16px; font-weight: 500; color: {{primary}}; letter-spacing: 0.01em; backdrop-filter: blur(8px); }
  .url-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: {{primary}}; box-shadow: 0 0 12px {{primary}}88; }
  .accent-line { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, {{primary}}, {{secondary}}, {{primary}}44); }
  .corner-deco { position: absolute; top: 48px; right: 72px; display: flex; gap: 6px; }
  .corner-deco span { width: 12px; height: 12px; border-radius: 50%; border: 2px solid {{text}}20; }
  .corner-deco span:first-child { background: {{primary}}; border-color: {{primary}}; }
</style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="bg-grid"></div>
  <div class="glow-orb"></div>
  <div class="content">
    <div class="icon">{{icon}}</div>
    <h1 class="app-name">{{name}}</h1>
    <p class="tagline">{{tagline}}</p>
    <div class="url-badge"><span class="dot"></span>{{url}}</div>
  </div>
  <div class="corner-deco"><span></span><span></span><span></span></div>
  <div class="accent-line"></div>
</body>
</html>`;

const SOCIAL_CARD_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1080px; overflow: hidden; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  body { background: {{background}}; color: {{text}}; position: relative; display: flex; flex-direction: column; }
  .bg { position: absolute; inset: 0; background: radial-gradient(circle 500px at 20% 80%, {{primary}}18 0%, transparent 70%), radial-gradient(circle 400px at 80% 20%, {{secondary}}25 0%, transparent 60%); }
  .geo { position: absolute; width: 320px; height: 320px; border: 2px solid {{primary}}15; border-radius: 40px; transform: rotate(45deg); top: -80px; right: -80px; }
  .geo::after { content: ''; position: absolute; inset: 24px; border: 2px solid {{primary}}10; border-radius: 30px; }
  .content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; padding: 72px 64px; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 48px; }
  .icon { font-size: 40px; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: {{primary}}15; border-radius: 16px; border: 1px solid {{primary}}25; }
  .app-name { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: {{text}}dd; }
  .feature-section { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 32px; }
  .feature-label { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: {{primary}}; }
  .feature-text { font-size: 56px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; background: linear-gradient(135deg, {{text}} 30%, {{primary}} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; max-width: 800px; }
  .feature-desc { font-size: 22px; font-weight: 400; color: {{text}}88; line-height: 1.5; max-width: 700px; }
  .footer { position: relative; z-index: 1; padding: 0 64px 56px; display: flex; align-items: center; justify-content: space-between; }
  .badges { display: flex; gap: 24px; }
  .badge { font-size: 15px; font-weight: 500; color: {{text}}66; display: flex; align-items: center; gap: 8px; }
  .badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: {{primary}}88; }
  .feature-number { font-size: 120px; font-weight: 900; color: {{primary}}0c; position: absolute; right: 64px; bottom: 120px; line-height: 1; letter-spacing: -0.05em; }
  .bar { position: absolute; bottom: 0; left: 64px; right: 64px; height: 3px; border-radius: 3px; background: linear-gradient(90deg, {{primary}}, {{primary}}33); }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="geo"></div>
  <div class="content">
    <div class="header">
      <div class="icon">{{icon}}</div>
      <div class="app-name">{{name}}</div>
    </div>
    <div class="feature-section">
      <div class="feature-label">Featured</div>
      <div class="feature-text">{{feature_1}}</div>
      <div class="feature-desc">{{tagline}}</div>
    </div>
  </div>
  <div class="feature-number">01</div>
  <div class="footer">
    <div class="badges">
      <span class="badge">Free</span>
      <span class="badge">No install</span>
      <span class="badge">Open source</span>
    </div>
  </div>
  <div class="bar"></div>
</body>
</html>`;

const GITHUB_SOCIAL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1280px; height: 640px; overflow: hidden; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  body { background: #0d1117; color: #e6edf3; position: relative; display: flex; }
  .bg { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 80% at 0% 100%, {{primary}}12 0%, transparent 50%), radial-gradient(ellipse 50% 60% at 100% 0%, {{secondary}}15 0%, transparent 50%); }
  .bg-dots { position: absolute; inset: 0; background-image: radial-gradient(#e6edf308 1px, transparent 1px); background-size: 24px 24px; }
  .content { position: relative; z-index: 1; flex: 1; display: flex; padding: 56px 72px; gap: 64px; }
  .left { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .gh-badge { display: inline-flex; align-items: center; gap: 8px; background: #21262d; border: 1px solid #30363d; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 500; color: #8b949e; margin-bottom: 28px; width: fit-content; font-family: 'JetBrains Mono', monospace; }
  .gh-badge .gh-icon { width: 18px; height: 18px; border-radius: 50%; background: #e6edf3; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #0d1117; font-weight: 700; }
  .icon-row { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
  .icon { font-size: 44px; line-height: 1; }
  .app-name { font-size: 48px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; color: #e6edf3; }
  .description { font-size: 22px; font-weight: 400; color: #8b949e; line-height: 1.5; margin-bottom: 36px; max-width: 560px; }
  .stats { display: flex; flex-wrap: wrap; gap: 12px; }
  .stat { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: #e6edf3cc; }
  .stat .dot { width: 8px; height: 8px; border-radius: 50%; background: {{primary}}; }
  .right { width: 400px; display: flex; flex-direction: column; justify-content: center; }
  .code-block { background: #161b22; border: 1px solid #30363d; border-radius: 12px; overflow: hidden; }
  .code-titlebar { display: flex; align-items: center; gap: 8px; padding: 14px 18px; background: #1c2129; border-bottom: 1px solid #30363d; }
  .code-dot { width: 12px; height: 12px; border-radius: 50%; background: #30363d; }
  .code-dot:nth-child(1) { background: #f85149; }
  .code-dot:nth-child(2) { background: #d29922; }
  .code-dot:nth-child(3) { background: #3fb950; }
  .code-content { padding: 20px 22px; font-family: 'JetBrains Mono', monospace; font-size: 14px; line-height: 1.7; color: #8b949e; }
  .code-line { display: block; }
  .code-comment { color: #484f58; }
  .code-keyword { color: #ff7b72; }
  .code-string { color: #a5d6ff; }
  .code-primary { color: {{primary}}; }
  .bottom { position: absolute; bottom: 0; left: 0; right: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 16px 72px; border-top: 1px solid #21262d; background: #0d1117ee; }
  .repo-url { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: #58a6ff; font-weight: 500; }
  .license { font-size: 13px; color: #484f58; font-weight: 500; }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="bg-dots"></div>
  <div class="content">
    <div class="left">
      <div class="gh-badge"><span class="gh-icon">◆</span>Public repository</div>
      <div class="icon-row">
        <span class="icon">{{icon}}</span>
        <h1 class="app-name">{{name}}</h1>
      </div>
      <p class="description">{{tagline}}</p>
      <div class="stats">
        <span class="stat"><span class="dot"></span>{{feature_1}}</span>
      </div>
    </div>
    <div class="right">
      <div class="code-block">
        <div class="code-titlebar"><span class="code-dot"></span><span class="code-dot"></span><span class="code-dot"></span></div>
        <div class="code-content">
          <span class="code-line"><span class="code-comment">// {{name}}</span></span>
          <span class="code-line"><span class="code-comment">// {{tagline}}</span></span>
          <span class="code-line">&nbsp;</span>
          <span class="code-line"><span class="code-keyword">const</span> features = [</span>
          <span class="code-line">&nbsp;&nbsp;<span class="code-string">"{{feature_1}}"</span>,</span>
          <span class="code-line">&nbsp;&nbsp;<span class="code-string">"{{feature_2}}"</span>,</span>
          <span class="code-line">&nbsp;&nbsp;<span class="code-string">"{{feature_3}}"</span>,</span>
          <span class="code-line">&nbsp;&nbsp;<span class="code-string">"{{feature_4}}"</span>,</span>
          <span class="code-line">];</span>
        </div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <span class="repo-url">{{url}}</span>
    <span class="license">MIT License · {{year}}</span>
  </div>
</body>
</html>`;

export function generateAssets(config: AssetConfig): GeneratedAsset[] {
  return [
    {
      type: 'og-image',
      label: 'OG Image (1200×630)',
      width: 1200,
      height: 630,
      html: fillTemplate(OG_IMAGE_TEMPLATE, config),
    },
    {
      type: 'social-card',
      label: 'Social Card (1080×1080)',
      width: 1080,
      height: 1080,
      html: fillTemplate(SOCIAL_CARD_TEMPLATE, config),
    },
    {
      type: 'github-social',
      label: 'GitHub Social (1280×640)',
      width: 1280,
      height: 640,
      html: fillTemplate(GITHUB_SOCIAL_TEMPLATE, config),
    },
  ];
}
