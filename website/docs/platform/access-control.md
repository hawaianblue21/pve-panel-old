---
title: Access control, pools and GPUs
sidebar_position: 8
---

## Role-based access (admin portal)

Every administrator has a **role**; a role is a set of permissions, and the server checks the permission of
every admin API request (`src/rbac.js`). Routes that aren't mapped need `rbac.write`, so a forgotten mapping
fails closed.

| Built-in role | Can |
| --- | --- |
| **Owner** | Everything, including administrators and roles |
| **Operator** | Customers, servers, network, tickets and the knowledge base; reads everything else (OS templates and settings too) |
| **Resource manager** | Resource pools, datacenters, object storage, GPUs; reads everything else |
| **Support agent** | Tickets and the knowledge base; reads everything else |
| **Support (read-only)** | Sees everything, changes nothing |

**OS templates** and **panel settings** (email, sign-in providers, branding, appearance, updates, expiry) can only be
changed by owners, unless a custom role is given `templates.write` or `settings.write`.

Custom roles are made in **Access**. Administrators created at first start or on the command line are owners;
administrators made in the panel start as **Operator**. The last owner can't be demoted, removed or deleted.

## Datacenters and resource allocation pools

A **datacenter** is a named set of Proxmox nodes (one node belongs to one datacenter) with an optional target
storage. New servers are cloned onto a node of the chosen datacenter (`target` of the full clone).

A **resource pool** is a shared envelope for several customers (a tenant organisation, a department, a reseller).
It caps the **total** of its members, on top of each customer's own limits:

| Pool limit | Empty | 0 | Above 0 |
| --- | --- | --- | --- |
| vCPU, memory, disk | no cap at pool level | none allowed | total cap |
| Public IPv4 | no cap at pool level | none allowed | up to N addresses (their IPv6 /64s don't count) |
| GPUs | **not included** | not included | up to N GPUs |
| S3 buckets / S3 GB | **not included** / no GB cap | not included | up to N |

Pools also list the datacenters and GPU profiles their members may use (none ticked = all).
Checked on create and resize; `GET /api/account` tells customers which datacenters and GPUs they can choose.

## GPU compute (passthrough and vGPU)

GPUs build on Proxmox **PCI resource mappings** (Datacenter → Resource Mappings → PCI Devices, Proxmox VE 8+).
A GPU profile points at one mapping:

- **Passthrough**: a whole device of the mapping → `hostpciN: mapping=<id>[,pcie=1]`
- **vGPU / mediated device**: a slice of the mapping's device (enable *Use with Mediated Devices* on the
  mapping) → `hostpciN: mapping=<id>,mdev=<type>` (e.g. `nvidia-660`)

`pcie=1` is only added when the guest already uses the q35 machine type; the panel never changes a guest's
machine type. GPUs are attached to stopped servers, counted against the owner's pool, kept across a reinstall,
and free capacity comes from the mapping (passthrough) or Proxmox's mdev availability (vGPU).

Extra Proxmox permissions for the panel's token:

```
pveum role add PanelGpu --privs "Mapping.Audit Mapping.Use Sys.Audit VM.Config.HWType"
pveum acl modify /mapping/pci --users panel@pve --roles PanelGpu
pveum acl modify /nodes --users panel@pve --roles PanelGpu
```

Object storage, block storage, snapshots and public IPs are described in [Block and object storage](storage.md), [Snapshots and backups](snapshots-and-backups.md) and [Public IP addresses](public-ips.md).
