# Docker Deployment Runtime

CodeLogicX Docker deployment separates immutable application files from mutable Agent state. The API
image includes Git and starts through `api-entrypoint.sh`, which prepares the mounted runtime
directories and then drops privileges to the `node` user.

Compose owns three persistent Agent volumes:

- `/var/lib/codelogicx/codex` for Codex authentication and state;
- `/srv/codelogicx/repositories` for complete Git repositories;
- `/var/lib/codelogicx/worktrees` for isolated Agent worktrees.

Setup and update preflight checks confirm that the API runs as UID 1000, Git is executable, and all
three directories are writable. A project must reference a complete clone below the repository
root. An empty `git init` in the application image is not a valid source repository.

Use these checks after deployment:

```sh
docker exec codelogicx-api sh -lc 'id; git --version'
docker exec codelogicx-api sh -lc 'test -w "$CODELOGICX_CODEX_HOME"'
docker exec codelogicx-api sh -lc 'test -w "$CODELOGICX_AGENT_WORKTREE_ROOT"'
docker exec codelogicx-api sh -lc 'test -w "$CODELOGICX_AGENT_ALLOWED_ROOTS"'
```

Do not run the API as root, apply recursive `chmod 777`, bake secrets into the image, or mount Git
metadata without its matching checkout.

## Redis, BullMQ, WebSocket, and mobile

CodeLogicX does not create Redis in its Docker Compose file. Connect the API to the existing Redis
service on the VPS. MariaDB remains the notification queue authority when Redis is unavailable.

Use one of these private connection paths:

1. Connect the Redis container and CodeLogicX to the same Docker network.
2. Use the Redis service name in `REDIS_URL`, such as `redis://user:password@redis:6379/0`.
3. If Redis runs on the VPS host, use `host.docker.internal` as the host name.

The API Compose service maps `host.docker.internal` to the Linux host gateway. Do not use
`127.0.0.1` for a host Redis service from inside the API container.

Set the URL in `/home/codelogicx/.env`:

```dotenv
REDIS_URL=redis://codelogicx:replace-with-password@host.docker.internal:6379/0
```

Use `rediss://` when Redis requires TLS. Encode special characters in the user name and password.
Keep Redis on a private network. Require an ACL user and password. Do not expose port 6379 to the
public internet. Use Redis 6.2 or later for BullMQ compatibility.

Redis has two jobs in CodeLogicX:

- BullMQ accelerates notification delivery. MariaDB stores the durable notification and job state.
- The Socket.IO Redis adapter sends Messenger and notification events across API containers.

Nginx forwards WebSocket upgrade headers for `/api/codelogicx/`. Socket.IO uses HTTP polling when a
WebSocket connection is unavailable. The normal REST API uses the same HTTPS origin and bearer
token.

The default Docker topology runs one API container. If you add more API containers, configure
sticky sessions at the outer load balancer because Socket.IO polling requires them.

Set the public origins in the production environment:

```dotenv
PLATFORM_API_URL=https://app.example.com
PLATFORM_WEB_ORIGIN=https://app.example.com
PLATFORM_WEB_ORIGINS=https://app.example.com
VITE_PLATFORM_API_URL=/api/platform
VITE_MOBILE_API_URL=https://app.example.com
```

Build the mobile application with the public HTTPS origin. A physical device cannot use the VPS
loopback address. The mobile Messenger connects to the same Socket.IO path and keeps REST as its
initial-load and send fallback.

Run these checks after deployment:

```sh
docker compose --env-file .env --env-file .container/deploy.env -f .container/docker-compose.yml ps
docker exec codelogicx-api node --input-type=module -e 'import Redis from "ioredis"; const client=new Redis(process.env.REDIS_URL); await client.ping().then(console.log); client.disconnect()'
curl -fsS https://app.example.com/health
curl -fsS 'https://app.example.com/api/codelogicx/messaging/socket.io/?EIO=4&transport=polling'
docker logs codelogicx-api 2>&1 | grep -E 'socket.redis.ready|server.listen'
```

The Redis command must print `PONG`. The Socket.IO request must return an Engine.IO open packet.
The API log must show one Redis channel for Messenger and one for notifications.

## Ubuntu production update watcher

The production checkout stays at `/home/codelogicx`. A systemd timer checks `origin/main` every five
minutes. It accepts fast-forward commits only and builds the candidate Docker `verify` target in a
detached temporary worktree before changing the live checkout.

Install the watcher after the first manual deployment:

```sh
cd /home/codelogicx
sudo bash .container/update-watcher/install.sh
sudo /usr/local/sbin/codelogicx-update-watcher --check
systemctl list-timers codelogicx-update-watcher.timer --no-pager
```

Each accepted update follows this order:

1. Lock the watcher and require a clean `/home/codelogicx` `main` checkout.
2. Fetch and require a fast-forward `origin/main` commit.
3. Build the candidate verification image in an isolated Git worktree.
4. Fast-forward the production checkout and copy the current deployment environment as a backup.
5. Align only the three release-version fields. Preserve every secret and topology value.
6. Run `bash update.sh --check`, then the guarded `bash update.sh --yes` flow.
7. Let the updater verify Docker, create and checksum a MariaDB backup, migrate, seed, replace only
   API and Web, verify both health endpoints, and write deployment metadata.
8. Remove only stopped CodeLogicX Compose one-off containers and unused images in the configured
   CodeLogicX image namespace. Never prune volumes or unrelated Docker resources.
9. Record the successful commit and version below `/var/lib/codelogicx-update-watcher`.

Inspect every automatic run through the system journal:

```sh
systemctl status codelogicx-update-watcher.timer --no-pager
journalctl -u codelogicx-update-watcher.service -n 200 --no-pager
cat /var/lib/codelogicx-update-watcher/last-successful-commit
cat /var/lib/codelogicx-update-watcher/last-successful-version
```

If Git diverges, the checkout is dirty, isolated verification fails, backup or migration fails, or
health checks fail, the run stops. Do not force-reset production or automatically reverse a
completed migration. Review the journal, retained backup, and deployment metadata before retrying.
