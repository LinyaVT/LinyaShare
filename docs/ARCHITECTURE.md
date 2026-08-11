<div align="center">

# LinyaShare - Architecture Overview

</div>

## Project Structure

```
LinyaShare/
├── prisma/
│   └── schema.prisma          # Database schema (SQLite via Prisma)
│
├── src/
│   ├── app/                   # Next.js App Router pages & API routes
│   │   ├── layout.tsx         # Root layout (providers, background)
│   │   ├── page.tsx           # Landing page
│   │   ├── globals.css        # Global styles & Tailwind classes
│   │   │
│   │   ├── (auth)/            # Authentication pages
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── setup/page.tsx # First-time admin setup
│   │   │
│   │   ├── (dashboard)/       # User dashboard pages
│   │   │   ├── dashboard/page.tsx  # Main file management
│   │   │   └── settings/page.tsx   # User settings
│   │   │
│   │   ├── admin/             # Admin panel pages
│   │   │   ├── page.tsx       # Overview with stats
│   │   │   ├── users/page.tsx # User management (CRUD)
│   │   │   ├── files/page.tsx # File management & unclaimed files
│   │   │   └── settings/page.tsx # Global settings
│   │   │
│   │   ├── s/[shareId]/       # Public share page (SSR + OG metadata)
│   │   ├── privacy/page.tsx   # Privacy policy (Markdown)
│   │   ├── tos/page.tsx       # Terms of service (Markdown)
│   │   │
│   │   └── api/               # API routes
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth
│   │       ├── files/          # File operations
│   │       │   ├── route.ts            # GET (list), PUT, DELETE
│   │       │   ├── download/route.ts   # POST (verify password + download)
│   │       │   ├── embed/[shareId]/    # Media embed endpoint
│   │       │   ├── info/[shareId]/     # File metadata for share page
│   │       │   └── stream/[shareId]/   # Streaming endpoint
│   │       ├── upload/route.ts         # Chunked upload
│   │       ├── register/route.ts       # User registration
│   │       ├── setup/route.ts          # First-time setup
│   │       ├── settings/public/route.ts # Public settings
│   │       ├── user/settings/route.ts  # User-specific settings
│   │       ├── admin/                  # Admin API routes
│   │       │   ├── files/route.ts
│   │       │   ├── users/route.ts
│   │       │   ├── settings/route.ts
│   │       │   └── import/route.ts
│   │       └── og/[shareId]/route.ts   # OG image generator
│   │
│   ├── components/            # React components
│   │   ├── Header.tsx         # Navigation header
│   │   ├── Footer.tsx         # Site footer
│   │   ├── AnimatedBackground.tsx  # Particle animation canvas
│   │   ├── SessionProvider.tsx     # NextAuth wrapper
│   │   ├── Toast.tsx          # Toast notification system
│   │   ├── ConfirmDialog.tsx  # Reusable confirmation modal
│   │   ├── MarkdownRenderer.tsx    # Custom Markdown renderer
│   │   ├── SharePageClient.tsx     # Share page UI (password, preview)
│   │   ├── Pagination.tsx     # Reusable pagination component
│   │   ├── SearchBar.tsx      # Reusable search input
│   │   ├── FilterBar.tsx      # Reusable filter dropdown
│   │   ├── MobileFileMenu.tsx     # Mobile action menu (dashboard)
│   │   ├── AdminFileMenu.tsx      # Mobile action menu (admin files)
│   │   ├── AdminUserMenu.tsx      # Mobile action menu (admin users)
│   │   └── UnclaimedFileMenu.tsx  # Mobile action menu (unclaimed)
│   │
│   ├── lib/                   # Core libraries
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── upload.ts          # File upload logic (chunked, import, claim)
│   │   ├── embed-generator.ts # Media embed URL & OG tag generation
│   │   ├── utils.ts           # Formatting & file type detection
│   │   └── constants.ts       # Paths, limits, file extensions
│   │
│   └── types/
│       └── index.ts           # Shared TypeScript interfaces
│
├── docs/                      # Documentation
│   ├── README.md              # Documentation index & wiki guide
│   ├── DEVELOPMENT.md         # Local development guide
│   ├── ENVIRONMENT.md         # Environment variables reference
│   ├── CONFIGURATION.md       # Advanced configuration (chunked uploads, tuning)
│   ├── DATABASE.md            # Database schema & management
│   ├── SETUP_DOCKER.md        # Docker deployment guide
│   ├── SETUP_PTERODACTYL.md   # Pterodactyl/FeatherPanel guide
│   ├── SETUP_NODEJS.md        # Node.js production guide
│   ├── ARCHITECTURE.md        # This file
│   └── EMBED_SYSTEM.md        # Media embed system documentation
│
├── data/
│   ├── uploads/               # User-uploaded files
│   └── import/                # Admin-imported files (pre-claim)
│
├── Dockerfile                 # Production build
├── docker-compose.yml         # Docker orchestration
├── package.json               # Dependencies & scripts
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

## Data Flow

### Upload Flow
```
User → Upload UI → Chunked POST /api/upload → Temp file → finalizeUserUpload() → DB + /data/uploads/
```

### Download Flow  
```
User → /s/{shareId} → verify password (if any) → GET /api/files/stream/{shareId} → Stream file
```

### Import Flow (Admin)
```
Admin → Upload to /api/admin/import → Temp file → finalizeImportUpload() → DB (status: IMPORT)
      → Claim via /api/admin/import (POST) → claimFile() → /data/uploads/ + status: ACTIVE
```

## Database Schema

See `prisma/schema.prisma` for the full schema. Key models:
- **User** - Accounts with roles (USER/ADMIN) and storage limits
- **File** - Uploaded files with share links, passwords, embed URLs
- **Setting** - Key-value store for global settings

## Key Design Decisions

1. **SQLite** - Simple file-based database, no external DB server needed
2. **Chunked Uploads** - Large files are uploaded in 512 KB chunks to avoid request limits without any proxy configuration
3. **Standalone Build** - Next.js `output: 'standalone'` for minimal Docker images
4. **Streaming** - Files are streamed through the API (no full file buffering in RAM)
5. **JWT Sessions** - Stateless authentication via NextAuth with JWT strategy

<div align="center">

[Main README](../README.md) | [Development Guide](DEVELOPMENT.md) | [Docker Setup](SETUP_DOCKER.md)

</div>