import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { sanitizeImage } from './image-sanitize';

// A 1x1 white image carrying EXIF (here an orientation and a description) to prove it is stripped
async function jpegWithExif() {
  return sharp({ create: { width: 4, height: 2, channels: 3, background: '#ffffff' } })
    .jpeg()
    .withExif({ IFD0: { ImageDescription: 'secret location 51.5,-0.12' } })
    .toBuffer();
}

describe('sanitizeImage', () => {
  it('writes a photo out again without its metadata', async () => {
    const original = await jpegWithExif();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const result = await sanitizeImage(original, 'holiday.JPG');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.exif).toBeUndefined();
    expect(result.buffer.toString('latin1')).not.toContain('secret location');
  });

  it('keeps the format for png and webp', async () => {
    const png = await sharp({ create: { width: 3, height: 3, channels: 4, background: '#00ff00' } }).png().toBuffer();
    const webp = await sharp({ create: { width: 3, height: 3, channels: 3, background: '#00ff00' } }).webp().toBuffer();

    const a = await sanitizeImage(png, 'a.png');
    const b = await sanitizeImage(webp, 'b.webp');

    expect(a.ok && (await sharp(a.buffer).metadata()).format).toBe('png');
    expect(b.ok && (await sharp(b.buffer).metadata()).format).toBe('webp');
  });

  it('refuses bytes that carry an image header but do not decode', async () => {
    const fake = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('<script>alert(1)</script>')]);

    const result = await sanitizeImage(fake, 'logo.png');

    expect(result.ok).toBe(false);
  });

  it('refuses a decompression bomb by pixel count', async () => {
    // 8000 x 8000 = 64 megapixels, above the 50 MP limit, but a solid colour compresses to a few KB
    const bomb = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: '#000000' } })
      .png({ compressionLevel: 9 })
      .toBuffer();

    expect((await sanitizeImage(bomb, 'bomb.png')).ok).toBe(false);
  });

  it('leaves gif and svg alone (they are checked elsewhere)', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const gif = Buffer.from('GIF89a');

    expect(await sanitizeImage(svg, 'x.svg')).toEqual({ ok: true, buffer: svg });
    expect(await sanitizeImage(gif, 'x.gif')).toEqual({ ok: true, buffer: gif });
  });
});
