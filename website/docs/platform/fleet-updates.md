---
title: Fleet updates and rollouts
sidebar_position: 7
---

![Fleet updates and rollouts](/admin-fleet-updates.png)

## Windows

Customers install the latest Windows updates from the server page — **Updates** tab:

- security and critical updates (default), or all quality updates — never feature upgrades or previews
- optional **snapshot first**, so a bad update can be rolled back
- restarts automatically when needed (or waits for *Restart now*) and continues until Windows is up to date
- live progress and a list of installed updates; failures explained in plain words

Runs through the QEMU guest agent and Windows' own update API; respects WSUS/group policy. Switch it off under **Settings → Operating system updates**.

Details: [Windows updates](https://hawaianblue21.github.io/pve-panel/docs/features/windows-updates).

## Linux (apt / dnf)

The same tab on Linux virtual machines installs package updates from the distribution's own repositories:

- **Security updates only** (default; packages from a `*-security` archive on Debian/Ubuntu, `dnf --security` on RHEL,
  Rocky, Alma, Fedora) or **all package updates**
- optional **snapshot first**; at least 1 GB free on `/` is checked before starting
- never: release upgrades (e.g. 24.04 → 26.04), removing packages, held (`apt-mark hold`) or version-locked packages;
  changed configuration files are kept (`--force-confold`)
- after a new kernel or system libraries: **restart automatically** (optional) or a *Restart now* reminder until the server
  has been restarted

How it works: the panel copies `src/guest/linux-update.sh` into the server through the QEMU guest agent and starts it
detached (`systemd-run`, or `setsid` without systemd), then reads its progress file
(`/var/lib/pvepanel/update-status.json`). Containers (LXC) have no guest agent and are not offered. Switch Linux updates
off separately under **Settings → Operating system updates**.

---

## Fleet view and rollouts (admin portal)

**Updates** shows every customer server with its OS and last update run: up to date, never updated, older than 30 days,
failed, running. Administrators with `updates.write` (Operator role) select servers and start a **rollout**:

```text
Ring 1 (10 %) ──► all finished, ≤ limit failed? ──► Ring 2 (30 %) ──► … ──► Done
                         └── more failed ──► Paused: check the servers, then Resume (next ring) or Cancel
```

Each run is an ordinary update run (security or all updates, snapshot first, restart when needed) with the same
checks as when a customer starts it; servers that can't run (stopped, no guest agent, updates switched off, expired)
are skipped with the reason. Customers get an email when their server is updated.

- **Maintenance window** (optional): days of the week and hours in the panel's time zone (`PANEL_TIMEZONE`, e.g.
  Sat and Sun 01:00–05:00; an end before the start runs past midnight). Outside it no new run starts and the rollout
  shows *Waiting for the maintenance window*; runs already started finish.
- **Check now**: counts pending updates inside the selected running servers (apt / dnf simulation, Windows Update
  search; nothing is downloaded or installed), four at a time, and shows *N pending (M security)* with the time of the
  check, so you see what a rollout would bring. Windows searches can take minutes.

**Jobs** lists background work: servers being set up, reinstalled or deleted (and failed ones), update runs, rollouts,
and finished work of the last 7 days. Failed work can be **retried** where the panel has everything it needs:

| Failed job | Retry | Permission |
|---|---|---|
| Deleting a server | deletes again (the server must be shut down) | `servers.delete` |
| Update run (the server's latest) | starts the run again with the same options | `updates.write` |
| Automatic snapshot (the server's latest) | takes the snapshot now | `servers.manage` |
| Creating or reinstalling a server | not possible: it needs the customer's sign-in details, so the customer reinstalls or deletes it | |
