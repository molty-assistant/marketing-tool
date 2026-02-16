export type CompositeDevice = 'iphone-15' | 'iphone-15-pro' | 'android';

export interface CompositeScreenshotInput {
  imageUrl?: string;
  imageBase64?: string;
  headline: string;
  subheadline?: string;
  badge?: string;
  device?: CompositeDevice;
  backgroundColor?: string;
  textColor?: string;
  appName?: string;
}

const DEFAULT_BG = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

function normalizeImageSrc(input: { imageUrl?: string; imageBase64?: string }): string {
  if (input.imageBase64) {
    const trimmed = input.imageBase64.trim();
    if (trimmed.startsWith('data:')) return trimmed;
    return `data:image/png;base64,${trimmed}`;
  }
  if (input.imageUrl) return input.imageUrl;
  throw new Error('Either imageUrl or imageBase64 is required');
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function deviceParams(device: CompositeDevice) {
  if (device === 'android') {
    return { frameRadius: 56, border: 10, frameColor: '#101214', screenRadius: 42, cutout: 'punch' as const };
  }
  const pro = device === 'iphone-15-pro';
  return { frameRadius: 68, border: 10, frameColor: pro ? '#0b0b0d' : '#121214', screenRadius: 56, cutout: 'island' as const };
}

export function buildCompositeHtml(input: CompositeScreenshotInput): { html: string; width: number; height: number } {
  const {
    headline, subheadline, badge,
    device = 'iphone-15',
    backgroundColor = DEFAULT_BG,
    textColor = '#ffffff',
    appName,
  } = input;

  if (!headline) throw new Error('headline is required');

  const imgSrc = normalizeImageSrc(input);
  const d = deviceParams(device);
  const W = 1290, H = 2796;
  const devW = 860, devH = 1860;

  const safeHL = esc(headline);
  const safeSub = subheadline ? esc(subheadline) : '';
  const safeBadge = badge ? esc(badge) : '';
  const safeApp = appName ? esc(appName) : '';

  const cutoutHtml = d.cutout === 'island'
    ? `<div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:220px;height:46px;background:${d.frameColor};border-radius:0 0 26px 26px;box-shadow:0 8px 18px rgba(0,0,0,0.35);z-index:10"></div>`
    : `<div style="position:absolute;top:22px;left:50%;transform:translateX(-50%);width:18px;height:18px;border-radius:999px;background:${d.frameColor};z-index:10;box-shadow:0 8px 18px rgba(0,0,0,0.35)"></div>`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:Inter,system-ui,-apple-system,sans-serif;background:${backgroundColor};color:${textColor}}
.c{width:${W}px;height:${H}px;padding:120px 110px;display:flex;flex-direction:column;align-items:center;justify-content:space-between}
.top{width:100%;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center}
.badge{display:inline-flex;align-items:center;padding:10px 16px;border-radius:999px;font-size:26px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(10px)}
.hl{font-size:88px;font-weight:800;line-height:1.05;letter-spacing:-.03em;max-width:1040px;text-shadow:0 10px 30px rgba(0,0,0,.2)}
.sub{font-size:36px;font-weight:500;line-height:1.25;opacity:.88;max-width:980px}
.dw{width:${devW}px;height:${devH}px;display:flex;align-items:center;justify-content:center}
.df{width:${devW}px;height:${devH}px;border-radius:${d.frameRadius}px;background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.02));box-shadow:0 40px 90px rgba(0,0,0,.35),0 12px 30px rgba(0,0,0,.22);border:${d.border}px solid ${d.frameColor};position:relative;padding:16px}
.di{width:100%;height:100%;border-radius:${d.screenRadius}px;overflow:hidden;background:#000;position:relative}
.di img{width:100%;height:100%;object-fit:cover;display:block}
.gl{position:absolute;inset:0;border-radius:${d.screenRadius}px;pointer-events:none;background:radial-gradient(1200px 700px at 30% 0%,rgba(255,255,255,.12),rgba(255,255,255,0) 55%);mix-blend-mode:screen}
.ft{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;opacity:.78;font-size:22px;font-weight:600;letter-spacing:.02em}
</style></head><body>
<div class="c">
  <div class="top">
    ${safeBadge ? `<div class="badge">${safeBadge}</div>` : ''}
    <div class="hl">${safeHL}</div>
    ${safeSub ? `<div class="sub">${safeSub}</div>` : ''}
  </div>
  <div class="dw"><div class="df">
    ${cutoutHtml}
    <div class="di"><img src="${imgSrc}"/><div class="gl"></div></div>
  </div></div>
  <div class="ft">${safeApp ? `<span>${safeApp}</span><span style="opacity:.55">•</span>` : ''}<span>Made with Marketing Tool</span></div>
</div>
</body></html>`;

  return { html, width: W, height: H };
}
