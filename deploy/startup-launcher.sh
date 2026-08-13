#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LinyaShare – Egg startup (LAUNCHER)
# This is the (short) command that stands alone in the egg startup and is
# executed by the panel. It contains ONLY the parts that need panel substitution
# ({{SERVER_PORT}}), performs the self-clone of the repo and hands the real
# logic over to `deploy/startup.sh` from the repo.
#
# IMPORTANT: except for {{SERVER_PORT}}, do not add any further `{{...}}` spots –
# everything else lives in deploy/startup.sh and is read from the environment.
# ─────────────────────────────────────────────────────────────────────────────
mkdir -p /home/container && cd /home/container || exit 1
if [ ! -d .git ]; then echo "[startup] No repo found -> git clone"; git clone -b "${GIT_BRANCH:-main}" "${GIT_REPO:-https://github.com/LinyaVT/LinyaShare.git}" .; fi
export PORT={{SERVER_PORT}}
# exec: makes the chain PID 1 -> bash -> ... -> node entry.js, so the
# init wrapper (deploy/entry.js, see there) is PID 1. Only then do
# stop signals (^C = SIGINT, sent by FeatherPanel/WINGS) reach the process
# directly, and the container stops cleanly instead of staying hung.
exec bash deploy/startup.sh