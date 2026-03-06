# File uploads

File and image items are a **Pro** feature. Binary data lives in a Cloudflare
R2 bucket. The database only stores `fileUrl`, `fileName` and `fileSize`.

## Limits

Defined in `FILE_CONSTRAINTS` (`src/lib/r2.ts`):

| Type | Max size | Extensions |
| --- | --- | --- |
| `image` | 5 MB | png, jpg, jpeg, gif, webp, svg |
| `file` | 10 MB | pdf, txt, md, json, yaml/yml, xml, csv, toml, ini |

Both the extension and the MIME type are checked.

## Upload flow

```
FileUpload (drag & drop)
   └── POST /api/upload  (multipart: file, itemType)
          ├── auth()                      → 401
          ├── user.isPro?                 → 403
          ├── checkRateLimit('upload')    → 429 (10 / hour)
          ├── validateFile()              → 400
          └── uploadToR2(userId/timestamp-filename)
                 → { fileUrl, fileName, fileSize }
   └── createItem({ ..., fileUrl, fileName, fileSize })
```

Object keys are prefixed with the user id (`{userId}/{timestamp}-{name}`),
which the download route relies on.

## Download flow

Browsers can't download cross-origin R2 URLs with a filename reliably, so
downloads go through a proxy:

```
GET /api/download/{userId}/{file}
   ├── auth()                                   → 401
   ├── path must start with the caller's userId → 403
   └── stream object from R2 with Content-Disposition: attachment
```

## Deletion

Deleting a file/image item calls `deleteFromR2(fileUrl)` so no orphans are
left in the bucket.

## R2 setup checklist

1. Create a bucket and enable the **public r2.dev URL** (or attach a domain)
2. Create an API token with *Object Read & Write* on that bucket
3. Fill the `R2_*` variables ([environment-variables.md](environment-variables.md))
4. `next.config.ts` already allows `*.r2.dev` and `*.r2.cloudflarestorage.com`
   for `next/image`
