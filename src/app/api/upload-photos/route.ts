import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const IMAGES_DIR = process.env.IMAGE_DIR || '/app/data/images';
const MAX_PHOTOS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
};

/**
 * POST /api/upload-photos
 * Accepts base64 data URL images, saves to IMAGES_DIR.
 * Body: { photos: string[] } — data URLs like "data:image/png;base64,..."
 * Returns: { files: [{ filename, publicUrl, mimeType, base64Data }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const photos: unknown[] = Array.isArray(body.photos) ? body.photos : [];

    if (photos.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, { status: 400 });
    }

    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    const files: Array<{
      filename: string;
      publicUrl: string;
      mimeType: string;
      base64Data: string;
    }> = [];

    for (const photo of photos) {
      if (typeof photo !== 'string') continue;

      const match = photo.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) continue;

      const mimeType = match[1];
      const base64Data = match[2];
      const ext = MIME_TO_EXT[mimeType];
      if (!ext) continue;

      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.byteLength > MAX_FILE_SIZE) continue;

      const filename = `${crypto.randomUUID()}${ext}`;
      const filePath = path.join(IMAGES_DIR, filename);
      fs.writeFileSync(filePath, buffer);

      files.push({
        filename,
        publicUrl: `/api/images/${filename}`,
        mimeType,
        base64Data,
      });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No valid images processed' }, { status: 400 });
    }

    return NextResponse.json({ files });
  } catch (err) {
    console.error('upload-photos error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
