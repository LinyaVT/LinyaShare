<div align="center">

# Advanced Configuration

> Understanding and tuning LinyaShare's configuration files.

![Next.js](https://img.shields.io/badge/Next.js_Config-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_Config-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

---

## Navigation

| Document | Link |
|----------|------|
| Documentation Index | [docs/README.md](README.md) |
| Environment Variables | [ENVIRONMENT.md](ENVIRONMENT.md) |
| Docker Setup | [SETUP_DOCKER.md](SETUP_DOCKER.md) |

---

## Table of Contents

1. [next.config.js](#nextconfigjs)
2. [tailwind.config.ts](#tailwindconfigts)
3. [tsconfig.json](#tsconfigjson)
4. [postcss.config.js](#postcssconfigjs)
5. [Request Flow](#request-flow)
6. [Performance Tuning](#performance-tuning)

---

## next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

### output: 'standalone'

| Attribute | Value |
|-----------|-------|
| Purpose | Creates a minimal production build |
| Effect | Only includes necessary files in `.next/standalone/` |
| Benefit | Smaller Docker images, faster deployments |

> [!NOTE]
> Without `standalone` mode, the entire `node_modules` would need to be present at runtime. Standalone mode copies only the required modules, reducing the Docker image from approximately 500MB to 150MB.

### No `bodySizeLimit` needed

| Attribute | Value |
|-----------|-------|
| Setting | Removed |
| Purpose | Was only relevant for Server Actions |
| Chunk size | 512 KB |

> [!NOTE]
> **File uploads use API Routes with chunked streaming**, not Server Actions. `experimental.serverActions.bodySizeLimit` was never applied to uploads, so it has been removed from `next.config.js`. The default Next.js `1mb` Server Action limit remains unchanged.

#### Why no config is needed

| Reason | Explanation |
|--------|-------------|
| 512 KB chunks | Each upload request is ~512 KB, well below the nginx default `client_max_body_size 1m` |
| No proxy tuning | nginx/Caddy/Traefik work out of the box, no `client_max_body_size` change required |
| API Route streaming | `/api/upload` streams chunk bodies directly to disk, no full-file buffering |
| Server Actions | Not used for uploads, so `bodySizeLimit` does not matter here |

#### Upload limits reference

| Component | Limit | LinyaShare |
|-----------|-------|------------|
| Next.js Server Action | `1mb` default | Not used for uploads |
| nginx `client_max_body_size` | `1m` default | 512 KB chunks fit without changes |
| Cloudflare (free) | 100 MB | Chunked uploads bypass this entirely |

```bash
# Optional: only needed if you ever increase the chunk size (src/lib/constants.ts)
# nginx: client_max_body_size 100g; (for chunked API routes)
# Caddy: Not needed (unlimited by default)
# Traefik: Not needed (unlimited by default)
```

> [!TIP]
> The chunk size is defined once in `src/lib/constants.ts` (`CHUNK_SIZE`) and imported by the dashboard. Keep it below your reverse proxy's request body limit.

---

## tailwind.config.ts

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a2b8',
          500: '#64748b',
          600: '#475569',
          700: '#1e1e2e',
          800: '#11111a',
          900: '#0a0a12',
        },
        primary: {
          400: '#ec4899',
          500: '#db2777',
          600: '#be185d',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

### Custom Color Palette

| Color Class | Usage |
|------------|-------|
| `dark-700` | Card backgrounds, borders |
| `dark-800` | Page background |
| `dark-900` | Deepest background layer |
| `primary-400` | Accent color (pink) |
| `primary-500` | Hover states |

> [!NOTE]
> The `dark-*` and `primary-*` colors are used throughout the app via Tailwind classes like `bg-dark-800` and `text-primary-400`.

---

## tsconfig.json

| Setting | Purpose |
|---------|---------|
| `strict: true` | Full TypeScript strict mode |
| `@/*` path alias | Import from `@/components/...` instead of relative paths |
| `bundler` module resolution | Required for Next.js 15 |
| `incremental: true` | Faster subsequent builds |

---

## postcss.config.js

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

Standard PostCSS configuration for Tailwind CSS. No modifications needed.

---

## Request Flow

```mermaid
sequenceDiagram
    participant Client as Browser/App
    participant RP as Reverse Proxy (nginx)
    participant Next as Next.js Server
    participant DB as SQLite Database
    participant FS as File System

    Client->>RP: HTTPS Request
    
    Note over RP: Default client_max_body_size<br/>1m is enough (512 KB chunks)
    
    RP->>Next: HTTP Request
    
    Note over Next: No bodySizeLimit config<br/>uploads stream via API Route
    
    alt API Route
        Next->>DB: Prisma Query
        DB-->>Next: Result
    else File Upload
        Next->>FS: Write chunk (512 KB)
        FS-->>Next: Confirmation
    else File Download
        Next->>FS: Stream file
        FS-->>Next: Data chunks
    end
    
    Next-->>RP: Response
    RP-->>Client: HTTPS Response
```

---

## Performance Tuning

### Memory

| Setting | Default | Tuning Notes |
|---------|---------|--------------|
| `bodySizeLimit` | Removed | Not needed, uploads use API Routes |
| Chunk size | 512 KB | Defined in `src/lib/constants.ts` |
| Max particles | 400 | Auto-scaled in `AnimatedBackground.tsx` |

### Database

| Setting | Default | Notes |
|---------|---------|-------|
| SQLite WAL mode | Off | Enable for better concurrent performance |
| Connection pool | 1 | SQLite does not benefit from pooling |

### Network

| Component | Setting | Recommendation |
|-----------|---------|---------------|
| nginx `client_max_body_size` | `1m` | No change needed (512 KB chunks fit below the default) |
| nginx `proxy_read_timeout` | `60s` | Set to `300s` for slow connections |
| Cloudflare | 100MB limit | Chunked uploads bypass this entirely |

---

<div align="center">

[Documentation Index](README.md) | [Environment Guide](ENVIRONMENT.md) | [Database Guide](DATABASE.md)

</div>