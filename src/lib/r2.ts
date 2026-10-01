import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

// File constraints from spec
export const FILE_CONSTRAINTS = {
  image: {
    maxSize: 5 * 1024 * 1024, // 5 MB
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
    mimeTypes: [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
  },
  file: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    extensions: [
      '.pdf',
      '.txt',
      '.md',
      '.json',
      '.yaml',
      '.yml',
      '.xml',
      '.csv',
      '.toml',
      '.ini',
    ],
    mimeTypes: [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/json',
      'application/x-yaml',
      'text/yaml',
      'application/xml',
      'text/xml',
      'text/csv',
      'application/toml',
    ],
  },
} as const;

// Initialize S3 client for R2
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Validate file based on item type (file or image)
 */
export function validateFile(
  file: { name: string; size: number; type: string },
  itemType: 'file' | 'image'
): { valid: boolean; error?: string } {
  const constraints = FILE_CONSTRAINTS[itemType];

  // Check file size
  if (file.size > constraints.maxSize) {
    const maxMB = constraints.maxSize / (1024 * 1024);
    return { valid: false, error: `File size exceeds ${maxMB} MB limit` };
  }

  // Check extension
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!(constraints.extensions as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${constraints.extensions.join(', ')}`,
    };
  }

  // Check MIME type
  if (!(constraints.mimeTypes as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Invalid MIME type: ${file.type}`,
    };
  }

  return { valid: true };
}

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.toml': 'application/toml',
  '.ini': 'text/plain',
};

function extensionOf(fileName: string): string {
  return '.' + (fileName.split('.').pop()?.toLowerCase() ?? '');
}

/**
 * The content type we store and serve, chosen from the file extension. The
 * type the browser sent is only checked, never trusted.
 */
export function contentTypeForFile(fileName: string): string {
  return EXTENSION_CONTENT_TYPES[extensionOf(fileName)] ?? 'application/octet-stream';
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  '.png': (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  '.jpg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  '.jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  '.gif': (b) => startsWith(b, [0x47, 0x49, 0x46, 0x38]),
  '.webp': (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  '.pdf': (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]),
};

const ACTIVE_SVG = /<script|<foreignObject|\son[a-z]+\s*=|javascript:|<iframe|<embed|<object/i;

/**
 * Check that a file's bytes are what its extension says: image and PDF
 * signatures, text formats without binary content, and SVGs without script.
 * Runs after validateFile, which only sees the name, size and declared type.
 */
export function validateFileContent(
  buffer: Buffer,
  fileName: string
): { valid: boolean; error?: string } {
  const ext = extensionOf(fileName);

  const signature = SIGNATURES[ext];
  if (signature) {
    return signature(buffer)
      ? { valid: true }
      : { valid: false, error: 'File contents do not match its extension' };
  }

  // Everything else is text (svg, xml, json, md, ...): no NUL bytes, valid UTF-8
  if (buffer.includes(0)) {
    return { valid: false, error: 'File contents do not match its extension' };
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return { valid: false, error: 'File contents do not match its extension' };
  }

  if (ext === '.svg' && ACTIVE_SVG.test(text)) {
    return { valid: false, error: 'SVG files with scripts or embedded content are not allowed' };
  }

  return { valid: true };
}

/**
 * Upload file to R2
 */
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  userId: string
): Promise<{ fileUrl: string; key: string }> {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error('R2 bucket configuration missing');
  }

  // Generate unique key with user namespace
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${userId}/${timestamp}-${sanitizedFileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  const fileUrl = `${publicUrl}/${key}`;
  return { fileUrl, key };
}

const DOT_SEGMENT = /(^|[\\/])\.\.?($|[\\/])/;

/**
 * Whether `fileUrl` points at an object inside the user's own `{userId}/`
 * folder of our bucket. Client-supplied file URLs must pass this before they
 * are stored, fetched or deleted: anything else could be another user's file
 * or an arbitrary host.
 */
export function isOwnedFileUrl(userId: string, fileUrl: string | null | undefined): boolean {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl || !userId || !fileUrl) return false;

  const prefix = `${publicUrl.replace(/\/+$/, '')}/${userId}/`;
  if (!fileUrl.startsWith(prefix)) return false;

  // The key must be a plain path under the prefix: no dot segments, encoded or not
  const key = fileUrl.slice(prefix.length);
  if (!key || DOT_SEGMENT.test(key)) return false;
  try {
    return !DOT_SEGMENT.test(decodeURIComponent(key));
  } catch {
    return false;
  }
}

/**
 * Delete every object under a user's `{userId}/` folder (account deletion).
 */
export async function deleteUserFilesFromR2(userId: string): Promise<void> {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) throw new Error('R2 bucket configuration missing');

  let continuationToken: string | undefined;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${userId}/`,
        ContinuationToken: continuationToken,
      })
    );
    const objects = (listed.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({ Bucket: bucketName, Delete: { Objects: objects, Quiet: true } })
      );
    }
    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);
}

/**
 * Delete file from R2 by URL
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error('R2 bucket configuration missing');
  }

  // Extract key from URL
  const key = fileUrl.replace(`${publicUrl}/`, '');

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
