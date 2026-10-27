---
title: Introduction
sidebar_position: 1
slug: /intro
---

**PVE Panel** turns a Proxmox VE environment into a lightweight self-service platform.
Customers sign in to their own portal and manage **only the servers assigned to them**:
power actions, live status, usage graphs, snapshots (also automatic ones), backups, a browser
console, VPN access, storage, public IP addresses, billing and support. When you allow it,
they also create, reinstall and resize servers from templates and plans you offer.

Administrators keep control over templates, plans, quotas, ownership, networking, billing,
sign-in methods and the lifecycle of every server, in a separate admin portal with an
overview of all Proxmox clusters, nodes, alerts and jobs.

![Customer dashboard](/customer-dashboard.png)

![Admin overview dashboard](/admin-dashboard.png)

## How it fits together

```text
Customers ──▶ :3000 customer portal ─┐
                                     ├─ PVE Panel (Fastify + SQLite) ──(API token)──▶ Proxmox VE
Admins ─────▶ :3001 admin interface ─┘   (localhost only by default)
```

- The two ports are **separate web servers** in one process, with separate session
  cookies and signing keys. The customer server has no admin routes at all.
- The browser **never talks to Proxmox** and never sees the API token.
- Every per-server request is checked against the panel's ownership records first;
  a server that isn't the customer's returns *404*, the same as one that doesn't exist.

## What PVE Panel covers

| Area | What you get |
|---|---|
| Servers | QEMU VMs and LXC containers: power, console, usage graphs, snapshots and **automatic snapshots**, **backups** (Proxmox Backup Server), reinstall, resize, expiry |
| Operations | **Overview** dashboard, **Hosts** with maintenance mode, **several Proxmox clusters**, **Jobs** with retry, **fleet updates** with rollouts in rings, OS template import (cloud images, OVA, ISO, VMDK) |
| Network | Private network per customer, WireGuard and Tailscale, **public IPv4** pools (IPAM) with reverse DNS and optional **IPv6 /64** |
| Storage | **Block volumes** with tiers, S3 **object storage** (SeaweedFS) with per-customer keys, read-only buckets |
| Commerce | **Plans** with monthly prices, wallet, renewals and invoices with PPN, Xendit, Midtrans and bank transfer |
| Support | Ticket desk (L1 / L2 / L3), knowledge base, optional Zammad sync, **AI assistant** |
| Access and security | Roles for administrators, resource pools and GPUs, 2FA, passkeys, single sign-on, API tokens |

Each area has its own guide under **Platform features**: [Snapshots and backups](platform/snapshots-and-backups.md),
[Clusters and hosts](platform/clusters-and-hosts.md), [Fleet updates](platform/fleet-updates.md),
[Public IP addresses](platform/public-ips.md), [Storage](platform/storage.md),
[Plans and billing](platform/plans-and-billing.md), [Support desk](platform/support-desk.md),
[Access control](platform/access-control.md) and [Importing OS templates](platform/template-import.md).
The complete, current feature list is in the
[README](https://github.com/hawaianblue21/pve-panel#-features).

## Screenshots

| Customer: snapshots | Customer: storage |
|---|---|
| ![Snapshots and automatic snapshots](/customer-snapshots.png) | ![Storage](/customer-storage.png) |

| Customer: backups | Customer: billing |
|---|---|
| ![Backups](/customer-backups.png) | ![Billing](/customer-billing.png) |

| Admin: clusters and hosts | Admin: fleet updates |
|---|---|
| ![Clusters and hosts](/admin-clusters-hosts.png) | ![Fleet updates and rollouts](/admin-fleet-updates.png) |

| Admin: plans | Admin: public IPs |
|---|---|
| ![Plans](/admin-plans.png) | ![Public IPs](/admin-public-ips.png) |

| Admin: backups | Admin: backup coverage |
|---|---|
| ![Backups overview](/admin-backups.png) | ![Backup coverage per server](/admin-backup-servers.png) |

## What's in this documentation

| Section | For |
|---|---|
| [Getting started](getting-started/quick-start.md) | Running the panel for the first time |
| [Installation](installation/proxmox.md) | Proxmox permissions, Docker, Portainer, NAS, HTTPS |
| [Features](features/customer-portal.md) | What customers can do |
| [Platform features](platform/snapshots-and-backups.md) | Backups, clusters, public IPs, storage, billing, support desk, access control |
| [Networking](networking/customer-networks.md) | Private customer networks, WireGuard, Tailscale |
| [Templates](guides/templates.md) | Preparing Linux and Windows templates |
| [Security](security/security-model.md) | Security model, 2FA, single sign-on |
| [Administration](administration/servers-and-customers.md) | Customers, email, updates, branding |
| [Troubleshooting](troubleshooting.md) | Known problems and their fixes |
| [Reference](reference/configuration.md) | Configuration, API, CLI, project layout |

:::info AI-assisted
PVE Panel was built with substantial help from an AI assistant. Read
[AI-assisted development](about/ai-assisted-development.md) before using it in production.
:::
