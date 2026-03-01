/**
 * GET /api/pdf/download/[token]
 * Validate the download token and stream the PDF to the client.
 */

import { NextRequest } from 'next/server';
import { getPdfDownloadTokenByHash, getPdfDocument, tryIncrementDownloadCount } from '@/lib/db';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || typeof token !== 'string' || token.length < 32) {
    return Response.json({ error: 'Invalid token' }, { status: 400 });
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const tokenRow = getPdfDownloadTokenByHash(tokenHash);

  if (!tokenRow) {
    return Response.json({ error: 'Invalid or expired download link' }, { status: 404 });
  }

  // Check expiry
  if (new Date(tokenRow.expires_at) < new Date()) {
    return Response.json({ error: 'Download link has expired' }, { status: 410 });
  }

  // Find the PDF file
  const doc = getPdfDocument(tokenRow.order_id);
  if (!doc) {
    return Response.json({ error: 'PDF not found' }, { status: 404 });
  }

  // Validate file path is within expected directory
  const safePath = path.resolve(doc.file_path);
  const safeDir = path.resolve(process.cwd(), 'data', 'pdfs');
  if (!safePath.startsWith(safeDir + path.sep) && safePath !== safeDir) {
    return Response.json({ error: 'Invalid file path' }, { status: 500 });
  }

  if (!fs.existsSync(safePath)) {
    return Response.json({ error: 'PDF file missing from server' }, { status: 500 });
  }

  // Atomically increment download count — fails if limit already reached
  if (!tryIncrementDownloadCount(tokenRow.id)) {
    return Response.json({ error: 'Download limit reached' }, { status: 410 });
  }

  const fileBuffer = fs.readFileSync(safePath);
  const filename = `marketing-plan-${tokenRow.order_id.slice(0, 8)}.pdf`;

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(fileBuffer.length),
      'Cache-Control': 'no-store',
    },
  });
}
