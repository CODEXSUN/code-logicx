import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const updater = read("update.sh");
const setup = read(".container/setup.sh");
const compose = read(".container/docker-compose.yml");
const runtimeExample = read(".container/.env.example");
const deployExample = read(".container/deploy.env.example");
const watcher = read(".container/update-watcher/codelogicx-update-watcher.sh");
const watcherInstaller = read(".container/update-watcher/install.sh");
const watcherService = read(".container/update-watcher/codelogicx-update-watcher.service");
const watcherTimer = read(".container/update-watcher/codelogicx-update-watcher.timer");
const nginx = read(".container/scripts/nginx-spa.conf");
const containerReadme = read(".container/README.md");

requireTokens("update.sh", updater, [
  "umask 077",
  "flock -n 9",
  "--allow-dirty",
  "CODELOGICX_MIGRATION_COMPATIBLE_VERSION",
  "sha256sum --check",
  "write_deployment_metadata",
  "require_free_space",
  "rollback_application"
]);
requireTokens(".container/setup.sh", setup, [
  "CODELOGICX_COMPOSE_PROJECT",
  "CODELOGICX_MIGRATION_COMPATIBLE_VERSION",
  "Standalone CodeLogicX deployment plan"
]);
requireTokens(".container/docker-compose.yml", compose, [
  "name: ${CODELOGICX_COMPOSE_PROJECT:-codelogicx}",
  "CODELOGICX_ENV_FILE_PATH: /workspace/codelogicx/.env",
  "CODELOGICX_WORKSPACE_ROOT: /srv/codelogicx/repositories",
  "CODELOGICX_AGENT_ALLOWED_ROOTS: /srv/codelogicx/repositories",
  "agent-repositories:/srv/codelogicx/repositories",
  "networks: [codelogicx]",
  "host.docker.internal:host-gateway"
]);
requireTokens(".container/.env.example", runtimeExample, [
  "CODELOGICX_WORKSPACE_ROOT=/srv/codelogicx/repositories",
  "CODELOGICX_AGENT_ALLOWED_ROOTS=/srv/codelogicx/repositories",
  "REDIS_URL="
]);
requireTokens(".container/scripts/nginx-spa.conf", nginx, [
  'proxy_set_header Upgrade $http_upgrade;',
  'proxy_set_header Connection "upgrade";',
  "proxy_read_timeout 75s;"
]);
requireTokens(".container/README.md", containerReadme, [
  "## Existing Redis service",
  "## Repository storage and GitHub Dashboard",
  "## BullMQ behavior",
  "## WebSocket and Socket.IO",
  "## Normal REST API",
  "## Mobile application",
  "host.docker.internal",
  "REDIS_URL=redis://",
  "VITE_MOBILE_API_URL=https://app.example.com"
]);
requireTokens(".container/deploy.env.example", deployExample, [
  "CODELOGICX_VERSION=",
  "CODELOGICX_MIGRATION_COMPATIBLE_VERSION=",
  "CODELOGICX_UPDATE_MIN_BACKUP_FREE_MB=",
  "CODELOGICX_UPDATE_MIN_DOCKER_FREE_MB="
]);
requireTokens(".container/update-watcher/codelogicx-update-watcher.sh", watcher, [
  "flock -n 9",
  "merge-base --is-ancestor",
  "worktree add --detach",
  "docker build --target verify",
  "merge --ff-only",
  "bash \"$REPO_DIR/update.sh\" --check",
  "bash \"$REPO_DIR/update.sh\" --yes",
  '"$STATE_DIR/config-backups/deploy.env.pre-${target_commit:0:12}"',
  "com.docker.compose.oneoff=True",
  "last-successful-commit"
]);
requireTokens(".container/update-watcher/install.sh", watcherInstaller, [
  "/usr/local/sbin/codelogicx-update-watcher",
  "systemctl enable --now codelogicx-update-watcher.timer"
]);
requireTokens(".container/update-watcher/codelogicx-update-watcher.service", watcherService, [
  "Type=oneshot",
  "Requires=docker.service",
  "/root/.docker",
  "TimeoutStartSec=1h"
]);
requireTokens(".container/update-watcher/codelogicx-update-watcher.timer", watcherTimer, [
  "OnUnitActiveSec=5min",
  "Persistent=true"
]);

console.info("CodeLogicX deployment scripts verified.");

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function requireTokens(file, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${file}: missing ${token}`);
  }
}
