---
title: Snapshots and backups
sidebar_position: 2
---

![Snapshots and backups](/customer-snapshots.png)

## Snapshots and automatic snapshots

Proxmox snapshots a whole server, so a snapshot covers the system disk **and the volumes attached to it** (detached
volumes are not included). There is no separate per-volume snapshot. On the server page (Snapshots tab) customers take
snapshots themselves and can switch on **automatic snapshots**:

- daily, or weekly on a chosen day, at a chosen hour in the panel's time zone (`PANEL_TIMEZONE`, default UTC);
- the last N automatic snapshots are kept (`auto_YYYYMMDDHHMMSS`, N up to the plan limit `MAX_SNAPSHOTS`); only
  automatic snapshots are ever removed to make room, never the customer's own. When the customer's own snapshots use
  every slot, the run fails and is shown on the card and in the activity log;
- a run is skipped while the server is busy, expired or installing updates; the scheduler checks every
  `SNAPSHOT_SCHEDULE_SECONDS` (default 300).

A **rollback** restores the configuration of that moment, so the panel brings its records in line afterwards: volumes are
attached or detached as in the restored configuration (a volume created later stays on the server as detached), network
cards of public addresses released since then are removed, and assigned addresses missing from the snapshot are put back
with the same MAC address.

Customer API: `GET/PUT /api/vms/:vmid/snapshot-schedule` (`{ frequency: off|daily|weekly, hour, weekday, keep }`).

## Backups on Proxmox Backup Server

Backups run on one or more **Proxmox Backup Servers** (PBS 3 or 4) that an owner connects under Backups → Backup servers
(address, API token, datastore, the clusters it serves; a self-signed certificate is pinned by its fingerprint).

**On the backup server**: create an API token (Configuration → Access Control → API Token) and give it the
`DatastoreAdmin` role on the datastore. The panel creates a namespace per customer (`panel/c<customer id>`), so backups of
one customer never sit next to another's, even when a VMID is reused. On each cluster the panel adds a storage entry of
type `pbs` per customer (`pbs<id>-c<customer id>`) when that customer's first backup runs.

**Encryption** (on by default): Proxmox makes a key per customer with the first backup; the panel keeps it sealed (like
other secrets) and owners can export it (`GET /api/admin/backups/keys/:userId`). Without the key nobody can read those
backups, the operator of the backup server included, so keep exported keys somewhere safe.

**Policies** say when and how long: daily, or weekly on a day, keeping N daily / weekly / monthly backups (Proxmox
prunes after every backup). A plan points to a policy; servers without one use the default policy; a server can get
its own policy from support, or the customer buys a policy that is sold as an **add-on** (monthly price, billed with
the server's renewal); servers can be excluded.

**Scheduler**: backups start only inside the **backup window** (panel time zone), at most N per node at a time, with a
bandwidth limit per job. A window belongs to the day it started, so 22:00 to 04:00 is one backup per server. A failed
backup is tried once more in the same window, then shown under Backups → Servers (Failing) and in Jobs (with retry).
Admin views: Overview (coverage, last 24 hours, needs attention), Runs, Servers (policy per server, back up now,
exclude), Restores, Policies and Backup servers.

**Customers** (Backups tab of a server): restore points with size and verify state, **Back up now** (`manualPerDay`
per server), **protect** up to 3 backups (kept until unprotected), browse the files of a backup and download a file or a
folder (zip) while the server keeps running, and **restore**:

- *as a new server*: next to the original, same node and plan, counted against the customer's limits and billed like a
  new server of that plan; only the system disk is restored (public addresses, GPUs and block storage volumes stay with
  the original);
- *over the server*: the server must be shut down and may hold no block storage volumes; optionally a backup of the
  current state first. Public addresses are put back afterwards.

**Deleted servers**: backups of a server that is no longer the customer's (deleted or unassigned) are kept for
`keepAfterDeleteDays` (default 14, 1 to 3650, set by administrators under Backups → Overview) after the panel noticed,
then removed, protected ones included. Customers don't see these backups.

| Variable | Default | Meaning |
|---|---|---|
| `BACKUP_TICK_SECONDS` | `60` | How often the scheduler looks for due backups and follows running ones |
| `BACKUP_RETRY_DELAY_SECONDS` | `900` | Pause before the second attempt of a failed scheduled backup |
| `BACKUP_PURGE_SECONDS` | `3600` | How often backups of deleted servers are checked (inside the window) |

Customer API: `GET /api/vms/:vmid/backups`, `POST /api/vms/:vmid/backups`, `PUT /api/vms/:vmid/backups/:id`
(`{ protected }`), `GET /api/vms/:vmid/backups/:id/files?path=`, `GET /api/vms/:vmid/backups/:id/download?path=`,
`POST /api/vms/:vmid/backups/:id/restore` (`{ mode: new|replace, hostname, backupFirst }`),
`PUT /api/vms/:vmid/backups/addon` (`{ policyId }`). API tokens need the *servers* permission for changes (*billing* for
the add-on).
