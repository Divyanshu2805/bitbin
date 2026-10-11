import { UPLOAD_PART_BYTES } from "@/lib/upload-parts";

// The browser side of uploads larger than one request (lib/upload-parts.ts): send a file to
// PUT /api/upload/part in 4 MB pieces, then name the pieces in the request that uses them.

export type JsonReply = { success?: boolean; data?: unknown; error?: string; warning?: string | null };

/** Send one request, reporting upload progress (0–1), and resolve with the JSON reply. */
export function send(
  method: string,
  url: string,
  body: XMLHttpRequestBodyInit,
  onProgress: (fraction: number) => void = () => {}
): Promise<JsonReply> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let reply: JsonReply = {};
      try {
        reply = JSON.parse(xhr.responseText);
      } catch {
        // The host's own error page (a 413, say) isn't JSON
      }
      if (xhr.status >= 200 && xhr.status < 300 && reply.success !== false) resolve(reply);
      else reject(new Error(reply.error || "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.open(method, url);
    xhr.send(body);
  });
}

/** Whether a file is too large for one request and has to go in parts. */
export function needsParts(file: Blob): boolean {
  return file.size > UPLOAD_PART_BYTES;
}

/**
 * Send a file's parts and return what names them: add `uploadId` and `partCount` to the form of
 * the request that puts them together. `onProgress` gets the share of bytes sent (0–1).
 */
export async function sendInParts(
  file: Blob,
  onProgress: (fraction: number) => void = () => {}
): Promise<{ uploadId: string; partCount: number }> {
  const uploadId = crypto.randomUUID();
  const partCount = Math.ceil(file.size / UPLOAD_PART_BYTES);
  for (let index = 0; index < partCount; index++) {
    const part = file.slice(index * UPLOAD_PART_BYTES, (index + 1) * UPLOAD_PART_BYTES);
    await send("PUT", `/api/upload/part?uploadId=${uploadId}&index=${index}`, part, (f) =>
      onProgress((index + f) / partCount)
    );
  }
  return { uploadId, partCount };
}
