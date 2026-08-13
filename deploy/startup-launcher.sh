#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LinyaShare – Egg-Startup (LAUNCHER)
# Das ist der (kurze) Befehl, der im Egg-Startup einzeln steht und vom
# Panel ausgeführt wird. Er enthält NUR die Stellen, die Panel-Substitution
# brauchen ({{SERVER_PORT}}), macht den Repo-Selbst-Clone und übergibt die
# eigentliche Logik an `deploy/startup.sh` aus dem Repo.
#
# WICHTIG: Ausser {{SERVER_PORT}} erst keine `{{...}}`-Stellen hinzufügen –
# alles Weitere steht in deploy/startup.sh und wird aus der Umgebung gelesen.
# ─────────────────────────────────────────────────────────────────────────────
mkdir -p /home/container && cd /home/container || exit 1
if [ ! -d .git ]; then echo "[startup] Kein Repo gefunden -> git clone"; git clone -b "${GIT_BRANCH:-main}" "${GIT_REPO:-https://github.com/LinyaVT/LinyaShare.git}" .; fi
export PORT={{SERVER_PORT}}
# exec: macht die Kette PID 1 -> bash -> ... -> node entry.js, damit der
# Init-Wrapper (deploy/entry.js, sieh dort) PID 1 ist. Nur dann erreichen
# Stop-Signale (^C = SIGINT, sendet FeatherPanel/WINGS) den Prozess direkt,
# und der Container stoppt sauber statt gehängt zu bleiben.
exec bash deploy/startup.sh