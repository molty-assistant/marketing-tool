import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IMAGES_DIR = '/app/data/images';

function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

export async function GET(_req: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;

    // Prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(IMAGES_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(safeName),
        'Content-Length': buffer.length.toString(),
        // Reasonable caching; images are content-addressed by random UUID
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('images GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
