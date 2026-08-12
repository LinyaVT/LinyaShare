<div align="center">

# Statistics System

> Documentation for the admin dashboard statistics, charts and activity feed.

![Status](https://img.shields.io/badge/status-complete-22c55e?style=for-the-badge)

</div>

---

## Navigation

| Document | Link |
|----------|------|
| Documentation Index | [docs/README.md](README.md) |
| Database Guide | [DATABASE.md](DATABASE.md) |

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Event Types](#event-types)
4. [Instrumentation Points](#instrumentation-points)
5. [Stats API](#stats-api)
6. [Admin Dashboard](#admin-dashboard)
7. [Data Model](#data-model)
8. [Known Limitations](#known-limitations)

---

## Overview

The statistics system tracks **time-stamped activity** (downloads, views, uploads, registrations)
and shows it on the admin overview page (`/admin`) as:

- Stat cards for the selected period (Downloads, Views, Uploads, New users, Bandwidth)
- A bar chart of downloads & views per day
- A line chart of uploads & new registrations per day
- A recent activity feed

---

## How It Works

```
Download / View / Upload / Register
        │
        ▼
  logStatEvent(type, { fileId?, userId?, size? })   ← fire-and-forget
        │
        ▼
  StatEvent row in SQLite (timestamped)
        │
        ▼
GET /api/admin/stats?days=30   ← Admin-only, buckets by day
        │
        ▼
  Admin Overview → StatsPanel (cards, charts, feed)
```

Events are written **asynchronously with errors swallowed** (`logStatEvent` in `src/lib/stats.ts`),
so a logging failure can never block the actual download, upload, view or registration.

---

## Event Types

| Type | Meaning | `size` logged? |
|------|---------|----------------|
| `DOWNLOAD` | File downloaded through the app | Yes (file size) |
| `VIEW` | Share page `/s/{shareId}` viewed (password-protected files only after successful unlock) | Yes (file size) |
| `UPLOAD` | User upload (`/data/uploads`) or admin import (`/data/import`) finalized | Yes (file size) |
| `REGISTER` | New account created | No |

---

## Instrumentation Points

| Event | Source |
|-------|--------|
| `DOWNLOAD` | `src/app/api/files/download/route.ts` |
| `DOWNLOAD` | `src/app/api/files/stream/[shareId]/route.ts` (only when `?download=1`) |
| `VIEW` | `src/app/api/files/view/[shareId]/route.ts` |
| `UPLOAD` | `src/lib/upload.ts` → `finalizeUserUpload()` |
| `UPLOAD` | `src/lib/upload.ts` → `finalizeImportUpload()` |
| `REGISTER` | `src/app/api/register/route.ts` |
| `REGISTER` | `src/app/api/admin/users/route.ts` (Admin-created user) |
| `REGISTER` | `src/app/api/setup/route.ts` (first Setup admin) |

---

## Stats API

### `GET /api/admin/stats?days=7|30|90`

Admin-only endpoint (requires `ADMIN` role). `days` defaults to `30` and is clamped to `1..90`.

| Field | Type | Description |
|-------|------|-------------|
| `days` | int | The effective day range |
| `cards.downloads` | int | Downloads in the period |
| `cards.views` | int | Views in the period |
| `cards.uploads` | int | Uploads in the period |
| `cards.registrations` | int | New registrations in the period |
| `cards.bandwidthBytes` | int | Sum of file sizes for DOWNLOAD + UPLOAD events (bytes) |
| `series` | array | Daily buckets: `{ date: "YYYY-MM-DD", downloads, views, uploads, registrations }` (gaps filled with 0) |
| `activity` | array | Last 15 events: `{ type, size, createdAt, fileName, userName }` |

Dates are bucketed in **local server time**.

Example:

```
GET /api/admin/stats?days=30
```

---

## Admin Dashboard

The statistics live on the admin overview page (`/admin`) inside `StatsPanel`
(`src/components/admin/StatsPanel.tsx`), rendered below the existing quick-link cards.

| Element | Description |
|---------|-------------|
| Range selector | Toggle between 7 / 30 / 90 days |
| Stat cards | Downloads, Views, Uploads, New users, Bandwidth (selected period) |
| Bar chart | Downloads (blue) & Views (purple) per day — `src/components/admin/charts.tsx` |
| Line chart | Uploads (green) & New users (amber) per day |
| Activity feed | Last 15 events with icon, file/user name, size, relative time |

Charts are hand-rolled SVG components (no external chart library), matching the
dashboard's dark/glass theme with framer-motion animations.

---

## Data Model

See [DATABASE.md](DATABASE.md#statevent) → `StatEvent`.

```prisma
model StatEvent {
  id        String   @id @default(cuid())
  type      String   @default("DOWNLOAD") // DOWNLOAD | VIEW | UPLOAD | REGISTER
  fileId    String?
  file      File?    @relation(fields: [fileId], references: [id], onDelete: SetNull)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  size      Float?
  createdAt DateTime @default(now())

  @@index([type, createdAt])
  @@index([createdAt])
}
```

---

## Known Limitations

| Limitation | Description |
|------------|-------------|
| No retroactive data | Only events logged **after** this system was deployed are available. "Last 30 days" starts at 0 for older installations |
| Aggregate counters | The per-file `downloads` / `views` counters (used on the dashboard and share page) are separate from the event log |
| SQLite scale | Queries load events of the selected period into memory and bucket in JS. Fine for self-hosted use |
| DB growth | `StatEvent` grows over time. Consider periodic cleanup (`DELETE FROM StatEvent WHERE createdAt < ...`) if needed |

---

<div align="center">

[Documentation Index](README.md) | [Database Guide](DATABASE.md)

</div>