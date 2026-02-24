#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const IGNORED_PATHS = new Set(['tools/check-secrets.js']);
const IGNORE_LINE_MARKER = 'secret-scan: ignore';

const SECRET_PATTERNS = [
  { label: 'Google API key', regex: /AIza[0-9A-Za-z_-]{20,}/g },
  { label: 'sk_ secret', regex: /\bsk_[A-Za-z0-9_-]{16,}\b/g },
  { label: 'Perplexity key', regex: /\bpplx-[A-Za-z0-9_-]{12,}\b/g },
  { label: 'Anthropic key', regex: /\bam_0[A-Za-z0-9_-]{12,}\b/g },
  { label: 'Webhook secret', regex: /\bwhsec_[A-Za-z0-9_-]{12,}\b/g },
];

function listTrackedFiles() {
  const output = execSync('git ls-files -z', { encoding: 'buffer' }).toString('utf8');
  return output.split('\0').filter(Boolean);
}

function normalizeRelPath(relPath) {
  return relPath.replace(/\\/g, '/');
}

function shouldSkipFile(relPath) {
  return IGNORED_PATHS.has(normalizeRelPath(relPath));
}

function looksBinary(buffer) {
  const sample = buffer.subarray(0, 4096);
  for (const byte of sample) {
    if (byte === 0) return true;
  }
  return false;
}

function mask(value) {
  if (value.length <= 12) return `${value.slice(0, 4)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function scanFile(absPath, relPath) {
  const findings = [];
  const raw = fs.readFileSync(absPath);
  if (looksBinary(raw)) return findings;

  const text = raw.toString('utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(IGNORE_LINE_MARKER)) continue;
    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0;
      const matches = line.matchAll(pattern.regex);
      for (const match of matches) {
        const token = match[0];
        findings.push({
          file: relPath,
          line: i + 1,
          label: pattern.label,
          token: mask(token),
        });
      }
    }
  }

  return findings;
}

function main() {
  const root = process.cwd();
  const files = listTrackedFiles();
  const findings = [];

  for (const relPath of files) {
    if (shouldSkipFile(relPath)) continue;
    const absPath = path.resolve(root, relPath);
    if (!fs.existsSync(absPath) || fs.lstatSync(absPath).isDirectory()) continue;
    findings.push(...scanFile(absPath, relPath));
  }

  if (findings.length > 0) {
    process.stderr.write('Potential secrets detected:\n');
    for (const finding of findings) {
      process.stderr.write(
        `- ${finding.file}:${finding.line} [${finding.label}] ${finding.token}\n`
      );
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write('No known secret patterns detected.\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  IGNORE_LINE_MARKER,
  IGNORED_PATHS,
  SECRET_PATTERNS,
  listTrackedFiles,
  looksBinary,
  mask,
  normalizeRelPath,
  shouldSkipFile,
  scanFile,
  main,
};
