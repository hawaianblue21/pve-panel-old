---
title: Block and object storage
sidebar_position: 4
---

![Block and object storage](/customer-storage.png)

## Block storage (volumes)

Extra disks for customers' virtual machines, set up in **Block storage** (admin portal): tiers that map to Proxmox
storages (for example NVMe on `ceph-nvme`, archive on an HDD pool), each with a price per GB per month, the largest
volume and the number of volumes per server. Customers use them under **Storage → Block volumes**.

```text
Create ──► scsiN on the server (hot-added) ──► Detach (server shut down) ──► kept as unusedN on that server
                                                    │
                       Attach to the same or another server on the same host (move_disk) ◄──┘
Enlarge (attached, grows only) · Delete (detached only: removing unusedN destroys the volume)
```

- Volumes count against the customer's disk limit and resource pool, detached ones too.
- They are billed with the server that holds them: an extra line on its renewal invoice.
- A server holding volumes can't be deleted or reinstalled (Proxmox would destroy them with it): the customer moves
  or deletes them first.
- Moving works between servers on the same Proxmox node (disk reassignment). Containers (LXC) are not offered.

Customer API: `GET/POST /api/volumes`, `POST /api/volumes/:id/attach|detach|resize`, `PATCH/DELETE /api/volumes/:id`.

## Object storage on SeaweedFS (S3)

Configured in **Object storage**: the S3 endpoint (`weed s3` / `weed server -s3`, port 8333; the IAM API is
embedded there), an admin access key and secret (encrypted at rest, never shown again), a public endpoint for
customers and a bucket prefix. The panel signs requests with AWS Signature V4 and:

- creates one IAM user per customer (`<prefix>u<id>`) and buckets named `<prefix><id>-<name>`,
- keeps an inline policy on that user allowing exactly their buckets (a **read-only** bucket only for reading and
  listing: GetObject, ListBucket and the like),
- issues access keys whose secret is shown **once** (rotating a key revokes the old one),
- reads bucket usage, and counts bucket quotas against the pool.

Hard quotas are enforced by SeaweedFS: the panel shows `s3.bucket.quota -name <bucket> -sizeMB <n>` per bucket;
run `s3.bucket.quota.enforce -apply` in `weed shell` on a schedule so buckets over quota become read-only.
Deleting a customer removes their IAM user and key; their buckets stay (without owner) so no data is lost
unless an administrator deletes them.

Customers manage buckets and their access key under **Storage → Object storage** (with ready-made AWS CLI,
rclone and restic snippets). **Make read-only** freezes a bucket for the customer's key (for example a finished
backup, so a compromised script can't delete it); **Make writable** undoes it. Administrators can do the same in
**Object storage**. Customer API: `GET /api/storage`, `POST /api/storage/buckets`, `PATCH /api/storage/buckets/:name`
(`{ readOnly }`), `DELETE /api/storage/buckets/:name`, `POST /api/storage/keys`.
