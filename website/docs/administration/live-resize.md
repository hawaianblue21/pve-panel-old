---
title: Live resize
sidebar_position: 6
---

Customers can add **CPU and memory to a running Linux server without a restart**. It uses Proxmox CPU and memory
hotplug. It is off by default.

## What it does

| Situation | Result |
|---|---|
| Running server from a live-resize template, **growing** CPU or memory | Applied immediately; the panel checks that Proxmox accepted it and, through the guest agent, that the guest brought the CPUs online |
| Running server, **shrinking** | Refused: the server must be stopped first (hot-unplug needs the guest to cooperate) |
| Stopped server | Any size within the plan; applies at the next start |
| Server without hotplug, Windows, containers | As before: the change waits for a restart |

## Turn it on

1. **Settings → Live resize**: enable it and set the ceilings. *Maximum vCPUs* is built into every new server as the
   topology limit; *Maximum memory* is enforced by the panel while a server runs.
2. **Templates**: tick **Live resize** on the Linux templates that are prepared for it. Servers created or reinstalled
   from them afterwards get NUMA and hotplug (`hotplug=disk,network,usb,memory,cpu`, `cores` = ceiling, `vcpus` = active).
   Existing servers are not changed.

Switching the setting off again stops live changes: a running server that has hotplug must then be stopped to change its
CPU or memory.

## Prepare the template image

- Linux kernel **5.15 or newer**, with the QEMU guest agent installed.
- The udev rule that brings hot-plugged CPUs online, `/lib/udev/rules.d/80-hotplug-cpu.rules`:

  ```
  SUBSYSTEM=="cpu", ACTION=="add", TEST=="online", ATTR{online}=="0", ATTR{online}="1"
  ```

- Kernels 4.7 to 5.14 additionally need `memhp_default_state=online` on the kernel command line.
- More than 64 GB of hot-plugged memory needs `vhost max_mem_regions=128` on the Proxmox host (reboot), so the default
  ceiling is 64 GB.

The panel's API token role already has the rights it needs (VM.Config.CPU, VM.Config.Memory, VM.Config.Options).

## Quota

A server counts with its **active** vCPUs, not the ceiling, so a customer's plan limit is not used up by headroom.
