<div align="center">

# Pterodactyl / FeatherPanel Setup

> Deploy LinyaShare on Pterodactyl or FeatherPanel game panel.

![Pterodactyl](https://img.shields.io/badge/Pterodactyl-1.0+-FF6B6B?style=for-the-badge)
![Wings](https://img.shields.io/badge/Wings_PID-2048_required-EF4444?style=for-the-badge)

</div>

---

## Navigation

| Document | Link |
|----------|------|
| Documentation Index | [docs/README.md](README.md) |
| Docker Setup | [SETUP_DOCKER.md](SETUP_DOCKER.md) |
| Node.js Setup | [SETUP_NODEJS.md](SETUP_NODEJS.md) |

---

## Table of Contents

1. [Critical: Wings PID Limit](#critical-wings-pid-limit)
2. [Deployment Flow](#deployment-flow)
3. [Egg Configuration](#egg-configuration)
4. [Egg File](#egg-file)
5. [Variables Reference](#variables-reference)
6. [Startup Command](#startup-command)
7. [Troubleshooting](#troubleshooting)

---

## Critical: Wings PID Limit

> [!CAUTION]
> Pterodactyl Wings has a default PID limit of **512**, which is too low for Next.js builds. You **must** increase this to at least **2048**.

### Why?

Next.js uses multiple worker processes during the build step (`npm run build`). With the default PID limit of 512, the build will fail with:

```
Error: Cannot fork
Error: Resource temporarily unavailable
```

### How to Fix

| Step | Action | Command |
|------|--------|---------|
| 1 | Edit Wings configuration | `nano /etc/featherpanel/config.yml` |
| 2 | Change PID limit | `containers.pids_limit: 2048` |
| 3 | Restart Wings | `systemctl restart wings` |
| 4 | Verify | `docker inspect <container> \| grep PidsLimit` |

Open `/etc/featherpanel/config.yml`:

```yaml
docker:
  network:
    container_pid_limit: 2048  # Change from 512 to 2048
```

> [!WARNING]
> If you skip this step, the server will fail during installation/build with cryptic fork/process errors. This is the most common issue when deploying Next.js apps on Pterodactyl.

---

## Deployment Flow

```mermaid
sequenceDiagram
    participant Panel as Pterodactyl/FeatherPanel
    participant Wings as Wings Daemon
    participant Docker as Docker Container
    participant App as LinyaShare

    Panel->>Wings: Create Server (Egg)
    Wings->>Docker: Start Installation Container
    
    Note over Docker: git clone + npm install
    
    Docker-->>Wings: Installation Complete
    Wings->>Docker: Start Server Container
    
    Note over Docker: npm run setup + npm run build + npm start
    
    Docker->>App: Server Running on port 3000
    App-->>Panel: Health Check OK
```

---

## Egg Configuration

### Docker Image

Use the official Node.js 22 yolk image:

```
ghcr.io/parkervcp/yolks:nodejs_22
```

### Docker Image Options

| Image | Source | Use Case |
|-------|--------|----------|
| `ghcr.io/parkervcp/yolks:nodejs_22` | Official ParkerVCP Yolks | Default |
| `ghcr.io/LinyaVT/linyashare:latest` | Custom build | Pre-built deployment |

### Startup Command

```bash
bash /home/container/start.sh
```

| Step | Command | Description |
|------|---------|-------------|
| 1 | `bash /home/container/start.sh` | Executes startup script with auto-update and dynamic IP/port handling |

### Stop Command

```
^C
```

---

## Egg File

> [!TIP]
> The egg configuration is available as a downloadable JSON file at the project root: [`egg-linyashare.json`](../egg-linyashare.json)

### Import Instructions

| Step | Action |
|------|--------|
| 1 | Download [`egg-linyashare.json`](../egg-linyashare.json) from the repository |
| 2 | Navigate to your Pterodactyl/FeatherPanel Admin Panel |
| 3 | Go to Nests > Create New Egg > Import Egg |
| 4 | Select the downloaded JSON file |
| 5 | Configure variables (NEXTAUTH_SECRET) and save |

### GitHub Auto-Fetch

The egg installation script automatically fetches from GitHub:

| Variable | Default | Description |
|----------|---------|-------------|
| `GIT_REPO` | `https://github.com/LinyaVT/LinyaShare.git` | Repository URL (change for custom forks) |
| `GIT_BRANCH` | `main` | Branch to clone (e.g., `main`, `dev`) |
| `AUTO_UPDATE` | `false` | Enable to auto-pull updates on server restart |

Simply enter a `NEXTAUTH_SECRET` -- everything else is pre-configured for plug-and-play.

---

## Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GIT_REPO` | Yes | `https://github.com/LinyaVT/LinyaShare.git` | GitHub repository URL |
| `GIT_BRANCH` | Yes | `main` | Branch to clone and track |
| `AUTO_UPDATE` | Yes | `false` | Automatically update from GitHub on restart |
| `NEXTAUTH_SECRET` | Yes | - | JWT encryption key |
| `NEXT_PUBLIC_APP_URL` | No | Auto-detected | Public URL for share links (leave empty for auto) |
| `NEXTAUTH_URL` | No | Same as app URL | NextAuth callback URL |

---

## Startup Command

| Scenario | How to Configure |
|----------|---------|
| Default | Everything is automatic - just start the server |
| With Auto-Update | Set `AUTO_UPDATE=true` in egg variables |
| Custom Branch | Set `GIT_BRANCH=dev` (or other branch) |
| Domain URL | Set `NEXT_PUBLIC_APP_URL=https://share.example.com` |

> [!NOTE]
> The startup script automatically handles setup and build steps. Auto-update will only rebuild if source files changed.

---

## Key Features

### 1. Automatic IP & Port Detection

The egg automatically detects the server's IP and port from Pterodactyl's environment variables. You don't need to configure these manually.

- **Without domain**: Uses `http://SERVER_IP:PORT` automatically
- **With domain**: Set `NEXT_PUBLIC_APP_URL=https://your-domain.com`

### 2. Branch Selection

You can specify which branch to use:

- **Stable**: Use `main` (default)
- **Development**: Use `dev` or other branches
- **Custom fork**: Change `GIT_REPO` and `GIT_BRANCH`

### 3. Auto-Update

Enable automatic updates on server restart:

- Set `AUTO_UPDATE=true`
- On restart, the script will:
  - Pull latest changes from the configured branch
  - Update dependencies if `package.json` changed
  - Rebuild if source files changed

---

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Build fails with `Cannot fork` | PID limit too low | Increase `pids_limit` to 2048 |
| `NEXTAUTH_SECRET not set` | Missing variable | Add secret in egg variables |
| `Port already in use` | Port conflict | Set custom port in server allocation settings |
| `Database does not exist` | Setup not run | Check startup command includes `npm run setup` |
| Installation fails | Git clone error | Check network/firewall settings |
| Server won't start | Build error | Check installation logs in panel |

### Checking Logs

| Step | Action |
|------|--------|
| 1 | Open your Pterodactyl/FeatherPanel admin panel |
| 2 | Navigate to the server |
| 3 | Click the Console tab |
| 4 | View real-time logs |

### Reinstalling

```
Server Settings > Reinstall Server
```

> [!WARNING]
> Reinstalling will delete all files in the server directory, including uploaded files and the database. Back up first.

### Manual Database Backup

```bash
# Via SFTP, download:
/home/container/prisma/linyashare.db

# Or via console:
cp /home/container/prisma/linyashare.db /home/container/prisma/linyashare.db.backup
```

---

<div align="center">

[Documentation Index](README.md) | [Docker Setup](SETUP_DOCKER.md) | [Node.js Setup](SETUP_NODEJS.md)

</div>