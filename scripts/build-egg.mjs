// ─────────────────────────────────────────────────────────────────────────────
// LinyaShare – Egg generator
// Generates the newly formatted egg from `deploy/startup-launcher.sh` (and
// hardcoded metadata) into `egg/egg-linyashare.json`.
//
//   npm run egg:create
//
// Advantages over hand-maintaining the old JSON:
//   - No more manual JSON escaping (the startup source is a readable bash file
//     and is automatically squeezed into a single line here).
//   - The startup produced by `JSON.stringify` is guaranteed to be escaped correctly.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Source of the start command ───────────────────────────────────────────────
// Each line = one full shell statement (inline `if`) – joined with " && "
// into the single line that Pterodactyl/FeatherPanel needs in the egg startup.
function compressLauncher(relPath) {
  const file = path.join(ROOT, relPath);
  const lines = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  if (lines.length === 0) throw new Error(`no commands in ${relPath}`);
  return lines.join(' && ');
}

const startup = compressLauncher('deploy/startup-launcher.sh');

// Minimal check against known panel-template issues:
const mangleRisk = /\$\{DATABASE_URL\}/.test(startup);
if (mangleRisk) {
  throw new Error(
    'The launcher contains `${DATABASE_URL}` (panel-substituted!). Logic belongs in deploy/startup.sh.',
  );
}

// ── Metadata / variables (source of truth) ────────────────────────────────────
const INSTALL_SCRIPT = [
  'export DEBIAN_FRONTEND=noninteractive && apt update && apt install -y git curl ca-certificates python3 make g++ && mkdir -p /mnt/server && cd /mnt/server && git clone -b "${GIT_BRANCH:-main}" "${GIT_REPO:-https://github.com/LinyaVT/LinyaShare.git}" . && npm install',
].join('');

const egg = {
  meta: {
    version: 'PTDL_v2',
    update_url: null,
  },
  exported_at: new Date().toISOString(),
  name: 'LinyaShare',
  author: 'linya@sknif.de',
  description: 'Optimized LinyaShare Egg for Next.js 15 (Standalone).',
  docker_images: {
    'Node.js 22': 'ghcr.io/parkervcp/yolks:nodejs_22',
  },
  startup,
  config: {
    files: '{}',
    // "Ready in" = Next.js-15 standalone log on the real server start (the old
    // "started server on" is no longer logged by Next 15.5 -> otherwise never "Running").
    // ^C = SIGINT -> matches the exec PID-1 chain in deploy/startup.sh.
    startup: '{"done":["Ready in", "started server on", "listening on"]}',
    logs: '{}',
    stop: '^C',
  },
  scripts: {
    installation: {
      script: INSTALL_SCRIPT,
      container: 'node:22-bookworm',
      entrypoint: 'bash',
    },
  },
  variables: [
    {
      name: 'GitHub Repository',
      description: 'URL to the LinyaShare GitHub repository.',
      env_variable: 'GIT_REPO',
      default_value: 'https://github.com/LinyaVT/LinyaShare.git',
      user_viewable: 1,
      user_editable: 1,
      rules: 'required|string|max:255',
    },
    {
      name: 'Git Branch',
      description: 'The branch to clone (e.g., main).',
      env_variable: 'GIT_BRANCH',
      default_value: 'main',
      user_viewable: 1,
      user_editable: 1,
      rules: 'required|string|max:100',
    },
    {
      name: 'Auto-Update',
      description: "If 'true', pulls the latest code from GitHub on every server restart.",
      env_variable: 'AUTO_UPDATE',
      default_value: 'false',
      user_viewable: 1,
      user_editable: 1,
      rules: 'required|boolean',
    },
    {
      name: 'NextAuth Secret',
      description: 'A random secret key for session encryption.',
      env_variable: 'NEXTAUTH_SECRET',
      default_value: '',
      user_viewable: 1,
      user_editable: 1,
      rules: 'required|string|max:64',
    },
    {
      name: 'Public App URL',
      description: 'The public URL of your instance (e.g., https://share.example.com).',
      env_variable: 'NEXT_PUBLIC_APP_URL',
      default_value: '',
      user_viewable: 1,
      user_editable: 1,
      rules: 'nullable|string|max:255',
    },
    {
      name: 'NextAuth URL',
      description: 'Callback URL for Auth. Defaults to Public App URL if left empty.',
      env_variable: 'NEXTAUTH_URL',
      default_value: '',
      user_viewable: 1,
      user_editable: 1,
      rules: 'nullable|string|max:255',
    },
    {
      name: 'Auth Trust Host',
      description: "Set to 'true' to allow the server to trust the incoming host header.",
      env_variable: 'AUTH_TRUST_HOST',
      default_value: 'true',
      user_viewable: 1,
      user_editable: 1,
      rules: 'required|boolean',
    },
    {
      name: 'Database Provider',
      description:
        "Database backend. 'sqlite' (default, file-based, no extra server), 'mysql' (MySQL/MariaDB), or 'postgres' (PostgreSQL). For external servers also set the Database URL.",
      env_variable: 'DATABASE_PROVIDER',
      default_value: 'sqlite',
      user_viewable: 1,
      user_editable: 1,
      rules: 'required|string|in:sqlite,mysql,postgres',
    },
    {
      name: 'Database URL',
      description:
        "Connection string for an external database. Only needed when Database Provider is 'mysql' or 'postgres'. Examples - MySQL: mysql://user:pass@host:3306/linyashare; PostgreSQL: postgresql://user:pass@host:5432/linyashare. The database must already exist. Leave empty to use the built-in SQLite database.",
      env_variable: 'DATABASE_URL',
      default_value: 'file:/home/container/prisma/linyashare.db',
      user_viewable: 1,
      user_editable: 1,
      rules: 'nullable|string|max:255',
    },
  ],
};

// ── Write + validate the output ────────────────────────────────────────────────
const outDir = path.join(ROOT, 'egg');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'egg-linyashare.json');
const json = JSON.stringify(egg, null, 2) + '\n';
fs.writeFileSync(outFile, json);

// Re-parse for validation
JSON.parse(json);

console.log('✓ egg/egg-linyashare.json written (JSON valid)');
console.log('─ rendered startup (for visual inspection) ─');
console.log(startup.split(' && ').map((l, i) => String(i + 1).padStart(2, ' ') + '  ' + l).join('\n'));