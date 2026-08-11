<div align="center">

# Media Embed and Resource Link System

> Documentation for the automatic media embed generation system.

![Status](https://img.shields.io/badge/status-complete-22c55e?style=for-the-badge)

</div>

---

## Navigation

| Document | Link |
|----------|------|
| Documentation Index | [docs/README.md](README.md) |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [File Structure](#file-structure)
4. [API Endpoints](#api-endpoints)
5. [Dashboard Integration](#dashboard-integration)
6. [Embed URL Generation](#embed-url-generation)
7. [Supported Media Types](#supported-media-types)
8. [Security](#security)
9. [Testing](#testing)
10. [Known Limitations](#known-limitations)

---

## Overview

This system automatically generates embeddable URLs for media files (video, audio, image) that display as rich embeds when shared on Discord, Twitter, Facebook, etc.

---

## How It Works

### 1. Upload Flows

#### User Upload (via Dashboard)

```
User uploads file -> finalizeUserUpload()
  -> Check if media type (video/audio/image)
  -> If yes: Generate embed URL (/api/files/embed/{shareId}/{filename})
  -> Save to DB (embedUrl + isMediaEmbed)
  -> Status: ACTIVE
```

#### Admin Import (via Admin Dashboard)

```
Admin imports file -> finalizeImportUpload()
  -> Check if media type
  -> If yes: Generate embed URL
  -> Save to DB (embedUrl + isMediaEmbed)
  -> Status: IMPORT
```

### 2. Claim Flow (Import to User)

```
Admin assigns file -> claimFile() or claimOrphanedFile()
  -> Move file: /data/import/ -> /data/uploads/
  -> Status: IMPORT -> ACTIVE
  -> Embed URL is preserved (or regenerated if needed)
  -> User sees file with embed link in Dashboard
```

---

## File Structure

| File | Description |
|------|-------------|
| `prisma/schema.prisma` | Database fields: `embedUrl`, `isMediaEmbed` |
| `src/lib/embed-generator.ts` | Helper functions for embeds |
| `src/lib/upload.ts` | Embed logic in all finalize functions |
| `src/app/api/files/route.ts` | API: embedUrl field in response |
| `src/app/api/files/embed/[shareId]/[filename]/route.ts` | Embed endpoint (direct link with file extension) |
| `src/app/api/files/embed/[shareId]/route.ts` | Redirects to the direct link above (backwards compatible) |
| `src/app/(dashboard)/dashboard/page.tsx` | Embed link display in list and grid views |

---

## API Endpoints

### GET /api/files/embed/{shareId}/{filename}

Returns the media file as a **direct link** that ends with the file extension
(e.g. `…/embed/{shareId}/my-video.mp4`). Discord & Co. only render media embeds
for URLs whose path ends with a known file extension, so this URL format is required.

`GET /api/files/embed/{shareId}` (without filename) is kept for backwards compatibility
and responds with a `308` redirect to the filename variant.

| Header | Value |
|--------|-------|
| `Content-Type` | `video/mp4`, `audio/mpeg`, `image/jpeg`, etc. |
| `Content-Disposition` | `inline` (always, never attachment) |
| `Accept-Ranges` | `bytes` (for streaming) |
| `Cache-Control` | `public, max-age=3600` |
| `Access-Control-Allow-Origin` | `*` |

| Feature | Description |
|---------|-------------|
| Streaming | 64KB chunks (no RAM overhead) |
| Path scanning | Only valid UUIDs accepted |
| Password protection | 401 for protected files |
| Range requests | Works with Discord player |

### GET /api/files

Returns the list of user files (ACTIVE only).

| Additional Field | Description |
|-----------------|-------------|
| `embedUrl` | The embed resource link |
| `isMediaEmbed` | Whether it is a media type |

---

## Dashboard Integration

In the user Dashboard (`/dashboard`), each media file shows:

| View | Share URL | Embed URL |
|------|-----------|-----------|
| List | Full URL with copy button | Embed link with copy button |
| Grid | Compact URL with copy button | Embed link with copy button |

---

## Embed URL Generation

### Automatic Generation

The embed URL is automatically generated during:

| Flow | Function |
|------|----------|
| User upload | `finalizeUserUpload()` |
| Admin import | `finalizeImportUpload()` |
| Claim flow | `claimFile()`, `claimOrphanedFile()` |

### Format

```
{Origin}/api/files/embed/{shareId}/{encoded-filename}

Example:
https://linyashare.com/api/files/embed/a1b2c3d4-e5f6-.../my-video.mp4
```

---

## Supported Media Types

| Category | MIME Pattern | File Extensions |
|----------|-------------|-----------------|
| Video | `video/*` | `.mp4`, `.webm`, `.avi`, `.mov`, `.mkv`, `.wmv` |
| Audio | `audio/*` | `.mp3`, `.wav`, `.ogg`, `.flac`, `.aac`, `.m4a` |
| Image | `image/*` | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp` |

---

## Security

| Feature | Description |
|---------|-------------|
| Path sanitizing | `shareId` validated with regex `/^[a-zA-Z0-9-]+$/` |
| Password protection | Protected files return 401 (Discord bots cannot interact) |
| Streaming | Files loaded in 64KB chunks (no RAM overhead) |
| Authorization | Uses existing auth logic |

---

## Testing

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Discord test | Upload media file, copy embed link, paste on Discord | Rich player/preview appears |
| Password test | Upload file with password, access embed link | 401 error (no access without password) |
| Performance test | Upload large video (1GB+), access embed link | Works without RAM overhead (streaming) |
| Legacy link test | Paste old `…/embed/{shareId}` link | 308 redirect to `…/embed/{shareId}/{filename}` |

> **Note:** Discord only embeds videos as an inline player for **MP4 / WebM / MOV**
> files and caps external video link embeds at roughly **50 MiB**. Larger or other
> formats may only show a generic link / thumbnail.

---

## Known Limitations

| Limitation | Description |
|------------|-------------|
| Password-protected files | Cannot display rich embeds (Discord bots cannot enter password) |
| OG image generator | `/api/og/[shareId]` remains unaffected and continues working for social media |

---

<div align="center">

[Documentation Index](README.md) | [Architecture](ARCHITECTURE.md)

</div>