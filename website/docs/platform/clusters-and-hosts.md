---
title: Clusters and hosts
sidebar_position: 1
---

![Clusters and hosts](/admin-clusters-hosts.png)

## Several Proxmox clusters

The main cluster is the one in `PVE_URL` (name it with `PVE_CLUSTER_NAME`). Owners connect further clusters in
**Hosts → Clusters**: address, API token (same rights as the main token: the PanelCustomer role on the customers pool)
and TLS, either a certificate from a known CA or the pinned SHA-256 fingerprint of Proxmox's self-signed one (the
connection test shows it; compare with `pvenode cert info`). The token secret is stored encrypted.

```text
                    ┌─ /nodes/<node>/…        → the cluster that has <node>
panel ─ pve.js ─────┼─ /cluster/resources     → all clusters, merged (servers, nodes, storage)
                    ├─ /cluster/nextid        → an ID free in every cluster
                    └─ SDN, status            → each cluster on its own
```

- **Unique names and IDs**: node names must differ between clusters (checked before connecting). A guest whose VMID
  is also used in another cluster is left out and listed, until it is given a free ID in Proxmox.
- **Servers** are cloned in the cluster of their image; a datacenter's nodes are used only if they belong to that
  cluster. Offer an image (template) per cluster.
- **Customer networks**: the customer's VNet is created on each cluster where they have servers (same name and
  subnet, a separate segment per cluster). The VPN gateway reaches the main cluster's.
- **Console, power, volumes, public IPs, updates** work on any cluster; existing guests of a new cluster are assigned
  to customers in **Servers** as usual.
- **Unreachable or disabled cluster**: its nodes show their last known state, the overview raises an alert, and the
  panel never drops a server record (or frees its addresses) because the server is out of sight.

## Admin overview and hosts

The admin portal opens on **Overview**: guests running and stopped, nodes online, revenue and overdue invoices, open
tickets and public IPv4 use, each tile opening its tab; every node with CPU, memory and storage; alerts (node
unreachable, memory or storage at 85 % or more, no quorum, failed setups, transfers to confirm, overdue invoices,
urgent tickets, IP pools almost full, held addresses); and the latest activity. Each administrator sees only what
their role may read.

**Hosts** lists the nodes of the Proxmox cluster with quorum, PVE version, kernel, uptime, load and storage. A node
that can't be reached shows its last reported state. **Maintenance mode** (permission `hosts.write`) keeps new servers
off a node: they are placed on another node of its datacenter; servers already on it keep running.
