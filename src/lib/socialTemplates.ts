import type { MarketingPlan } from '@/lib/types';

export type SocialPlatform =
  | 'twitter'
  | 'linkedin'
  | 'instagram-post'
  | 'instagram-story'
  | 'facebook-og';

export type SocialStyle = 'gradient' | 'dark' | 'light';
export type SocialVisualMode = 'screenshot' | 'hero' | 'hybrid';

export interface SocialTemplate {
  platform: SocialPlatform;
  label: string;
  width: number;
  height: number;
  filename: string;
  html: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '').trim();
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  const num = Number.parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mix(a: string, b: string, amount: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const t = clamp(amount, 0, 1);
  return rgbToHex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t
  );
}

function safeText(input: unknown, fallback: string) {
  const s = typeof input === 'string' ? input.trim() : '';
  return s || fallback;
}

function pickTop(items: unknown, n: number): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .slice(0, n);
}

function firstScreenshot(plan: MarketingPlan): string | undefined {
  const shots = plan?.scraped?.screenshots;
  if (!Array.isArray(shots) || shots.length === 0) return undefined;
  const s = shots.find((x) => typeof x === 'string' && x.startsWith('http'));
  return s;
}

function socialProof(plan: MarketingPlan): string {
  const rating = plan?.scraped?.rating;
  const count = plan?.scraped?.ratingCount;
  if (typeof rating === 'number' && rating > 0) {
    const rounded = Math.round(rating * 10) / 10;
    if (typeof count === 'number' && count > 0) {
      const pretty = count >= 1000 ? `${Math.round(count / 100) / 10}k` : `${count}`;
      return `★ ${rounded} • ${pretty} reviews`;
    }
    return `★ ${rounded} rating`;
  }
  const pricing = safeText(plan?.config?.pricing, '');
  if (pricing) return pricing;
  const audience = safeText(plan?.config?.target_audience, '');
  if (audience) return `Built for ${audience}`;
  return 'Loved by teams who ship.';
}

function defaultHeadline(plan: MarketingPlan): string {
  // Try to turn the one-liner into a punchy headline.
  const oneLiner = safeText(plan?.config?.one_liner, safeText(plan?.scraped?.shortDescription, ''));
  if (oneLiner) {
    const trimmed = oneLiner.replace(/\s+/g, ' ').trim();
    // If it's long, take first sentence/phrase.
    const cut = trimmed.split(/\.|\n|\r|\!|\?|—|–|:|\|/)[0]?.trim();
    return cut.length <= 64 ? cut : `${cut.slice(0, 61)}…`;
  }
  return `Meet ${safeText(plan?.config?.app_name, safeText(plan?.scraped?.name, 'Your App'))}`;
}

function htmlShell(opts: {
  title: string;
  width: number;
  height: number;
  bg: string;
  text: string;
  accent: string;
  accent2: string;
  body: string;
}) {
  const { title, width, height, bg, text, accent, accent2, body } = opts;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${width}, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root{
        --bg:${bg};
        --text:${text};
        --muted:${mix(text, bg, 0.55)};
        --card:${mix(bg, '#ffffff', 0.06)};
        --border:${mix(bg, '#ffffff', 0.10)};
        --accent:${accent};
        --accent2:${accent2};
        --shadow: 0 18px 45px rgba(0,0,0,0.35);
      }
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:var(--bg);width:${width}px;height:${height}px;overflow:hidden}
      body{font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; color:var(--text);}
      .frame{position:relative;width:${width}px;height:${height}px;}
      .noise{position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.25'/%3E%3C/svg%3E");mix-blend-mode:overlay;opacity:.12;pointer-events:none}
      .glow{position:absolute;inset:-20%;background:radial-gradient(900px 600px at 18% 12%, color-mix(in srgb, var(--accent) 42%, transparent), transparent 70%), radial-gradient(800px 520px at 88% 16%, color-mix(in srgb, var(--accent2) 35%, transparent), transparent 72%), radial-gradient(900px 620px at 60% 92%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%);filter: blur(0px);opacity:.95;}
      .chip{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb, var(--card) 86%, transparent);backdrop-filter: blur(8px);}
      .btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;font-weight:700;border:0;box-shadow: 0 12px 30px color-mix(in srgb, var(--accent) 35%, transparent);}
      .card{background:color-mix(in srgb, var(--card) 92%, transparent);border:1px solid var(--border);border-radius:22px;box-shadow: var(--shadow);}
      .muted{color:var(--muted)}
      .kicker{font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:color-mix(in srgb, var(--accent) 65%, var(--text));}
      .h1{font-size:56px;line-height:1.03;letter-spacing:-0.03em;font-weight:850;}
      .h2{font-size:40px;line-height:1.06;letter-spacing:-0.03em;font-weight:850;}
      .p{font-size:22px;line-height:1.35;}
      .small{font-size:16px;line-height:1.35;}
      img{display:block}
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="glow"></div>
      <div class="noise"></div>
      ${body}
    </div>
  </body>
</html>`;
}

function iconImg(iconUrl?: string, size = 64) {
  const safe = typeof iconUrl === 'string' ? iconUrl : '';
  if (safe.startsWith('http')) {
    return `<img src="${safe}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;border-radius:${Math.round(
      size * 0.28
    )}px;box-shadow:0 12px 30px rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);object-fit:cover" />`;
  }
  // Fallback: lettermark
  return `<div style="width:${size}px;height:${size}px;border-radius:${Math.round(
    size * 0.28
  )}px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${Math.round(
    size * 0.42
  )}px;color:white;box-shadow:0 12px 30px rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.12);">★</div>`;
}

export function generateSocialTemplates(opts: {
  plan: MarketingPlan;
  platforms: SocialPlatform[];
  style: SocialStyle;
  accentColor: string;
  visualMode?: SocialVisualMode;
  bgImageUrl?: string;
  imageBrief?: {
    hook?: string;
    scene?: string;
    subject?: string;
    mood?: string;
    palette?: string;
    composition?: string;
    avoid?: string[];
  } | null;
}): SocialTemplate[] {
  const { plan, platforms, style } = opts;
  const visualMode: SocialVisualMode = opts.visualMode || 'screenshot';
  const imageBrief = opts.imageBrief || null;
  const bgImageUrl = typeof opts.bgImageUrl === 'string' && opts.bgImageUrl.startsWith('http') ? opts.bgImageUrl : undefined;
  const accent = typeof opts.accentColor === 'string' && opts.accentColor.startsWith('#') ? opts.accentColor : '#667eea';
  const accent2 = mix(accent, '#ffffff', 0.22);

  const bg =
    style === 'light'
      ? '#f8fafc'
      : style === 'dark'
        ? '#0b1220'
        : '#070a13';

  const text = style === 'light' ? '#0b1220' : '#e6eaf2';

  const name = safeText(plan?.config?.app_name, safeText(plan?.scraped?.name, 'Your App'));
  const oneLinerRaw = safeText(
    plan?.config?.one_liner,
    safeText(plan?.scraped?.shortDescription, safeText(plan?.scraped?.description, ''))
  );
  // Keep the supporting line punchy; long scraped descriptions break the layout.
  const oneLiner = oneLinerRaw.length > 140 ? `${oneLinerRaw.slice(0, 137).trim()}…` : oneLinerRaw;
  const bullets = pickTop(plan?.config?.differentiators, 3);
  const fallbackBullets = pickTop(plan?.scraped?.features, 3);
  const features = bullets.length ? bullets : fallbackBullets;
  while (features.length < 3) features.push('Fast setup. Clear results. Built for focus.');

  const headline = defaultHeadline(plan);
  const proof = socialProof(plan);
  const screenshot = firstScreenshot(plan);
  const iconUrl = plan?.scraped?.icon || plan?.config?.icon;

  const common = {
    bg,
    text,
    accent,
    accent2,
  };

  const templates: SocialTemplate[] = [];

  for (const platform of platforms) {
    if (platform === 'twitter') {
      const width = 1200;
      const height = 675;

      const body = `
<div style="position:absolute;inset:48px;display:flex;gap:34px;align-items:stretch;">
  <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div class="chip" style="width:fit-content;gap:12px;">
        ${iconImg(iconUrl, 56)}
        <div style="display:flex;flex-direction:column;gap:2px;">
          <div style="font-weight:850;font-size:20px;letter-spacing:-0.02em;">${name}</div>
          <div class="small muted" style="max-width:560px;">${oneLiner}</div>
        </div>
      </div>

      <div style="margin-top:26px;" class="h2">${headline}</div>

      <div style="margin-top:18px;display:grid;gap:12px;">
        ${features
          .slice(0, 3)
          .map(
            (f) => `
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:30px;height:30px;border-radius:10px;background:color-mix(in srgb, var(--accent) 24%, transparent);border:1px solid color-mix(in srgb, var(--accent) 35%, transparent);display:flex;align-items:center;justify-content:center;font-weight:900;">✦</div>
            <div style="font-size:20px;line-height:1.28;">${f}</div>
          </div>`
          )
          .join('')}
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:22px;">
      <div class="chip" style="padding:10px 14px;">
        <div style="width:10px;height:10px;border-radius:999px;background:var(--accent);"></div>
        <div class="small" style="font-weight:650;">${proof}</div>
      </div>
      <div class="btn" style="height:48px;">Try ${name} →</div>
    </div>
  </div>

  <div class="card" style="width:420px;padding:18px;display:flex;flex-direction:column;gap:12px;justify-content:center;">
    <div style="height:100%;border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 20%, transparent),color-mix(in srgb,var(--accent2) 18%, transparent));border:1px solid var(--border);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:-40%;background:radial-gradient(420px 320px at 30% 35%, color-mix(in srgb,var(--accent) 30%, transparent), transparent 70%), radial-gradient(420px 320px at 70% 65%, color-mix(in srgb,var(--accent2) 25%, transparent), transparent 70%);"></div>
      <div style="position:relative;padding:28px;text-align:left;">
        <div class="kicker">${safeText(plan?.config?.category, safeText(plan?.scraped?.category, '')) || 'Productivity'}</div>
        <div style="margin-top:10px;font-size:30px;line-height:1.08;font-weight:850;letter-spacing:-0.03em;">${name} makes it easy to ship.</div>
        <div style="margin-top:12px" class="small muted">${oneLiner}</div>
      </div>
    </div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'Twitter Card',
        width,
        height,
        filename: 'twitter-card.png',
        html: htmlShell({ title: `${name} — Twitter`, width, height, ...common, body }),
      });
      continue;
    }

    if (platform === 'facebook-og') {
      const width = 1200;
      const height = 630;

      const body = `
<div style="position:absolute;inset:44px;display:flex;gap:34px;align-items:stretch;">
  <div style="flex:1.2;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="display:flex;gap:14px;align-items:center;">
        ${iconImg(iconUrl, 62)}
        <div>
          <div style="font-weight:900;font-size:28px;letter-spacing:-0.03em;">${name}</div>
          <div class="muted" style="font-size:18px;max-width:600px;">${oneLiner}</div>
        </div>
      </div>

      <div style="margin-top:22px" class="h2">${headline}</div>

      <div style="margin-top:16px;display:grid;gap:10px;max-width:640px;">
        ${features
          .slice(0, 3)
          .map(
            (f) => `
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="width:28px;height:28px;border-radius:10px;background:color-mix(in srgb, var(--accent) 22%, transparent);border:1px solid color-mix(in srgb, var(--accent) 32%, transparent);display:flex;align-items:center;justify-content:center;font-weight:900;">✦</div>
            <div style="font-size:19px;line-height:1.28;">${f}</div>
          </div>`
          )
          .join('')}
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:12px;">
      <div class="chip"><div class="small" style="font-weight:650;">${proof}</div></div>
      <div class="btn" style="height:46px;">Get started →</div>
    </div>
  </div>

  <div class="card" style="flex:0.8;padding:18px;display:flex;align-items:stretch;">
    <div style="flex:1;border-radius:18px;overflow:hidden;border:1px solid var(--border);background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 22%, transparent),color-mix(in srgb,var(--accent2) 14%, transparent));position:relative;">
      <div style="position:absolute;inset:-40%;background:radial-gradient(520px 360px at 35% 40%, color-mix(in srgb,var(--accent) 30%, transparent), transparent 70%), radial-gradient(520px 360px at 70% 60%, color-mix(in srgb,var(--accent2) 25%, transparent), transparent 70%);"></div>
      <div style="position:relative;height:100%;display:flex;align-items:center;justify-content:center;padding:22px;">
        <div style="width:100%;border-radius:16px;background:color-mix(in srgb, #000 18%, transparent);border:1px solid rgba(255,255,255,0.12);padding:18px;">
          <div style="font-weight:800;font-size:18px;">What you get</div>
          <div style="margin-top:10px;display:grid;gap:10px;">
            ${features
              .slice(0, 3)
              .map(
                (f) => `<div style="display:flex;gap:10px;align-items:flex-start;"><div style="margin-top:4px;width:8px;height:8px;border-radius:99px;background:var(--accent);"></div><div class="small">${f}</div></div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'Facebook OG',
        width,
        height,
        filename: 'facebook-og.png',
        html: htmlShell({ title: `${name} — Facebook OG`, width, height, ...common, body }),
      });
      continue;
    }

    if (platform === 'linkedin') {
      const width = 1200;
      const height = 627;

      const screenshotBlock = screenshot
        ? `
        <div style="height:100%;border-radius:18px;overflow:hidden;border:1px solid var(--border);box-shadow:0 18px 40px rgba(0,0,0,0.25);background:rgba(0,0,0,0.2);">
          <img src="${screenshot}" style="width:100%;height:100%;object-fit:cover;" />
        </div>`
        : `
        <div style="height:100%;border-radius:18px;border:1px solid var(--border);background:color-mix(in srgb, var(--card) 88%, transparent);padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          ${features
            .slice(0, 4)
            .map(
              (f) => `
            <div style="border-radius:16px;border:1px solid var(--border);background:color-mix(in srgb, #000 14%, transparent);padding:14px;">
              <div style="font-weight:850;">✦</div>
              <div class="small" style="margin-top:8px;">${f}</div>
            </div>`
            )
            .join('')}
        </div>`;

      const body = `
<div style="position:absolute;inset:46px;display:grid;grid-template-columns: 1.05fr 0.95fr;gap:28px;align-items:stretch;">
  <div style="display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="display:flex;align-items:center;gap:14px;">
        ${iconImg(iconUrl, 58)}
        <div>
          <div class="kicker">${safeText(plan?.config?.category, safeText(plan?.scraped?.category, '')) || 'Software'}</div>
          <div style="font-weight:900;font-size:28px;letter-spacing:-0.03em;">${name}</div>
        </div>
      </div>

      <div style="margin-top:18px" class="h2">${headline}</div>
      <div style="margin-top:10px" class="p muted">${oneLiner}</div>

      <div style="margin-top:18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <div class="chip" style="padding:10px 14px;">
          <div style="width:10px;height:10px;border-radius:999px;background:var(--accent);"></div>
          <div class="small" style="font-weight:650;">${proof}</div>
        </div>
        <div class="chip" style="padding:10px 14px;">
          <div class="small" style="font-weight:650;">${safeText(plan?.config?.pricing, 'Fast to try. Easy to adopt.')}</div>
        </div>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;">
      <div class="small muted">${safeText(plan?.scraped?.developer, '')}</div>
      <div class="btn" style="height:48px;">Request a demo →</div>
    </div>
  </div>

  <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:12px;">
    <div style="font-weight:850;font-size:16px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)">Preview</div>
    <div style="flex:1;">${screenshotBlock}</div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'LinkedIn Post',
        width,
        height,
        filename: 'linkedin-post.png',
        html: htmlShell({ title: `${name} — LinkedIn`, width, height, ...common, body }),
      });
      continue;
    }

    if (platform === 'instagram-post') {
      const width = 1080;
      const height = 1080;

      const category = safeText(plan?.config?.category, safeText(plan?.scraped?.category, '')).toLowerCase();
      const vibeIcon = category.includes('photo')
        ? '📍'
        : category.includes('travel')
          ? '🧭'
          : category.includes('fitness')
            ? '⚡'
            : '✨';

      const hook = safeText(imageBrief?.hook, headline);
      const scene = safeText(imageBrief?.scene, safeText(plan?.config?.category, '')); 

      const heroVisual = `
<div style="width:100%;height:100%;border-radius:28px;position:relative;overflow:hidden;border:1px solid var(--border);background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, #000 30%, transparent));">
  ${bgImageUrl ? `<img src="${bgImageUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />` : ''}
  ${bgImageUrl ? '' : `<div style="position:absolute;inset:-30%;background:radial-gradient(520px 420px at 30% 30%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%), radial-gradient(520px 420px at 70% 70%, color-mix(in srgb, var(--accent2) 45%, transparent), transparent 72%);filter: blur(0px);opacity:0.95;"></div>`}
  <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.62));"></div>

  <div style="position:absolute;left:26px;top:26px;display:flex;flex-direction:column;gap:10px;max-width:680px;">
    <div class="chip" style="padding:10px 14px;gap:10px;">
      <div style="font-size:18px;">${vibeIcon}</div>
      <div class="small" style="font-weight:800;">${scene || 'In the wild'}</div>
    </div>
    <div style="font-size:48px;line-height:1.02;font-weight:950;letter-spacing:-0.04em;">${hook}</div>
    <div class="small muted" style="max-width:560px;">${safeText(imageBrief?.mood, oneLiner)}</div>
  </div>

  ${bgImageUrl ? '' : `<div style="position:absolute;right:24px;bottom:22px;display:flex;gap:12px;align-items:flex-end;">
    <div style="width:220px;height:220px;border-radius:26px;background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.10);backdrop-filter: blur(10px);display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <div style="font-size:90px;opacity:0.95;">🌅</div>
    </div>
    <div style="width:160px;height:160px;border-radius:26px;background:rgba(0,0,0,0.18);border:1px solid rgba(255,255,255,0.10);backdrop-filter: blur(10px);display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <div style="font-size:74px;opacity:0.95;">📷</div>
    </div>
  </div>`}
</div>`;

      const screenshotVisual = screenshot
        ? `<img src="${screenshot}" style="width:100%;height:100%;object-fit:cover;transform:scale(1.12);border-radius:28px;" />`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${iconImg(
            iconUrl,
            220
          )}</div>`;

      const mainVisual =
        visualMode === 'hero'
          ? heroVisual
          : visualMode === 'hybrid'
            ? `<div style="position:relative;width:100%;height:100%;">
                ${heroVisual}
                <div style="position:absolute;left:26px;bottom:26px;width:420px;height:260px;border-radius:26px;overflow:hidden;border:1px solid rgba(255,255,255,0.14);box-shadow:0 18px 45px rgba(0,0,0,0.35);background:rgba(0,0,0,0.18);">
                  ${screenshotVisual}
                </div>
              </div>`
            : screenshotVisual;

      const body = `
<div style="position:absolute;inset:50px;display:flex;flex-direction:column;gap:22px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div class="chip" style="padding:10px 14px;gap:10px;">
      ${iconImg(iconUrl, 46)}
      <div style="font-weight:900;letter-spacing:-0.02em;">${name}</div>
    </div>
    <div class="chip"><div class="small" style="font-weight:700;">${proof}</div></div>
  </div>

  <div class="card" style="flex:1;padding:18px;overflow:hidden;position:relative;">
    <div style="position:absolute;inset:0;background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 28%, transparent), transparent 55%), linear-gradient(225deg, color-mix(in srgb, var(--accent2) 22%, transparent), transparent 60%);"></div>
    <div style="position:relative;height:100%;display:grid;grid-template-rows:auto 1fr auto;gap:14px;">
      <div>
        <div class="h2" style="font-size:52px;">${headline}</div>
        <div class="p muted" style="margin-top:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-height:60px;">${oneLiner}</div>
      </div>

      <div style="border-radius:28px;overflow:hidden;border:1px solid var(--border);box-shadow:0 18px 40px rgba(0,0,0,0.28);background:rgba(0,0,0,0.18);">${mainVisual}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        ${features
          .slice(0, 3)
          .map(
            (f) => `
          <div style="border-radius:18px;border:1px solid var(--border);background:color-mix(in srgb, var(--card) 85%, transparent);padding:14px;">
            <div style="font-weight:900;">✦</div>
            <div class="small" style="margin-top:8px;">${f}</div>
          </div>`
          )
          .join('')}
      </div>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div class="small muted">@${name.replace(/\s+/g, '').toLowerCase()}</div>
    <div class="btn" style="height:46px;">Get it today →</div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'Instagram Post',
        width,
        height,
        filename: 'instagram-post.png',
        html: htmlShell({ title: `${name} — Instagram Post`, width, height, ...common, body }),
      });
      continue;
    }

    if (platform === 'instagram-story') {
      const width = 1080;
      const height = 1920;

      const body = `
<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:76px 64px;">
  <div>
    <div style="display:flex;align-items:center;gap:16px;">
      ${iconImg(iconUrl, 74)}
      <div>
        <div class="kicker">${safeText(plan?.config?.category, safeText(plan?.scraped?.category, '')) || 'New'}</div>
        <div style="font-weight:950;font-size:38px;letter-spacing:-0.03em;">${name}</div>
      </div>
    </div>

    <div style="margin-top:28px" class="h1" >${headline}</div>
    <div style="margin-top:14px" class="p muted">${oneLiner}</div>

    <div style="margin-top:34px;display:grid;gap:14px;">
      ${features
        .slice(0, 3)
        .map(
          (f) => `
        <div class="card" style="padding:18px 18px;border-radius:22px;display:flex;gap:14px;align-items:flex-start;">
          <div style="width:38px;height:38px;border-radius:14px;background:color-mix(in srgb, var(--accent) 22%, transparent);border:1px solid color-mix(in srgb, var(--accent) 34%, transparent);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;">✦</div>
          <div style="font-size:22px;line-height:1.25;font-weight:650;">${f}</div>
        </div>`
        )
        .join('')}
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:14px;">
    <div class="chip" style="justify-content:space-between;padding:14px 18px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:10px;height:10px;border-radius:999px;background:var(--accent);"></div>
        <div class="small" style="font-weight:700;">${proof}</div>
      </div>
      <div class="small muted">Tap to learn more</div>
    </div>
    <div class="btn" style="height:56px;font-size:18px;border-radius:18px;">Swipe up →</div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'Instagram Story',
        width,
        height,
        filename: 'instagram-story.png',
        html: htmlShell({ title: `${name} — Instagram Story`, width, height, ...common, body }),
      });
      continue;
    }
  }

  return templates;
}
