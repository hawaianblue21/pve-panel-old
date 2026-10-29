---
title: Install without Docker
sidebar_position: 5
---

Run PVE Panel directly with Node.js on a Linux host (a VM, a container or a small server).
There is nothing to compile: the panel uses Node's built-in `node:sqlite`.

## Requirements

| Item | Requirement |
|---|---|
| Node.js | **22.13 or newer** (`node -v`), the newest patch release of 22 or 24 (see the warning below) |
| Host | Linux with `git`; 1 vCPU and 1 GB RAM are enough to start |
| Network | Outbound HTTPS to the Proxmox API (port 8006); inbound TCP 3000 (customer portal), or 443 on a reverse proxy |
| Proxmox | An API token for the panel and the `customers` pool, see [Proxmox permissions](proxmox.md) |
| Clock | Correct time (NTP): two-factor codes depend on it |

:::warning Keep Node.js patched
Use the newest patch release of Node.js 22 or 24 (at least **22.23.4** or **24.22.1**,
which fix CVE-2026-111497 in the bundled Brotli decoder and further security issues).
The Docker image already contains a fixed version.
:::

## 1. Get the panel

```bash
sudo useradd --system --create-home --home-dir /opt/pve-panel --shell /usr/sbin/nologin pvepanel
sudo -u pvepanel git clone https://github.com/hawaianblue21/pve-panel.git /opt/pve-panel/app
cd /opt/pve-panel/app
sudo -u pvepanel npm ci --omit=dev
```

## 2. Configure `.env`

The panel reads `.env` from the folder it is started in (`/opt/pve-panel/app`).

```bash
sudo -u pvepanel cp example.env .env
sudo -u pvepanel chmod 600 .env
# a long random secret for JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

A complete starting point for production behind HTTPS. Replace everything marked `CHANGE`:

```env
# ---- Required: the panel does not start without these four ----
JWT_SECRET=CHANGE-the-48-byte-hex-string-from-the-command-above
PVE_URL=https://pve.example.com:8006
PVE_TOKEN_ID=panel@pve!panel
PVE_TOKEN_SECRET=CHANGE-00000000-0000-0000-0000-000000000000

# ---- Proxmox ----
PVE_VERIFY_TLS=true
# Needed when Proxmox uses its own (self-signed) certificate: copy /etc/pve/pve-root-ca.pem
# from a cluster node to the panel host and point to it
PVE_CA_FILE=/opt/pve-panel/pve-root-ca.pem
PVE_POOL=customers
# PVE_CLUSTER_NAME=Main

# ---- Listening addresses ----
HOST=127.0.0.1                  # 0.0.0.0 only if clients reach the panel without a reverse proxy
PORT=3000
ADMIN_HOST=127.0.0.1            # keep local; reach it through an SSH tunnel or VPN
ADMIN_PORT=3001

# ---- Public addresses and cookies ----
COOKIE_SECURE=true              # false only for tests over plain http
PANEL_PUBLIC_URL=https://panel.example.com
ADMIN_PUBLIC_URL=http://localhost:3001
PASSKEYS_ENABLED=true

# ---- Data ----
DB_PATH=/opt/pve-panel/data/panel.db

# ---- First administrator (created on the first start only; remove the password afterwards) ----
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=CHANGE-a-long-password
INITIAL_ADMIN_REQUIRE_2FA=false

# ---- Optional ----
PANEL_NAME=PVE Panel
PANEL_TIMEZONE=UTC
UPDATE_CHECK=true
MAX_SNAPSHOTS=3
LOGIN_RATE_LIMIT=10
```

### Parameters to fill in

**Required** (the panel stops at start-up with `Missing required environment variable …` otherwise):

| Parameter | What to enter |
|---|---|
| `JWT_SECRET` | A long random string. It signs sessions **and** encrypts stored secrets (SMTP password, gateway keys). Keep it safe and **never change it** later: stored secrets would become unreadable and have to be entered again. |
| `PVE_URL` | Address of one Proxmox node or cluster endpoint, for example `https://pve.example.com:8006`. |
| `PVE_TOKEN_ID` | The token's ID, for example `panel@pve!panel`. |
| `PVE_TOKEN_SECRET` | The secret shown once when you created the token. |

**Recommended for production:**

| Parameter | Default | Meaning |
|---|---|---|
| `PVE_VERIFY_TLS` | `true` | Keep `true`. For a self-signed Proxmox certificate set `PVE_CA_FILE` instead of turning this off. |
| `PVE_CA_FILE` | empty | Path to `pve-root-ca.pem` copied from your cluster. |
| `PVE_POOL` | `customers` | The Proxmox resource pool that holds customer servers. It must exist and the token needs rights on it. |
| `HOST`, `PORT` | `0.0.0.0`, `3000` | Where the customer portal listens. Use `127.0.0.1` when a reverse proxy runs on the same host. |
| `ADMIN_HOST`, `ADMIN_PORT` | `127.0.0.1`, `3001` | Where the admin portal listens. Only set `0.0.0.0` behind a firewall. |
| `COOKIE_SECURE` | `true` | Needs HTTPS for customers. Set `false` only for local tests over plain http. |
| `PANEL_PUBLIC_URL` | empty | The address customers use (`https://panel.example.com`). Needed for passkeys, single sign-on callbacks and links in emails. |
| `ADMIN_PUBLIC_URL` | empty | The address you use for the admin portal, for example `http://localhost:3001` through a tunnel. |
| `DB_PATH` | `./data/panel.db` | The SQLite database. Use a path outside the code folder so updates never touch it. |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | empty | Creates the first administrator on the first start when no account exists. Remove the password from `.env` afterwards. |

**Optional features** (all off by default; see `example.env` for the full list):

| Feature | Parameters |
|---|---|
| Private network per customer | `CUSTOMER_NETWORKS=true`, `SDN_ZONE`, `CUSTOMER_NET_PREFIX`, `CUSTOMER_NET_DNS`, `CUSTOMER_BLOCKED_NETS` ([Customer networks](../networking/customer-networks.md)) |
| WireGuard VPN | `VPN_ENABLED=true` (needs `CUSTOMER_NETWORKS=true`), `VPN_GATEWAY_VMID`, `VPN_ENDPOINT`, `VPN_NET_PREFIX`, `VPN_MAX_DEVICES` ([WireGuard](../networking/wireguard-vpn.md)) |
| Tailscale | `TAILSCALE_ENABLED=true` ([Tailscale](../networking/tailscale.md)) |
| Single sign-on (OIDC) | `OIDC_ENABLED=true`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_PORTALS`, `PANEL_PUBLIC_URL` / `ADMIN_PUBLIC_URL` ([Single sign-on](../security/single-sign-on.md)) |
| Password sign-in per portal | `PASSWORD_LOGIN_CUSTOMER`, `PASSWORD_LOGIN_ADMIN` (turning one off requires OIDC for that portal) |
| Branding | `PANEL_NAME`, `BRANDING_DIR` ([Branding](../administration/branding.md)) |
| Time zone for schedules | `PANEL_TIMEZONE` (automatic snapshots, rollout windows) |
| Background intervals | `EXPIRY_CHECK_SECONDS`, `WINUPDATE_POLL_SECONDS`, `AUTORENEW_INTERVAL_SECONDS`, `SNAPSHOT_SCHEDULE_SECONDS`, `BACKUP_TICK_SECONDS`, `BACKUP_RETRY_DELAY_SECONDS`, `BACKUP_PURGE_SECONDS` |
| OS template import | `TEMPLATE_IMPORTS_PARALLEL`, `TEMPLATE_TEST_BOOT_SECONDS`, `UPLOAD_DIR`, `TEMPLATE_UPLOAD_MAX_GB` |

Email (SMTP), payment gateways (Xendit, Midtrans), Proxmox Backup Server, SeaweedFS, PowerDNS, Zammad and the AI
assistant are **not** set in `.env`: you connect them later in the admin portal, where their secrets are stored
encrypted.

:::tip Checks the panel makes at start-up
It stops with a clear message when `VPN_ENABLED` is set without `CUSTOMER_NETWORKS`, when `OIDC_ENABLED` is set
without an issuer and client ID, or when password sign-in is off for a portal that has no single sign-on, so that
nobody could sign in.
:::

## 3. Create the first administrator

Either set `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in `.env` (created on the first start), or use the
command line:

```bash
sudo -u pvepanel npm run user:create -- admin@example.com 'a-long-password' --admin
```

## 4. Start it

Try it in the foreground first:

```bash
sudo -u pvepanel npm start
```

Then open `http://<host>:3000` (customers) and, from the host itself or through a tunnel, `http://127.0.0.1:3001`
(administrators):

```bash
ssh -L 3001:127.0.0.1:3001 user@panel-host      # then browse to http://localhost:3001
curl -s http://127.0.0.1:3000/healthz            # liveness check
```

For local tests over plain http set `COOKIE_SECURE=false`, otherwise the browser won't store the session cookie.

## 5. Run it as a service

Create `/etc/systemd/system/pve-panel.service` (check the path of Node with `command -v node`):

```ini
[Unit]
Description=PVE Panel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pvepanel
Group=pvepanel
WorkingDirectory=/opt/pve-panel/app
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning src/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/opt/pve-panel

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pve-panel
sudo systemctl status pve-panel
journalctl -u pve-panel -f
```

## 6. HTTPS

Put a reverse proxy in front of port 3000 (Caddy, nginx, Traefik) and forward WebSockets, which the browser console
needs. See [Reverse proxy](reverse-proxy.md). With the proxy on the same host, set `HOST=127.0.0.1`,
`COOKIE_SECURE=true` and `PANEL_PUBLIC_URL=https://panel.example.com`.

## Backups

Back up the database and keep `JWT_SECRET` with it. A consistent copy while the panel runs:

```bash
sudo -u pvepanel npm run db:backup        # writes to data/backups/ next to the database
```

## Updating

```bash
cd /opt/pve-panel/app
sudo -u pvepanel git pull
sudo -u pvepanel npm ci --omit=dev
sudo systemctl restart pve-panel
```

The database is migrated at start-up. The admin portal's **About** tab shows the running version and whether a newer
release exists.
