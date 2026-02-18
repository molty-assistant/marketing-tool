#!/usr/bin/env node
/*
  Veo 2 video generation helper.

  CLI:
    node tools/veo-video.js --prompt "..." --aspect 9:16 --output output/promo.mp4

  Or with templates (from tools/veo-video.config.json):
    node tools/veo-video.js --template app-promo-vertical --output output/promo.mp4

  Import:
    const { generateVideo } = require('./veo-video');
*/

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_MODEL = 'models/veo-2.0-generate-001';
const GENERATE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning`;
const OPERATIONS_BASE = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001/operations/`;

const DEFAULT_ASPECT = '16:9';
const VALID_ASPECTS = new Set(['16:9', '9:16', '1:1']);
const DEFAULT_DURATION_SECONDS = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requiredArg(name, value) {
  if (!value || String(value).trim() === '') {
    throw new Error(`Missing required argument: ${name}`);
  }
  return value;
}

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    // Confirmed working key (project instruction). Prefer env vars when set.
    (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')
  );
}

function normalizeAspect(aspectRatio) {
  if (!aspectRatio) return DEFAULT_ASPECT;
  const a = String(aspectRatio).trim();
  if (!VALID_ASPECTS.has(a)) {
    throw new Error(`Invalid --aspect "${a}". Valid: 16:9, 9:16, 1:1`);
  }
  return a;
}

function normalizeDurationSeconds(durationSeconds) {
  if (durationSeconds == null || durationSeconds === '') return DEFAULT_DURATION_SECONDS;
  const n = Number(durationSeconds);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`Invalid --duration "${durationSeconds}". Must be an integer 5–8.`);
  }
  if (n < 5 || n > 8) {
    throw new Error(`Invalid --duration "${durationSeconds}". Must be 5–8.`);
  }
  return n;
}

async function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  await fsp.mkdir(dir, { recursive: true });
}

async function downloadToFile(url, headers, outputPath) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Download failed (${res.status} ${res.statusText}). ${text}`);
  }

  await ensureParentDir(outputPath);

  // Node fetch returns a web ReadableStream; convert to Node stream.
  const nodeStream = fs.createWriteStream(outputPath);
  await new Promise((resolve, reject) => {
    nodeStream.on('finish', resolve);
    nodeStream.on('error', reject);

    if (!res.body) {
      reject(new Error('No response body while downloading video.'));
      return;
    }

    const { Readable } = require('node:stream');
    Readable.fromWeb(res.body).pipe(nodeStream);
  });
}

/**
 * Generate a video via Gemini Veo 2 and download the MP4.
 *
 * @param {string} prompt
 * @param {string} [aspectRatio] - One of 16:9, 9:16, 1:1 (default 16:9)
 * @param {string} outputPath - Where to write the MP4
 * @param {object} [options]
 * @param {number} [options.durationSeconds] - 5–8 (default 5)
 * @param {number} [options.pollIntervalMs] - default 2000
 * @param {number} [options.maxPollMinutes] - default 10
 * @returns {Promise<{operationName: string, videoUri: string, outputPath: string}>}
 */
async function generateVideo(prompt, aspectRatio, outputPath, options = {}) {
  requiredArg('prompt', prompt);
  requiredArg('output', outputPath);

  const apiKey = getApiKey();
  const aspect = normalizeAspect(aspectRatio);
  const durationSeconds = normalizeDurationSeconds(options.durationSeconds);

  const headers = {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json'
  };

  const body = {
    model: DEFAULT_MODEL,
    instances: [{ prompt }],
    parameters: {
      aspectRatio: aspect,
      sampleCount: 1,
      durationSeconds
    }
  };

  const startRes = await fetch(GENERATE_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!startRes.ok) {
    const text = await startRes.text().catch(() => '');
    throw new Error(`Veo generate request failed (${startRes.status} ${startRes.statusText}). ${text}`);
  }

  const startJson = await startRes.json();
  const operationName = startJson?.name;
  if (!operationName) {
    throw new Error(`Unexpected generate response (missing name): ${JSON.stringify(startJson)}`);
  }

  const opId = operationName.split('/operations/')[1] || operationName.split('/').pop();
  const pollUrl = opId ? `${OPERATIONS_BASE}${opId}` : `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

  const pollIntervalMs = Number.isFinite(options.pollIntervalMs) ? options.pollIntervalMs : 2000;
  const maxPollMinutes = Number.isFinite(options.maxPollMinutes) ? options.maxPollMinutes : 10;
  const deadline = Date.now() + maxPollMinutes * 60 * 1000;

  let lastJson;
  while (Date.now() < deadline) {
    const pollRes = await fetch(pollUrl, { headers: { 'x-goog-api-key': apiKey } });
    if (!pollRes.ok) {
      const text = await pollRes.text().catch(() => '');
      throw new Error(`Operation poll failed (${pollRes.status} ${pollRes.statusText}). ${text}`);
    }

    lastJson = await pollRes.json();

    if (lastJson?.error) {
      throw new Error(`Operation error: ${JSON.stringify(lastJson.error)}`);
    }

    if (lastJson?.done === true) break;

    await sleep(pollIntervalMs);
  }

  if (!lastJson?.done) {
    throw new Error(`Timed out waiting for video generation after ${maxPollMinutes} minutes. Last response: ${JSON.stringify(lastJson)}`);
  }

  const videoUri =
    lastJson?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

  if (!videoUri) {
    throw new Error(`Operation completed but video URI missing. Response: ${JSON.stringify(lastJson)}`);
  }

  const downloadUrl = videoUri.includes('?') ? `${videoUri}&alt=media` : `${videoUri}?alt=media`;

  await downloadToFile(downloadUrl, { 'x-goog-api-key': apiKey }, outputPath);

  return { operationName, videoUri, outputPath };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;

    const [key, inlineValue] = a.slice(2).split('=');
    const value = inlineValue != null ? inlineValue : argv[i + 1];

    switch (key) {
      case 'prompt':
      case 'aspect':
      case 'output':
      case 'duration':
      case 'template':
      case 'config':
        out[key] = value;
        if (inlineValue == null) i++;
        break;
      case 'help':
        out.help = true;
        break;
      default:
        throw new Error(`Unknown flag: --${key}`);
    }
  }
  return out;
}

async function loadTemplate(templateName, configPath) {
  const p = configPath
    ? path.resolve(process.cwd(), configPath)
    : path.resolve(__dirname, 'veo-video.config.json');

  const raw = await fsp.readFile(p, 'utf8');
  const json = JSON.parse(raw);
  const tpl = json?.templates?.[templateName];
  if (!tpl) {
    const keys = Object.keys(json?.templates || {});
    throw new Error(
      `Unknown template "${templateName}" in ${p}. Available: ${keys.join(', ') || '(none)'}`
    );
  }
  return tpl;
}

function usage() {
  return `Veo 2 video generator\n\n` +
    `Usage:\n` +
    `  node tools/veo-video.js --prompt "..." [--aspect 16:9|9:16|1:1] --output path/to/video.mp4 [--duration 5-8]\n` +
    `  node tools/veo-video.js --template app-promo-vertical --output path/to/video.mp4\n\n` +
    `Options:\n` +
    `  --prompt     Text prompt for Veo\n` +
    `  --aspect     Aspect ratio (default 16:9)\n` +
    `  --output     Output mp4 path\n` +
    `  --duration   Duration seconds (5-8, default 5)\n` +
    `  --template   Use a named template from tools/veo-video.config.json\n` +
    `  --config     Path to an alternate config JSON\n` +
    `  --help       Show help\n\n` +
    `Environment:\n` +
    `  GEMINI_API_KEY / GOOGLE_API_KEY (optional; falls back to repo key)\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  let prompt = args.prompt;
  let aspect = args.aspect;
  let durationSeconds = args.duration;

  if (args.template) {
    const tpl = await loadTemplate(args.template, args.config);
    prompt = prompt || tpl.prompt;
    aspect = aspect || tpl.aspectRatio;
    durationSeconds = durationSeconds || tpl.durationSeconds;
  }

  const outputPath = requiredArg('output', args.output);
  prompt = requiredArg('prompt', prompt);

  const startedAt = Date.now();
  process.stderr.write(`Generating video (aspect ${normalizeAspect(aspect)}, duration ${normalizeDurationSeconds(durationSeconds)}s)...\n`);

  const result = await generateVideo(prompt, aspect, outputPath, {
    durationSeconds: durationSeconds != null ? Number(durationSeconds) : undefined
  });

  const seconds = Math.round((Date.now() - startedAt) / 100) / 10;
  process.stderr.write(`Done in ${seconds}s. Saved: ${result.outputPath}\n`);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`${err?.stack || err}\n`);
    process.exitCode = 1;
  });
}

module.exports = { generateVideo };
