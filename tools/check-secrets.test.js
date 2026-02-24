const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { IGNORE_LINE_MARKER, scanFile, shouldSkipFile } = require('./check-secrets');

function withTempFile(contents, run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-secrets-'));
  const filePath = path.join(tempDir, 'fixture.txt');
  fs.writeFileSync(filePath, contents, 'utf8');

  try {
    return run(filePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test('scanFile detects unmarked secrets', () => {
  withTempFile('const key = "sk_1234567890abcdef";\n', (filePath) => {
    const findings = scanFile(filePath, 'fixtures/demo.js');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].label, 'sk_ secret');
    assert.equal(findings[0].line, 1);
  });
});

test('scanFile ignores lines marked as known-safe', () => {
  const contents = [
    `const safe = "pplx-1234567890ab"; // ${IGNORE_LINE_MARKER}`,
    'const leaked = "pplx-ABCDEFGHIJKL";',
    '',
  ].join('\n');

  withTempFile(contents, (filePath) => {
    const findings = scanFile(filePath, 'fixtures/demo.js');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].label, 'Perplexity key');
    assert.equal(findings[0].line, 2);
  });
});

test('shouldSkipFile excludes scanner implementation path', () => {
  assert.equal(shouldSkipFile('tools/check-secrets.js'), true);
  assert.equal(shouldSkipFile('tools\\check-secrets.js'), true);
  assert.equal(shouldSkipFile('src/app/page.tsx'), false);
});
