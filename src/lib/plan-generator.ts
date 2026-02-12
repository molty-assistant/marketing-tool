import { AppConfig, MarketingPlan, ScrapedApp } from './types';

// ─── App Type Profiles ───

const APP_TYPE_PROFILES: Record<string, {
  label: string;
  voice: string;
  distribution_strengths: string[];
  privacy_angle: string;
  speed_angle: string;
  trust_signals: string[];
  cta_style: string;
  seo_relevant: boolean;
  appstore_relevant: boolean;
}> = {
  web: {
    label: 'Web Tool / Web App',
    voice: 'Practical, direct. "Here\'s a tool. It does X. Try it." No fluff.',
    distribution_strengths: ['reddit', 'hackernews', 'producthunt', 'twitter'],
    privacy_angle: 'Runs in your browser — no server, no account, no data collection.',
    speed_angle: 'Open the link, use it immediately. No install, no signup.',
    trust_signals: ['Open source (if applicable)', 'Client-side processing', 'No tracking/analytics'],
    cta_style: 'Direct link — "Try it: [URL]"',
    seo_relevant: true,
    appstore_relevant: false,
  },
  mobile: {
    label: 'Mobile App',
    voice: 'Friendly, benefit-focused. Show the experience, not the tech stack.',
    distribution_strengths: ['appstore', 'producthunt', 'twitter', 'instagram', 'tiktok'],
    privacy_angle: 'Your data stays on your device. No cloud sync unless you opt in.',
    speed_angle: 'Download → open → using it in under a minute.',
    trust_signals: ['App Store reviews', 'Privacy nutrition label', 'No unnecessary permissions'],
    cta_style: 'App Store link with badge',
    seo_relevant: false,
    appstore_relevant: true,
  },
  saas: {
    label: 'SaaS Platform',
    voice: 'Professional but human. Show outcomes, not features. Avoid enterprise-speak.',
    distribution_strengths: ['linkedin', 'twitter', 'producthunt', 'hackernews'],
    privacy_angle: 'SOC 2 compliant / GDPR-ready / data encrypted at rest and in transit.',
    speed_angle: 'Free tier gets you started in minutes. No credit card required.',
    trust_signals: ['Customer count/logos', 'Uptime SLA', 'Security certifications'],
    cta_style: '"Start free" or "Try the free tier"',
    seo_relevant: true,
    appstore_relevant: false,
  },
  desktop: {
    label: 'Desktop Application',
    voice: 'Power-user friendly. Emphasise performance, native feel, offline capability.',
    distribution_strengths: ['hackernews', 'reddit', 'producthunt'],
    privacy_angle: 'Runs entirely on your machine. No cloud, no telemetry.',
    speed_angle: 'Install once, runs natively. No browser overhead.',
    trust_signals: ['Open source', 'Code-signed binaries', 'No auto-update phoning home'],
    cta_style: 'Download link with OS badges',
    seo_relevant: true,
    appstore_relevant: false,
  },
  cli: {
    label: 'CLI Tool',
    voice: 'Technical, terse, respectful of the reader\'s time. Show commands, not paragraphs.',
    distribution_strengths: ['hackernews', 'reddit', 'twitter'],
    privacy_angle: 'Runs locally. Reads nothing it shouldn\'t. Check the source.',
    speed_angle: '`brew install X` or `npx X` — using it in 30 seconds.',
    trust_signals: ['Open source', 'Minimal dependencies', 'Unix philosophy'],
    cta_style: 'Installation one-liner: `npm install -g X`',
    seo_relevant: false,
    appstore_relevant: false,
  },
  api: {
    label: 'API / Developer Tool',
    voice: 'Developer-to-developer. Show code examples. Respect their time.',
    distribution_strengths: ['hackernews', 'reddit', 'twitter', 'producthunt'],
    privacy_angle: 'Your data is yours. We process and forget. Read our DPA.',
    speed_angle: 'First API call in under 5 minutes. Generous free tier.',
    trust_signals: ['Uptime', 'Latency numbers', 'Transparent pricing', 'Open API spec'],
    cta_style: 'Docs link + "Get your API key"',
    seo_relevant: true,
    appstore_relevant: false,
  },
  'browser-extension': {
    label: 'Browser Extension',
    voice: 'Casual, show-don\'t-tell. Screenshots/GIFs are everything.',
    distribution_strengths: ['reddit', 'producthunt', 'twitter'],
    privacy_angle: 'Minimal permissions. We only access what we need. Read the manifest.',
    speed_angle: 'Install from Chrome Web Store → works immediately on the next page you visit.',
    trust_signals: ['Minimal permissions', 'Open source', 'Chrome Web Store reviews'],
    cta_style: 'Chrome Web Store link with badge',
    seo_relevant: false,
    appstore_relevant: false,
  },
};

function getProfile(appType: string) {
  const key = (appType || 'web').toLowerCase().replace(/\s+/g, '-');
  return APP_TYPE_PROFILES[key] || APP_TYPE_PROFILES.web;
}

// ─── Subreddit Mapping ───

const SUBREDDIT_MAP: Record<string, string[]> = {
  '3d printing': ['r/3Dprinting', 'r/functionalprint', 'r/prusa3d', 'r/ender3'],
  'gridfinity': ['r/gridfinity', 'r/3Dprinting', 'r/functionalprint'],
  'productivity': ['r/productivity', 'r/getdisciplined', 'r/selfimprovement'],
  'developer tool': ['r/programming', 'r/webdev', 'r/javascript', 'r/devtools'],
  'design': ['r/web_design', 'r/graphic_design', 'r/UI_Design'],
  'finance': ['r/personalfinance', 'r/FinancialPlanning'],
  'music': ['r/WeAreTheMusicMakers', 'r/musicproduction', 'r/audiophile'],
  'gaming': ['r/indiegaming', 'r/gamedev', 'r/gaming'],
  'ai': ['r/artificial', 'r/MachineLearning', 'r/LocalLLaMA'],
  'privacy': ['r/privacy', 'r/selfhosted', 'r/degoogle'],
  'photo': ['r/photography', 'r/photocritique', 'r/postprocessing'],
  'video': ['r/VideoEditing', 'r/videography', 'r/Filmmakers'],
  'education': ['r/learnprogramming', 'r/education'],
  'health': ['r/QuantifiedSelf', 'r/fitness', 'r/running'],
  'marketing': ['r/marketing', 'r/digital_marketing', 'r/SEO'],
  'startup': ['r/startups', 'r/SideProject', 'r/Entrepreneur'],
  'mobile': ['r/androidapps', 'r/iOSProgramming', 'r/AppBusiness'],
  'automation': ['r/automation', 'r/homeautomation'],
  'sleep': ['r/sleep', 'r/insomnia', 'r/DSPD'],
  'wellness': ['r/selfimprovement', 'r/Meditation', 'r/yoga'],
  'sound': ['r/WeAreTheMusicMakers', 'r/audiophile', 'r/ambientmusic'],
  'focus': ['r/productivity', 'r/ADHD', 'r/GetStudying'],
};

function findSubreddits(category: string, appName: string): string[] {
  const combined = `${category} ${appName}`.toLowerCase();
  const matched = new Set<string>();

  for (const [keyword, subs] of Object.entries(SUBREDDIT_MAP)) {
    if (combined.includes(keyword)) {
      subs.forEach(s => matched.add(s));
    }
  }

  matched.add('r/SideProject');

  if (matched.size <= 1) {
    const words = combined.split(/[\s/,]+/);
    for (const word of words) {
      for (const [keyword, subs] of Object.entries(SUBREDDIT_MAP)) {
        if (keyword.includes(word) || word.includes(keyword.split(' ')[0])) {
          subs.forEach(s => matched.add(s));
        }
      }
    }
  }

  return Array.from(matched);
}

// ─── Keyword Generation ───

function generateKeywords(config: AppConfig) {
  const name = config.app_name.toLowerCase();
  const category = config.category.toLowerCase();

  const primary = [name];
  const secondary: string[] = [];
  const longTail: string[] = [];

  secondary.push(`${category} online`, `free ${category}`, `best ${category}`);

  const oneLiner = config.one_liner.toLowerCase();
  const actionVerbs = ['add', 'create', 'generate', 'convert', 'build', 'make', 'edit', 'mix', 'manage', 'track', 'plan', 'design', 'analyse', 'analyze', 'record', 'share', 'organize', 'automate', 'monitor', 'compare'];
  for (const verb of actionVerbs) {
    if (oneLiner.includes(verb)) {
      const match = oneLiner.match(new RegExp(`${verb}\\s+([\\w\\s-]+?)(?:\\s+(?:in|to|for|with|from|on|—|\\.|,|$))`, 'i'));
      if (match) {
        secondary.push(`${verb} ${match[1].trim()}`);
        longTail.push(`how to ${verb} ${match[1].trim()}`);
      }
    }
  }

  if (config.app_type === 'web') {
    secondary.push(`${name} online`, `${category} browser`);
    longTail.push(`${category} no install`, `${category} no download`);
  } else if (config.app_type === 'mobile') {
    secondary.push(`${name} app`, `${category} app`);
    longTail.push(`best ${category} app`, `${category} app free`);
  }

  for (const comp of config.competitors) {
    const compName = comp.split(/[([]/)[0].trim();
    if (compName.length < 40) {
      longTail.push(`${compName} alternative`);
    }
  }

  if (config.pricing.toLowerCase().includes('free')) {
    secondary.push(`${category} free`, `free ${name}`);
  }

  const dedup = (arr: string[]) => [...new Set(arr)];
  return { primary: dedup(primary), secondary: dedup(secondary), longTail: dedup(longTail) };
}

// ─── Conjugation ───

function conjugateForThirdPerson(phrase: string): string {
  const words = phrase.split(/\s+/);
  if (words.length === 0) return phrase;
  const verb = words[0].toLowerCase();
  
  // Don't conjugate adverbs/negatives — find the actual verb
  const skipWords = ['never', 'always', 'easily', 'quickly', 'automatically', 'instantly', 'simply', 'just'];
  if (skipWords.includes(verb)) {
    // Conjugate the second word instead
    if (words.length < 2) return phrase;
    const actualVerb = words[1].toLowerCase();
    const irregulars: Record<string, string> = { 'do': 'does', 'go': 'goes', 'have': 'has' };
    if (irregulars[actualVerb]) { words[1] = irregulars[actualVerb]; return words.join(' '); }
    if (actualVerb.endsWith('s') && !actualVerb.endsWith('ss')) return phrase;
    if (actualVerb.endsWith('y') && !/[aeiou]y$/i.test(actualVerb)) { words[1] = actualVerb.slice(0, -1) + 'ies'; }
    else if (actualVerb.endsWith('sh') || actualVerb.endsWith('ch') || actualVerb.endsWith('x') || actualVerb.endsWith('z') || actualVerb.endsWith('ss') || actualVerb.endsWith('o')) { words[1] = actualVerb + 'es'; }
    else { words[1] = actualVerb + 's'; }
    return words.join(' ');
  }
  
  const irregulars: Record<string, string> = { 'do': 'does', 'go': 'goes', 'have': 'has' };
  if (irregulars[verb]) { words[0] = irregulars[verb]; return words.join(' '); }
  if (verb.endsWith('s') && !verb.endsWith('ss')) return phrase;
  if (verb.endsWith('y') && !/[aeiou]y$/i.test(verb)) { words[0] = verb.slice(0, -1) + 'ies'; }
  else if (verb.endsWith('sh') || verb.endsWith('ch') || verb.endsWith('x') || verb.endsWith('z') || verb.endsWith('ss') || verb.endsWith('o')) { words[0] = verb + 'es'; }
  else { words[0] = verb + 's'; }
  return words.join(' ');
}

// ─── Channel Guides ───

const CHANNEL_GUIDES: Record<string, { name: string; bestTime: string; tone: string; format: string; tips: string[] }> = {
  reddit: { name: 'Reddit', bestTime: 'Weekday mornings 8-11am EST', tone: 'Authentic, maker/community. No marketing-speak.', format: 'Text post: problem→solution→link→ask.', tips: ['Lead with the problem', 'Include technical details', 'Ask a genuine question', 'Reply to every comment', 'Space posts 2-3 days apart'] },
  hackernews: { name: 'Hacker News', bestTime: 'Weekday 8-11am EST', tone: 'Technical, concise. Architecture over features.', format: '"Show HN: [Name] – [One-liner]"', tips: ['2-3 paragraph body max', 'Link source code if open source', 'Reply thoughtfully, not defensively', 'No superlatives or marketing language'] },
  producthunt: { name: 'Product Hunt', bestTime: 'Tue-Thu, 12:01am PT', tone: 'Enthusiastic but genuine.', format: 'Tagline (60 chars) + description (260 chars) + 5 images.', tips: ['5+ gallery images', 'Line up supporters for first hour', 'Maker comment tells the story', 'Respond to every comment'] },
  twitter: { name: 'Twitter / X', bestTime: 'Weekdays 8am-12pm', tone: 'Punchy, visual. Thread format.', format: 'Hook → 3-5 expanding tweets → CTA.', tips: ['Hook in first tweet', 'Use GIFs/screenshots', 'Thread format for launches', 'Follow up with behind-the-scenes'] },
  linkedin: { name: 'LinkedIn', bestTime: 'Tue-Thu, 7-9am', tone: 'Professional but personal. Learnings angle.', format: 'Hook → story → 3 learnings → link → hashtags.', tips: ['Lead with personal insight', '"What I learned building X"', 'Line breaks generously', '3-5 relevant hashtags'] },
  appstore: { name: 'App Store / Google Play', bestTime: 'Always live', tone: 'Benefit-focused, scannable.', format: 'Short desc (80 chars) + full desc (4000 chars) + screenshots.', tips: ['First line must sell', 'Keywords in title for ASO', 'Screenshots tell a story', 'Localise for top markets'] },
};

// ─── Brief Generation ───

export function generateMarketingPlan(config: AppConfig, scraped: ScrapedApp): MarketingPlan {
  const profile = getProfile(config.app_type);
  const keywords = generateKeywords(config);
  const subreddits = findSubreddits(config.category, config.app_name);
  const channels = config.distribution_channels.map(c => c.toLowerCase());
  const today = new Date().toISOString().split('T')[0];
  const isFree = config.pricing.toLowerCase().includes('free');
  const id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // --- STAGE 1: RESEARCH ---
  const researchLines: string[] = [];
  researchLines.push('## Stage 1: Research');
  researchLines.push('');
  researchLines.push('### Market Landscape');
  researchLines.push('');
  researchLines.push(`**App:** ${config.app_name}`);
  researchLines.push(`**Category:** ${config.category}`);
  researchLines.push(`**Type:** ${profile.label}`);
  researchLines.push(`**Pricing:** ${config.pricing}`);
  if (scraped.rating) researchLines.push(`**Rating:** ${scraped.rating}★ (${scraped.ratingCount?.toLocaleString() || 'N/A'} reviews)`);
  if (scraped.developer) researchLines.push(`**Developer:** ${scraped.developer}`);
  researchLines.push('');
  researchLines.push('### Key Features Identified');
  researchLines.push('');
  for (const f of config.differentiators.slice(0, 8)) {
    researchLines.push(`- ${f}`);
  }
  researchLines.push('');
  researchLines.push('### Competitor Research Prompts');
  researchLines.push('');
  researchLines.push(`- Search: "${config.category}" — who are the existing players?`);
  researchLines.push(`- Search: "${config.app_name}" — does anyone else use this name?`);
  for (const comp of config.competitors) {
    researchLines.push(`- Research: "${comp}" — features, pricing, limitations`);
  }
  researchLines.push(`- Search: "${config.target_audience} tools" — what else do they use?`);
  researchLines.push('');
  researchLines.push('### Customer Language Sources');
  researchLines.push('');
  for (const sub of subreddits.slice(0, 5)) {
    researchLines.push(`- ${sub} — search for "${config.category}"`);
  }
  researchLines.push(`- Twitter/X — search: "${config.category}" OR "${config.app_name.toLowerCase()}"`);

  // --- STAGE 2: FOUNDATION ---
  const foundationLines: string[] = [];
  foundationLines.push('## Stage 2: Foundation');
  foundationLines.push('');
  foundationLines.push('### Brand Voice');
  foundationLines.push('');
  foundationLines.push(`**Voice:** ${profile.voice}`);
  foundationLines.push(`**Privacy:** ${profile.privacy_angle}`);
  foundationLines.push(`**CTA Style:** ${profile.cta_style}`);
  foundationLines.push('');

  foundationLines.push('### Positioning Angles');
  foundationLines.push('');

  // Angle 1: The Missing Tool
  const compNames = config.competitors.map(c => c.split(/[([]/)[0].trim()).join(', ');
  foundationLines.push('#### 1. The Missing Tool (PRIMARY)');
  foundationLines.push('');
  foundationLines.push(`> "Every ${config.category}${compNames ? ` (${compNames})` : ''} does X. ${config.app_name} does Y."`);
  foundationLines.push('');
  foundationLines.push(`**Hook:** "${config.differentiators[0] || config.one_liner}"`);
  foundationLines.push(`**Best for:** Reddit (niche subs), Hacker News`);
  foundationLines.push('');

  // Angle 2: No-Barrier
  const isWeb = config.app_type === 'web';
  const barrier = isWeb ? 'installing software' : config.app_type === 'mobile' ? 'complex setup' : 'complex setup';
  foundationLines.push('#### 2. The No-Barrier Solution');
  foundationLines.push('');
  foundationLines.push(`> "${config.one_liner} — no ${barrier} needed"`);
  foundationLines.push(`**Best for:** Reddit (broad subs), Product Hunt, general audiences`);
  foundationLines.push('');

  // Angle 3: Privacy/Trust
  foundationLines.push('#### 3. The Privacy / Trust Play');
  foundationLines.push('');
  foundationLines.push(`> "${profile.privacy_angle}"`);
  foundationLines.push(`**Best for:** Hacker News, privacy-conscious communities`);
  foundationLines.push('');

  // Angle 4: Speed
  const speedClaim = isWeb
    ? 'Open the link, use it immediately. No install, no account.'
    : config.app_type === 'mobile'
    ? 'Download, open, start using. Under a minute.'
    : config.app_type === 'cli'
    ? 'One command to install. Using it in 30 seconds.'
    : 'Up and running in minutes. No complex setup.';
  foundationLines.push('#### 4. The Speed Play');
  foundationLines.push('');
  foundationLines.push(`> "${speedClaim}"`);
  foundationLines.push(`**Best for:** Twitter/X, Product Hunt, landing pages`);
  foundationLines.push('');

  // Angle 5: Anti-positioning
  foundationLines.push('### Anti-Positioning');
  foundationLines.push('');
  foundationLines.push(`What ${config.app_name} is **NOT**:`);
  if (config.competitors.length > 0) {
    const firstComp = config.competitors[0].split(/[([]/)[0].trim();
    foundationLines.push(`- NOT a ${firstComp} replacement (different approach)`);
  }
  foundationLines.push('- NOT trying to be everything (does ONE thing well)');
  if (isFree) {
    foundationLines.push('- NOT enterprise software (no account, no subscription)');
  }

  // --- STAGE 3: STRUCTURE ---
  const structureLines: string[] = [];
  structureLines.push('## Stage 3: Structure');
  structureLines.push('');

  if (profile.seo_relevant) {
    structureLines.push('### SEO Keywords');
    structureLines.push('');
    structureLines.push('**Primary:** ' + keywords.primary.map(k => `"${k}"`).join(', '));
    structureLines.push('');
    structureLines.push('**Secondary:** ' + keywords.secondary.map(k => `"${k}"`).join(', '));
    structureLines.push('');
    structureLines.push('**Long-tail:** ' + keywords.longTail.map(k => `"${k}"`).join(', '));
    structureLines.push('');
    structureLines.push('### Meta Tags');
    structureLines.push('');
    structureLines.push(`- **Title:** "${config.app_name} — ${config.one_liner}${isFree ? ' | Free' : ''}"`);
    structureLines.push(`- **Description:** "${config.one_liner}. ${config.differentiators.slice(0, 2).join('. ')}.${isFree ? ' Free, no install.' : ''}"`);
    structureLines.push('');
  }

  structureLines.push('### Content Pillars');
  structureLines.push('');
  structureLines.push(`1. **Problem → Solution** — Why ${config.app_name} exists`);
  structureLines.push(`2. **How-To / Tutorial** — Getting started guides`);
  structureLines.push(`3. **Behind the Build** — Dev process, decisions, learnings`);
  structureLines.push(`4. **Community** — User stories, feedback, improvements`);
  structureLines.push('');

  structureLines.push('### Distribution Channels');
  structureLines.push('');
  if (channels.includes('reddit') && subreddits.length > 0) {
    structureLines.push('**Reddit:**');
    for (const sub of subreddits) {
      structureLines.push(`- ${sub}`);
    }
    structureLines.push('');
  }
  for (const ch of channels) {
    if (ch !== 'reddit' && CHANNEL_GUIDES[ch]) {
      structureLines.push(`**${CHANNEL_GUIDES[ch].name}:** ${CHANNEL_GUIDES[ch].tone}`);
    }
  }
  structureLines.push('');
  structureLines.push('### Quick Wins (60-90 days)');
  structureLines.push('');
  structureLines.push('1. Post to primary subreddit with authentic "I built this" framing');
  structureLines.push('2. Submit Show HN with technical angle');
  structureLines.push('3. LinkedIn learnings post for professional network');
  structureLines.push('4. Engage genuinely in 3-5 community threads per week');
  structureLines.push('5. Gather feedback, iterate, post update');

  // --- STAGE 4: ASSETS (COPY) ---
  const assetsLines: string[] = [];
  assetsLines.push('## Stage 4: Copy Templates');
  assetsLines.push('');

  // Reddit post
  if (channels.includes('reddit') && subreddits.length > 0) {
    const typeLabel = isWeb ? 'browser tool' : config.app_type === 'mobile' ? 'app' : config.app_type === 'cli' ? 'CLI tool' : 'tool';
    const titlePhrase = config.one_liner.replace(/\s*[—–]\s*.+$/, '').replace(/^[A-Z]/, m => m.toLowerCase());

    assetsLines.push(`### Reddit: ${subreddits[0]} (Primary)`);
    assetsLines.push('');
    assetsLines.push(`**Title:** I built a free ${typeLabel} that ${conjugateForThirdPerson(titlePhrase)}`);
    assetsLines.push('');
    assetsLines.push('**Body:**');
    assetsLines.push('');
    assetsLines.push('[2-3 sentences about the problem you personally experienced]');
    assetsLines.push('');
    assetsLines.push(`So I built a tool that does it automatically:`);
    assetsLines.push('');
    assetsLines.push(`**→ [${config.app_name}](${config.app_url})**`);
    assetsLines.push('');
    assetsLines.push('**What it does:**');
    for (const d of config.differentiators.slice(0, 5)) {
      assetsLines.push(`- ${d}`);
    }
    assetsLines.push('');
    if (isWeb) assetsLines.push('Everything runs in your browser — files never get uploaded anywhere.');
    assetsLines.push('');
    assetsLines.push('Would love feedback from anyone who tries it. What\'s missing?');
    assetsLines.push('');

    if (subreddits.length > 1) {
      assetsLines.push(`### Reddit: ${subreddits[1]} (Secondary)`);
      assetsLines.push('');
      assetsLines.push(`**Title:** Free ${typeLabel} to ${titlePhrase}`);
      assetsLines.push('');
      assetsLines.push('**Body:**');
      assetsLines.push('');
      assetsLines.push(`Made a ${isWeb ? 'browser ' : ''}tool for ${titlePhrase}. ${config.differentiators.slice(0, 3).join('. ')}.`);
      assetsLines.push('');
      assetsLines.push(config.app_url);
      assetsLines.push('');
    }
  }

  // Show HN
  if (channels.includes('hackernews')) {
    const hnPhrase = config.one_liner.replace(/\s*[—–]\s*in your browser\s*$/i, '');
    assetsLines.push('### Show HN');
    assetsLines.push('');
    assetsLines.push(`**Title:** Show HN: ${config.app_name} – ${hnPhrase}`);
    assetsLines.push('');
    assetsLines.push(`I built a ${isWeb ? 'browser-based ' : ''}tool that ${conjugateForThirdPerson(config.one_liner.replace(/\s*[—–].+$/, '').replace(/^[A-Z]/, m => m.toLowerCase()))}.`);
    assetsLines.push('');
    assetsLines.push('[Tech stack, approach, interesting decisions. 2-3 paragraphs max.]');
    assetsLines.push('');
    assetsLines.push(`Live: ${config.app_url}`);
    assetsLines.push('');
  }

  // LinkedIn
  if (channels.includes('linkedin')) {
    assetsLines.push('### LinkedIn Post');
    assetsLines.push('');
    assetsLines.push(`I built a tool that ${conjugateForThirdPerson(config.one_liner.replace(/\s*[—–].+$/, '').replace(/^[A-Z]/, m => m.toLowerCase()))}. ${isFree ? 'Free, no account needed.' : ''}`);
    assetsLines.push('');
    assetsLines.push('What I learned building this:');
    assetsLines.push('1. Niche tools can be genuinely useful. Not everything needs to be a platform.');
    assetsLines.push('2. Simplicity wins. Do one thing well rather than many things poorly.');
    assetsLines.push(`3. Understanding your user matters more than features.`);
    assetsLines.push('');
    assetsLines.push(`Try it: ${config.app_url}`);
    assetsLines.push('');
    assetsLines.push('#buildinpublic #sideproject #productdevelopment');
    assetsLines.push('');
  }

  // Twitter
  if (channels.includes('twitter')) {
    assetsLines.push('### Twitter Thread');
    assetsLines.push('');
    assetsLines.push(`**Tweet 1:** ${config.one_liner}${isFree ? ' Free.' : ''} ${isWeb ? 'No install. Runs in your browser.' : ''}`);
    assetsLines.push('');
    assetsLines.push(`${config.app_url}`);
    assetsLines.push('');
    assetsLines.push('**Tweet 2:** [The problem in 1-2 sentences]');
    assetsLines.push('');
    assetsLines.push('**Tweet 3:** [How it works — with screenshot/GIF]');
    assetsLines.push('');
    assetsLines.push(`**Tweet 4:** Try it → ${config.app_url} — Feedback welcome!`);
    assetsLines.push('');
  }

  // Product Hunt
  if (channels.includes('producthunt')) {
    const tagline = config.one_liner.length <= 60 ? config.one_liner : config.one_liner.substring(0, 57) + '...';
    assetsLines.push('### Product Hunt');
    assetsLines.push('');
    assetsLines.push(`**Tagline:** ${tagline}`);
    assetsLines.push('');
    assetsLines.push(`**Description:** ${config.one_liner}. ${config.differentiators[0]}. ${isFree ? 'Free, no account needed.' : ''}`);
    assetsLines.push('');
    assetsLines.push('**Maker comment:**');
    assetsLines.push('');
    assetsLines.push(`I built ${config.app_name} because [personal story]. What makes it different:`);
    for (const d of config.differentiators.slice(0, 3)) {
      assetsLines.push(`• ${d}`);
    }
    assetsLines.push('');
  }

  // App Store
  if (channels.includes('appstore') || config.app_type === 'mobile') {
    assetsLines.push('### App Store Description');
    assetsLines.push('');
    assetsLines.push(`**App name:** ${config.app_name.substring(0, 30)}`);
    assetsLines.push(`**Subtitle:** ${config.one_liner.substring(0, 30)}`);
    assetsLines.push(`**Short description:** ${config.one_liner.substring(0, 80)}`);
    assetsLines.push('');
    assetsLines.push('**Features:**');
    for (const d of config.differentiators) {
      assetsLines.push(`• ${d}`);
    }
    assetsLines.push('');
  }

  // Landing page hero
  assetsLines.push('### Landing Page Hero');
  assetsLines.push('');
  assetsLines.push(`**Headline:** ${config.app_name}`);
  assetsLines.push(`**Subheadline:** ${config.one_liner}`);
  assetsLines.push(`**CTA:** ${isFree ? 'Try it free →' : 'Get started →'}`);
  assetsLines.push('');

  // --- STAGE 5: DISTRIBUTION ---
  const distributionLines: string[] = [];
  distributionLines.push('## Stage 5: Distribution Plan');
  distributionLines.push('');
  distributionLines.push('### 4-Week Schedule');
  distributionLines.push('');
  distributionLines.push('| Week | Channel | Action | Notes |');
  distributionLines.push('|------|---------|--------|-------|');

  if (channels.includes('reddit') && subreddits.length > 0) {
    distributionLines.push(`| 1 | ${subreddits[0]} | Primary Reddit post | Test messaging with warmest audience |`);
  }
  if (channels.includes('twitter')) {
    distributionLines.push('| 1 | Twitter/X | Launch thread | Coordinate with Reddit |');
  }
  if (channels.includes('hackernews')) {
    distributionLines.push('| 2 | Hacker News | Show HN post | Technical angle |');
  }
  if (channels.includes('producthunt')) {
    distributionLines.push('| 2 | Product Hunt | Launch | Prepare assets in Week 1 |');
  }
  if (channels.includes('linkedin')) {
    distributionLines.push('| 2 | LinkedIn | Learnings post | After initial feedback |');
  }
  if (subreddits.length > 1 && channels.includes('reddit')) {
    distributionLines.push(`| 3 | ${subreddits[1]} | Secondary Reddit post | Adjust based on feedback |`);
  }
  distributionLines.push('| 3-4 | All | Engage in threads | Comment where genuinely helpful |');
  distributionLines.push('');

  distributionLines.push('### Engagement Strategy');
  distributionLines.push('');
  distributionLines.push('- **Before posting:** Comment in 3-5 threads in target communities');
  distributionLines.push('- **After posting:** Reply to every comment within the first 2 hours');
  distributionLines.push('- **Ongoing:** Share helpful insights; link to your tool only when genuinely relevant');
  distributionLines.push('- **Don\'t:** Cross-post to more than 2-3 subs simultaneously');
  distributionLines.push('');

  distributionLines.push('### Success Metrics');
  distributionLines.push('');
  distributionLines.push('| Metric | Week 1 Target | Month 1 Target |');
  distributionLines.push('|--------|--------------|----------------|');
  distributionLines.push('| Unique visitors | 100+ | 500+ |');
  distributionLines.push('| Reddit upvotes | 20+ | - |');
  distributionLines.push('| Active users | 10+ | 50+ |');
  distributionLines.push('| Feedback items | 5+ | 15+ |');
  distributionLines.push('');

  distributionLines.push('### Review Checklist');
  distributionLines.push('');
  distributionLines.push('- [ ] Sounds human — no "delve", "leverage", "revolutionise"');
  distributionLines.push('- [ ] Specific — exact numbers/features, not vague claims');
  distributionLines.push('- [ ] Matches platform culture');
  distributionLines.push('- [ ] Value prop clear in first sentence');
  distributionLines.push('- [ ] Links work');
  distributionLines.push('- [ ] Would a moderator approve this?');
  distributionLines.push('- [ ] Post adds value without clicking the link');
  distributionLines.push('');

  // Channel reference
  distributionLines.push('### Channel Reference');
  distributionLines.push('');
  for (const ch of channels) {
    const guide = CHANNEL_GUIDES[ch];
    if (guide) {
      distributionLines.push(`**${guide.name}**`);
      distributionLines.push(`- Best time: ${guide.bestTime}`);
      distributionLines.push(`- Tone: ${guide.tone}`);
      distributionLines.push(`- Format: ${guide.format}`);
      distributionLines.push('');
    }
  }

  // Assemble full plan
  const research = researchLines.join('\n');
  const foundation = foundationLines.join('\n');
  const structure = structureLines.join('\n');
  const assets = assetsLines.join('\n');
  const distribution = distributionLines.join('\n');

  const fullMarkdown = [
    `# Marketing Brief: ${config.app_name}`,
    '',
    `Generated: ${today} | Method: Vibe Marketing Playbook 5-Stage Sequence`,
    '',
    '---',
    '',
    research,
    '',
    '---',
    '',
    foundation,
    '',
    '---',
    '',
    structure,
    '',
    '---',
    '',
    assets,
    '',
    '---',
    '',
    distribution,
  ].join('\n');

  return {
    id,
    config,
    scraped,
    generated: fullMarkdown,
    createdAt: new Date().toISOString(),
    stages: { research, foundation, structure, assets, distribution },
  };
}

// Generate config from scraped data
export function scrapedToConfig(scraped: ScrapedApp): AppConfig {
  const appType = scraped.source === 'appstore' || scraped.source === 'googleplay' ? 'mobile' : 'web';

  return {
    app_name: scraped.name,
    app_url: scraped.url,
    app_type: appType,
    category: scraped.category || 'tool',
    one_liner: scraped.shortDescription || scraped.description.substring(0, 120),
    target_audience: `Users of ${scraped.category || 'this type of'} apps`,
    pricing: scraped.pricing,
    differentiators: scraped.features.slice(0, 6),
    competitors: [],
    distribution_channels: appType === 'mobile'
      ? ['reddit', 'twitter', 'producthunt', 'appstore']
      : ['reddit', 'hackernews', 'twitter', 'linkedin', 'producthunt'],
    icon: scraped.icon,
  };
}
