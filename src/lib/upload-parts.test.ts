import { describe, it, expect } from 'vitest';
import { FILE_CONSTRAINTS } from './r2';
import { MAX_UPLOAD_PARTS, UPLOAD_PART_BYTES, UPLOAD_PART_KEY, isUploadId, uploadPartKey } from './upload-parts';

describe('upload parts', () => {
  it('keeps a part under the host\'s 4.5 MB request limit', () => {
    expect(UPLOAD_PART_BYTES).toBeLessThan(4_500_000);
  });

  it('allows enough parts for the largest file the upload rules accept', () => {
    const largest = Math.max(FILE_CONSTRAINTS.file.maxSize, FILE_CONSTRAINTS.image.maxSize);
    expect(MAX_UPLOAD_PARTS * UPLOAD_PART_BYTES).toBeGreaterThanOrEqual(largest);
  });

  it('accepts only a UUID as an upload id', () => {
    expect(isUploadId('0f8b7c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f')).toBe(true);
    for (const bad of ['', '../user-2', '0F8B7C1E-2D3A-4B5C-8D9E-0A1B2C3D4E5F', 'x'.repeat(36), null, 42]) {
      expect(isUploadId(bad)).toBe(false);
    }
  });

  it('puts a part inside the user\'s folder, where the sweep recognises it', () => {
    const key = uploadPartKey('user-1', '0f8b7c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f', 2);
    expect(key).toBe('user-1/parts/0f8b7c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f/2');
    expect(UPLOAD_PART_KEY.test(key)).toBe(true);
    expect(UPLOAD_PART_KEY.test('user-1/1700000000000-a.png')).toBe(false);
  });
});
