import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const updater = read("update.sh");
const setup = read(".container/setup.sh");
const compose = read(".container/docker-compose.yml");
const deployExample = read(".container/deploy.env.example");
const watcher = read(".container/update-watcher/codelogicx-update-watcher.sh");
const watcherInstaller = read(".container/update-watcher/install.sh");
const watcherService = read(".container/update-watcher/codelogicx-update-watcher.service");
const watcherTimer = read(".container/update-watcher/codelogicx-update-watcher.timer");

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
  "networks: [codelogicx]"
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
