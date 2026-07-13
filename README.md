<div align="center">

![alt text](./docs/img/logo.png)

# LinyaShare

> Secure file sharing -- self-hosted, password-protected, media-ready.

[![Version](https://img.shields.io/badge/version-1.0.0-ec4899?style=for-the-badge)](https://github.com/LinyaVT/LinyaShare)
[![Node](https://img.shields.io/badge/node-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/license-AGPL--3.0-64748b?style=for-the-badge)](LICENSE)

</div>

---

## Documentation

| Section | Document | Description |
|---------|----------|-------------|
| Wiki | [docs/README.md](docs/README.md) | Documentation index and management guide |
| Development | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local dev setup, Prisma Studio, debugging |
| Environment | [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | All environment variables and .env setup |
| Configuration | [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | bodySizeLimit, nginx tuning, performance |
| Database | [docs/DATABASE.md](docs/DATABASE.md) | Schema, ER diagram, migrations, SQLite |
| Docker | [docs/SETUP_DOCKER.md](docs/SETUP_DOCKER.md) | Docker Compose deployment guide |
| Pterodactyl | [docs/SETUP_PTERODACTYL.md](docs/SETUP_PTERODACTYL.md) | Panel egg, Wings PID fix |
| Node.js | [docs/SETUP_NODEJS.md](docs/SETUP_NODEJS.md) | Production deployment with nginx/PM2 |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Project structure and data flows |
| Embed System | [docs/EMBED_SYSTEM.md](docs/EMBED_SYSTEM.md) | Media embeds, OG tags, streaming |

> [!TIP]
> Start with the [Development Guide](docs/DEVELOPMENT.md) for local setup, or jump to [Docker](docs/SETUP_DOCKER.md) or [Node.js](docs/SETUP_NODEJS.md) for production deployment.

---

## Quick Start

| Step | Command | Description |
|------|---------|-------------|
| 1 | `git clone https://github.com/LinyaVT/LinyaShare.git` | Clone repository |
| 2 | `cd LinyaShare && npm install` | Install dependencies |
| 3 | `cp .env.example .env` | Create environment file |
| 4 | `npm run setup` | Generate Prisma client and create database |
| 5 | `npm run dev` | Start development server |

Open **http://localhost:3000** -- the setup wizard will guide you through admin account creation.

---

## Features

| Feature | Description |
|---------|-------------|
| Password Protection | Optional password on every shared file |
| Chunked Uploads | Large files uploaded in 5MB chunks |
| Media Embedding | Auto-generated URLs for Discord, Twitter embeds |
| Download Tracking | See download counts for each file |
| Admin Panel | User management, file imports, global settings |
| Dark Theme | Glass-morphism UI with animated background |
| Docker Ready | One-command deployment |

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (localhost) |
| `npm run dev:host` | Start dev server on 0.0.0.0 (network) |
| `npm run build` | Build for production |
| `npm start` | Start production server (standalone) |
| `npm run setup` | Generate Prisma client and push schema |
| `npm run db:push` | Push schema changes to database |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run docker:build` | Build Docker image |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run docker:logs` | View Docker logs |

---

## Quick Deploy

### Docker (recommended)

```bash
git clone https://github.com/LinyaVT/LinyaShare.git
cd LinyaShare
docker compose up -d
```

### Node.js

```bash
git clone https://github.com/LinyaVT/LinyaShare.git
cd LinyaShare
npm install
npm run setup
npm run build
npm start
```

### Pterodactyl / FeatherPanel

1. Download [`egg-linyashare.json`](egg-linyashare.json)
2. Import the egg into your panel
3. Set `NEXTAUTH_SECRET` and `NEXT_PUBLIC_APP_URL`
4. **Important**: Increase Wings PID limit from 512 to 2048

See [Pterodactyl Setup Guide](docs/SETUP_PTERODACTYL.md) for detailed instructions.

---

## License

This project is licensed under the AGPLv3 License. See [LICENSE](LICENSE) for details.

**Allowed:** You may use, modify, and monetize the software (e.g., by selling storage space).

**Prohibited:** You may not claim the source code as your own work or resell it as proprietary software.

**Important:** Copyright notices and credits in the user interface must remain visible (AGPLv3 Section 7(b)).

---

<div align="center">

![alt text](./docs/img/footer.png)

---

Built by [Lina](https://github.com/LinyaVT) | [Report Issue](https://github.com/LinyaVT/LinyaShare/issues) | [Documentation](docs/README.md)

</div>