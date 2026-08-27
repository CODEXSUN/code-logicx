# CodeLogicX container deployment

This directory owns the Docker deployment for the CodeLogicX API and web application.

The deployment includes:

- the CodeLogicX API
- the CodeLogicX web application
- a dedicated or shared MariaDB service
- persistent Codex state, repositories, and worktrees

The deployment does not create Redis. It connects to an existing private Redis service when
`REDIS_URL` is set.

## Files

| File | Purpose |
| --- | --- |
| `.env.example` | Production application settings template. |
| `deploy.env.example` | Docker topology and infrastructure settings template. |
| `docker-compose.yml` | API, web, MariaDB, volumes, networks, and health checks. |
| `setup.sh` | Interactive first installation. |
| `../update.sh` | Backup, migration, update, health check, and rollback workflow. |
| `scripts/Dockerfile.stack` | Verify, API, and web image targets. |
| `scripts/nginx-spa.conf` | Static web, API proxy, and WebSocket proxy configuration. |
| `update-watcher/` | Optional systemd update watcher. |

## Requirements

- Ubuntu or another supported Linux VPS
- Docker Engine with Docker Compose
- Git
- a public HTTPS domain and reverse proxy
- MariaDB 11.8 or a compatible shared MariaDB service
- Redis 6.2 or later when Redis delivery is enabled

Keep the repository at `/home/codelogicx` for the standard update watcher.

## First installation

1. Clone the repository.
2. Open the repository directory.
3. Run the setup script.
4. Review `.env` and `.container/deploy.env`.
5. Start the deployment.

```sh
cd /home/codelogicx
sudo bash .container/setup.sh
docker compose \
  --env-file .env \
  --env-file .container/deploy.env \
  -f .container/docker-compose.yml \
  up -d --build
```

The setup script can create a dedicated MariaDB service. It can also reuse a MariaDB container on
an existing Docker network.

Protect both environment files:

```sh
chmod 600 .env .container/deploy.env
```

Do not commit either generated environment file.

## Repository storage and GitHub Dashboard

The API uses `/srv/codelogicx/repositories` for both `CODELOGICX_WORKSPACE_ROOT` and
`CODELOGICX_AGENT_ALLOWED_ROOTS`. Docker Compose mounts the persistent `agent-repositories` volume
at that path. The GitHub Dashboard discovers complete Git repositories below this root. An empty
root is valid and produces an empty project list.

Keep these settings aligned if you customize the mount. Confirm that the unprivileged API user can
read and write the directory:

```sh
docker exec codelogicx-api sh -lc \
  'printf "%s\\n" "$CODELOGICX_WORKSPACE_ROOT"; test -r "$CODELOGICX_WORKSPACE_ROOT"; test -w "$CODELOGICX_WORKSPACE_ROOT"'
```

Do not point the workspace root at `/workspace/codelogicx`. Application source and managed project
repositories have separate lifecycles.

## Application URLs

Use one public HTTPS origin for the web application, REST API, and Socket.IO paths.

```dotenv
NODE_ENV=production
PLATFORM_API_URL=https://app.example.com
PLATFORM_WEB_ORIGIN=https://app.example.com
PLATFORM_WEB_ORIGINS=https://app.example.com
VITE_PLATFORM_API_URL=/api/platform
VITE_MOBILE_API_URL=https://app.example.com
```

The outer reverse proxy must forward HTTPS requests to the CodeLogicX web container. The web
container forwards API and Socket.IO requests to the API container.

## Existing Redis service

CodeLogicX uses Redis for two optional delivery paths:

- BullMQ accelerates notification delivery
- the Socket.IO Redis adapter sends events across API containers.

MariaDB remains the durable notification and job authority. If Redis is not configured or cannot
connect, the API uses the database queue and the local Socket.IO adapter.

### Redis container on the same Docker network

Connect the Redis container and CodeLogicX to the same private Docker network. Use the Redis service
name in the URL.

```dotenv
REDIS_URL=redis://codelogicx:replace-with-password@redis:6379/0
```

Set the shared network in `.container/deploy.env`:

```dotenv
CODELOGICX_NETWORK=cxapp-network
CODELOGICX_NETWORK_EXTERNAL=true
```

### Redis service on the VPS host

The API container maps `host.docker.internal` to the Linux host gateway.

```dotenv
REDIS_URL=redis://codelogicx:replace-with-password@host.docker.internal:6379/0
```

Do not use `127.0.0.1` for a host Redis service from inside the API container.

Configure Redis to accept only the private Docker bridge or private server network. Require an ACL
user and password. Do not publish port 6379 to the internet.

Use `rediss://` when Redis requires TLS. Encode special characters in the user name and password.

### Redis compatibility

BullMQ requires Redis 5 or later. Redis 6.2 or later is recommended. The API supports authenticated
`redis://` and TLS `rediss://` URLs.

The API limits initial Redis connection retries. It starts with database and local socket fallback
when the configured Redis service is unavailable.

## BullMQ behavior

The notification repository writes every notification job to MariaDB first. BullMQ receives the
database job identifier and handles delivery attempts.

BullMQ uses:

- five delivery attempts;
- exponential retry delay;
- completed-job cleanup;
- retained failed jobs for inspection.

Do not use Redis as the only notification record. Do not delete MariaDB queue records to clear a
Redis problem.

## WebSocket and Socket.IO

CodeLogicX exposes these Socket.IO paths:

- `/api/codelogicx/messaging/socket.io`
- `/api/codelogicx/notifications/socket.io`

Both paths require the same bearer token as the REST API. Nginx forwards the `Upgrade` and
`Connection` headers. Socket.IO uses HTTP polling when WebSocket is unavailable.

The standard deployment runs one API container. If you add API containers, configure sticky
sessions at the outer load balancer. Socket.IO polling requires sticky sessions.

The Redis adapter uses separate channel prefixes for Messenger and notifications. Redis must remain
inside trusted infrastructure because Pub/Sub packets are not application-signed.

## Normal REST API

REST and Socket.IO use the same public HTTPS origin. Keep these paths routed to the API container:

- `/api/platform/` for Platform, Blog, and File Manager routes
- `/api/codelogicx/` for CodeLogicX routes and Socket.IO.

Do not expose the API container directly to the internet. The Compose file binds API and web ports
to `127.0.0.1` by default.

## Mobile application

Build the mobile application with the public HTTPS origin:

```sh
export VITE_MOBILE_API_URL=https://app.example.com
npm run mobile:build
npm run mobile:sync
```

A physical device cannot use a VPS loopback address. Mobile pairing accepts HTTPS endpoints and
local development endpoints only.

Mobile Messenger connects to the Messenger Socket.IO path. It tries WebSocket first and HTTP polling
second. Initial loading and message sending continue through the REST API.

## Reverse proxy

Terminate TLS at the outer reverse proxy. Forward the public domain to the web container at
`127.0.0.1:9160` unless the deployment uses another host port.

The outer proxy must preserve these headers:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Use a proxy read timeout longer than the Socket.IO heartbeat interval.

## Start and status

```sh
cd /home/codelogicx
docker compose \
  --env-file .env \
  --env-file .container/deploy.env \
  -f .container/docker-compose.yml \
  up -d

docker compose \
  --env-file .env \
  --env-file .container/deploy.env \
  -f .container/docker-compose.yml \
  ps
```

## Deployment verification

Run these checks after every deployment:

```sh
docker exec codelogicx-api sh -lc 'id; git --version'
docker exec codelogicx-api sh -lc 'test -w "$CODELOGICX_CODEX_HOME"'
docker exec codelogicx-api sh -lc 'test -w "$CODELOGICX_AGENT_WORKTREE_ROOT"'
docker exec codelogicx-api sh -lc 'test -w "$CODELOGICX_AGENT_ALLOWED_ROOTS"'
docker exec codelogicx-api npm run db:migrations:list
curl -fsS https://app.example.com/health
curl -fsS 'https://app.example.com/api/codelogicx/messaging/socket.io/?EIO=4&transport=polling'
```

Test Redis from the API container:

```sh
docker exec codelogicx-api node --input-type=module -e \
  'import Redis from "ioredis"; const client=new Redis(process.env.REDIS_URL); await client.ping().then(console.log); client.disconnect()'
```

The Redis command must print `PONG`. The Socket.IO request must return an Engine.IO open packet.

Check the API logs:

```sh
docker logs codelogicx-api 2>&1 | grep -E \
  'socket.redis.ready|socket.redis.fallback|queue.redis.fallback|server.listen'
```

A connected Redis service produces one ready log for Messenger and one for notifications. A
fallback log means that the API stayed available without Redis.

## Updates

Run the repository-owned updater:

```sh
cd /home/codelogicx
bash update.sh --check
sudo bash update.sh --yes
```

The updater verifies Docker, creates a MariaDB backup, runs migrations, replaces API and web, and
checks health endpoints. It does not prune volumes or unrelated Docker resources.

## Automatic update watcher

Install the watcher after the first successful manual deployment:

```sh
cd /home/codelogicx
sudo bash .container/update-watcher/install.sh
sudo /usr/local/sbin/codelogicx-update-watcher --check
systemctl list-timers codelogicx-update-watcher.timer --no-pager
```

Inspect watcher runs:

```sh
systemctl status codelogicx-update-watcher.timer --no-pager
journalctl -u codelogicx-update-watcher.service -n 200 --no-pager
```

## Troubleshooting

### Redis reports `NOAUTH`

Add the Redis ACL user and password to `REDIS_URL`. Do not print the URL in deployment logs.

### Redis connects on the VPS but not in Docker

Use the Redis container DNS name on a shared network. For a host service, use
`host.docker.internal` instead of `127.0.0.1`.

### WebSocket returns an HTTP error

Check the outer proxy upgrade headers. Confirm that the Socket.IO path reaches the CodeLogicX web
container. Test HTTP polling to separate proxy problems from authentication problems.

### Mobile cannot connect

Confirm that the mobile build uses the public HTTPS origin. Confirm that the TLS certificate is
valid on the physical device. Do not use a local or VPS loopback address.

### API starts with Redis fallback

Check the Redis address, ACL, password, TLS setting, network, and firewall. The API and REST routes
remain available while the database queue handles delivery.

### Multiple API containers lose polling sessions

Enable sticky sessions at the outer load balancer. Keep the Socket.IO Redis adapter enabled for
cross-container event delivery.

## Security rules

- Keep `.env` and `.container/deploy.env` outside Git.
- Keep Redis and MariaDB on private networks.
- Require Redis ACL authentication.
- Use HTTPS and WSS for public traffic.
- Do not expose API, MariaDB, or Redis ports publicly.
- Do not run the API as root.
- Do not use recursive `chmod 777`.
- Do not bake secrets into an image.
- Do not remove persistent volumes during a normal update.
