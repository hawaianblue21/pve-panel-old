---
title: Importing OS templates
sidebar_position: 9
---

Under **OS templates → Import image** owners (or a role with *templates.write*) turn an image into a Proxmox template:

| Format | Source | What the panel does |
|---|---|---|
| `.qcow2` / `.img` cloud image | URL | Proxmox downloads it into an import storage (`download-url`, SHA-256 checked when given); a VM is created with the disk imported (`import-from`), VirtIO SCSI, a cloud-init drive and the guest agent on |
| `.ova` appliance | URL | as above; CPU, memory, OS type and disks come from the OVF (`import-metadata`), disks go on VirtIO SCSI and the network card becomes VirtIO |
| `.vmdk` (or `.qcow2`, `.raw`, `.img`) disk | upload from the browser | sent to the panel in 8 MB pieces (an interrupted upload continues where it stopped; SHA-256 worked out and compared with a checksum given), then to the import storage (`upload`) and imported like a cloud image. Windows disks without VirtIO drivers go on SATA with an `e1000e` card |
| `.iso` installer (Windows, BSD) | URL | the ISO goes into an ISO storage; a VM with an empty disk boots from it (Windows: UEFI, TPM 2.0, q35 and the VirtIO driver ISO `virtio-win.iso` as a second CD, downloaded once per storage). You install in the Proxmox console (link in the list), then press **Installed**: the CD drives are removed and the build continues |

Then the VM becomes a **template** (VMIDs from 9000), the downloaded file is removed, and with **Test boot** a linked
clone boots once: the panel waits for the guest agent, reads the OS name and the cloud-init result, and destroys the
clone. The template itself never boots, so no machine-id or SSH host key ends up in it. New templates are listed but
**not offered** until an administrator offers them (the OS name found is suggested as the name for customers).

- **Placement**: a node, a storage for the disks (use shared storage such as Ceph or NFS so servers can be created on
  every node) and an import storage (a storage with the content type *Import*, Proxmox VE 8.3 or later). Ticking
  several clusters builds one copy in each.
- Imports run in the background (two at a time, `TEMPLATE_IMPORTS_PARALLEL`), appear in **Jobs** and can be retried
  there; a test boot waits up to `TEMPLATE_TEST_BOOT_SECONDS` (default 300) for the guest agent. Images without the
  guest agent are marked *no guest agent*.
- **Windows from ISO**: during setup load the storage driver from the VirtIO CD (`vioscsi`), install the guest agent
  from it (`guest-agent\qemu-ga-x86_64.msi`), then run `sysprep /generalize /oobe /shutdown` (optionally with an
  unattend file). Choose *Guest agent (Windows)* as the setup when you offer the template.
- An ISO import waits in the state *Install* (also across restarts) until **Installed** or **Cancel** (removes the VM).
- **Uploads** are kept under `UPLOAD_DIR` (default: `uploads` next to the database) until Proxmox has them, up to
  `TEMPLATE_UPLOAD_MAX_GB` (default 200) per file; the panel needs that much free space. Unfinished uploads are removed
  after a day, unused ones after a week. Behind a reverse proxy, allow request bodies of at least 8 MB on
  `/api/admin/templates/uploads/` (Caddy has no limit by default; nginx: `client_max_body_size 16m`).

API: `GET /api/admin/templates/import-options`, `GET/POST /api/admin/templates/imports`,
`POST /api/admin/templates/imports/:id/retry`, `DELETE /api/admin/templates/imports/:id`; ISO installs:
`POST /api/admin/templates/imports/:id/start | installed | cancel`; uploads: `POST /api/admin/templates/uploads`
(`{ filename, size }`), `PUT /api/admin/templates/uploads/:id?offset=` (application/octet-stream), `GET` and `DELETE`
`/api/admin/templates/uploads/:id`.
