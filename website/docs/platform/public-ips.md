---
title: Public IP addresses (IPAM)
sidebar_position: 3
---

![Public IP addresses (IPAM)](/admin-public-ips.png)

Pools of public addresses in **Public IPs** (admin portal): a subnet routed to a Proxmox bridge (optionally a VLAN tag),
its gateway, DNS servers, an optional datacenter, a price per address per month and an optional reverse zone. Customers
add addresses on the server page (Overview → Public IP addresses), up to a number per server, within their resource pool.

| Server | What the panel does | Active |
|---|---|---|
| VM with cloud-init | `netN` on the pool bridge + `ipconfigN: ip=<addr>/<bits>,gw=<gateway>` | after a start or restart from the panel |
| Container (LXC) | `netN` with `ip=` and `gw=` | at once |
| VM without cloud-init | `netN` on the pool bridge; the customer sees address, netmask, gateway and a netplan example | after setting it up inside |

- **Anti-spoofing**: the Proxmox firewall IP filter set `ipfilter-netN` holds only the assigned address, so a server can't
  send from addresses it wasn't given (the VM firewall and its `ipfilter` option must be on, as for network isolation).
- The public card carries the default route (a static route wins over the DHCP route of the private network), so answers
  leave from the public address.
- **Release** removes the card, the cloud-init entry and the IP filter; the address **cools down** (default 24 hours)
  before it is handed out again. Deleting a server releases its addresses; a server that leaves the panel without being
  destroyed (unassigned) leaves them **held** until an administrator frees them.
- A **reinstall** puts the addresses back with the same MAC address.
- **Reverse DNS**: customers set a PTR per address; with PowerDNS configured (API address, key, server ID) and a reverse
  zone on the pool, the panel writes it there (`PATCH /api/v1/servers/<id>/zones/<zone>`), otherwise it is stored for you.
- Addresses are billed with their server (renewal invoice line) and count against the pool's public IP cap.

## IPv6 (optional)

IPv6 is off until an administrator switches it on (**Public IPs → Settings → Customers can switch IPv6 on**) and gives a
pool an **IPv6 prefix** (for example `2001:db8:100::/56`), a gateway (`fe80::1`, or an address in the prefix's first
/64), an optional ip6.arpa reverse zone and a price per /64.

- Every IPv4 address of the pool maps to a fixed **/64** of the prefix: the n-th address of the subnet gets the n-th /64
  (`198.51.100.2` → `2001:db8:100:2::/64`). The prefix needs at least as many /64s as the subnet has addresses (a /28
  needs /60 or larger). Nothing is allocated separately: the /64 follows its IPv4 address through assignment, cool-down
  and release. The first /64 is never handed out (it belongs to the subnet's network address).
- Customers switch IPv6 on or off **per address**. The server gets `<prefix>::1/64` on the same network card
  (cloud-init `ip6=`/`gw6=`, containers `ip6=`/`gw6=` at once, other VMs by hand with the values shown); the IP filter
  admits the whole /64 (Proxmox adds the card's link-local address itself). Reverse DNS for `<prefix>::1` goes to the
  ip6.arpa zone, which must cover the prefix.
- **Switching IPv6 off** in the settings stops new /64s; servers that have one keep it until their owner switches it
  off. A pool's prefix and gateway are locked while any server uses IPv6 from it.
- Your router must deliver each /64 on the pool's bridge: the prefix on-link on the bridge, or a route per /64.
- A /64 with a price is billed with its server as its own renewal line (`IPv6: 2001:db8:100:2::/64`). Reinstalls and
  snapshot rollbacks put it back as it is recorded.

Customer API: `GET/POST /api/vms/:vmid/ips`, `DELETE /api/ips/:id`, `PUT /api/ips/:id/ptr` (`{ hostname, family: 4|6 }`),
`PUT /api/ips/:id/ipv6` (`{ enabled }`).
