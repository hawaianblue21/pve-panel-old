# RFC: Live resize vCPU dan RAM (Fase 1)

Status: Draft untuk review. Klasifikasi: RESTRICTED. Target versi: 1.14.0.

## 1. Tujuan dan lingkup

Customer dapat menambah vCPU dan RAM server yang sedang berjalan tanpa restart, melalui panel, tanpa akses langsung ke Proxmox. Admin dapat mengaktifkan atau menonaktifkan fitur ini (kill-switch global, plus flag per template).

| Termasuk Fase 1 | Tidak termasuk Fase 1 |
|---|---|
| QEMU VM Linux, scale-UP vCPU dan RAM saat running | Windows (hot-plug tidak didukung stabil), scale-DOWN live |
| Toggle admin global + flag per template | Pilihan Intel/AMD, load-aware placement (Fase 2/3) |
| Verifikasi hasil (Proxmox + guest) dan fallback ke perilaku lama | LXC (perilaku diverifikasi di lab, lihat 9) |
| Kuota dan billing sadar `vcpus` | Perubahan harga otomatis mid-cycle untuk ukuran custom |

Perilaku saat ini tetap menjadi default: perubahan `cores`/`memory` pada VM running menjadi pending sampai restart.

## 2. Prasyarat Proxmox dan guest

| Item | Syarat |
|---|---|
| VM config | `numa: 1`, `hotplug` memuat `cpu` dan `memory`, `sockets: 1`, `cores` = maksimum topologi, `vcpus` = jumlah aktif |
| Guest kernel | >= 5.15 hanya perlu udev rule `/lib/udev/rules.d/80-hotplug-cpu.rules` (online CPU otomatis). Kernel 4.7 sampai 5.14: `memhp_default_state=online`. Lebih lama: udev rule memory |
| Memory > 64 GiB hot-plugged | Host perlu `vhost max_mem_regions=128` (reboot host). Karena itu default cap RAM live = 64 GiB |
| Windows | Dikecualikan (dokumentasi Proxmox saling bertentangan, memory unplug tidak didukung) |
| Token API | Role `PanelCustomer` sudah memuat VM.Config.CPU, VM.Config.Memory, VM.Config.Options. Tidak perlu hak baru |

Catatan: `cores` pada VM running tetap pending. Yang berlaku live hanya `vcpus` dan `memory` (dengan hotplug + numa). Maka `cores` harus ditetapkan sebagai maksimum sejak provisioning.

## 3. Konfigurasi admin

1. Setting global di tabel `settings`, key `live_resize`, JSON:

```json
{ "enabled": false, "maxVcpus": 16, "maxMemoryGb": 64 }
```

2. Kolom baru `templates.live_resize INTEGER NOT NULL DEFAULT 0`, ditambahkan dengan pola ALTER-if-missing di `src/db.js`.
3. Izin: `settings.write` untuk setting global, `templates.write` untuk flag template. Tidak ada permission key baru.
4. Efektif (`liveEligible`) = `enabled` AND `templates.live_resize` AND tipe qemu AND `osFamily` Linux. Jika salah satu gagal, perilaku lama berlaku.
5. Mematikan toggle tidak mengubah VM yang sudah dibuat dengan hotplug; hanya menghentikan resize live berikutnya (resize jatuh ke jalur pending).

## 4. Perubahan provisioning (`src/provision.js`, `createServer`)

Saat `liveEligible`, langkah config menjadi:

```js
const maxCores = Math.min(settings.maxVcpus, limits.cores);   // topologi maksimum
params = {
  numa: 1,
  hotplug: 'disk,network,usb,memory,cpu',
  sockets: 1,
  cores: maxCores,
  vcpus: spec.cores,
  memory: spec.memoryMb,
};
```

Maksimum RAM tidak dikonfigurasi di Proxmox (hotplug memory memakai nilai `memory` yang di-PUT); batasnya ditegakkan di panel (`maxMemoryGb`). `spec.live = { maxCores }` dicatat pada baris `vms` (kolom/JSON baru `live_max_cores`) agar UI dan resize tidak perlu menebak.

## 5. Algoritma resize (modul baru `src/liveresize.js`)

Dipanggil dari `resizeServer` setelah semua pre-check yang ada (kepemilikan, plan, expired, state, concurrency guard `resizing`, kuota, `checkPoolCapacity`) lulus.

1. Baca `cfg = GET {path}/config` dan status. Hitung `curVcpus = Number(cfg.vcpus) || cores*sockets`.
2. Tentukan `live = running && eligible && next.cores >= curVcpus && next.cores <= maxCores && next.memoryMb >= cfg.memory && next.memoryMb <= maxMemoryMb`.
3. Jika bukan `live`: jalur lama (PUT `cores`/`memory`, pending, opsi restart). Scale-down dan melebihi cap otomatis masuk sini; respons memuat `liveReason` agar UI menjelaskan.
4. Jika `live`: `PUT config { vcpus: next.cores, memory: next.memoryMb }` (bukan `cores`).
5. Verifikasi: `GET config?current=1` dan `GET /pending`. Bila nilai masih pending, anggap live gagal: set `pendingRestart = true`, tulis audit dengan `live:false`, jangan revert.
6. Cek guest (best effort, timeout 15 dtk, poll tiap 2 dtk) lewat QEMU guest agent `get-vcpus` dan `status/current`. Jika guest belum online CPU, kembalikan `warnings: ['guest-did-not-online-cpus']`. Tidak ada auto-revert (menurunkan vcpus live berisiko).
7. Disk: logika yang ada tidak diubah.
8. Respons `POST /api/vms/:vmid/resize` ditambah `live: { applied: boolean, vcpus, memoryMb, verified: 'proxmox'|'guest'|null, warnings: [] }`. Field lama (`before`, `after`, `pendingRestart`, ...) tetap.
9. Audit `server_resized` mendapat detail `live`.

Plan upgrade (`planChange: true`) memakai jalur yang sama, sehingga upgrade plan juga live jika memenuhi syarat.

## 6. Kuota dan billing

| Lokasi | Perubahan |
|---|---|
| `src/provision.js` `usageOf` | `cores` dihitung `Number(cfg.vcpus) \|\| (cores*sockets)`; state `creating` tetap `spec.cores` |
| `src/provision.js` `resizeServer` | `cur.cores` sama (vcpus-aware) |
| `src/routes/vms.js` ~468 dan ~483 | Perhitungan cores tampilan detail/pending vcpus-aware |
| `src/restore.js` ~235 | Spec restore membaca vcpus, dan konfigurasi hotplug dipertahankan |
| `src/billing.js` ~160 | Harga memakai `maxcpu` dari cluster resources; wajib diverifikasi di lab apakah nilainya `vcpus` atau `cores`. Bila `cores`, ganti ke vcpus dari config |

Harga: server berplan mengikuti alur prorata yang ada; ukuran custom berubah pada renewal berikutnya (keputusan terbuka, lihat 10).

## 7. API dan UI

- Detail server menambah `liveResize: { supported, maxCores, maxMemoryMb }`.
- Customer (`web/customer/app.js`, `renderResize`): batas input cores memakai `maxCores`; label "Applies immediately" atau "Needs a restart" sesuai kalkulasi sisi klien yang sama dengan server; checkbox "Restart now" disembunyikan bila perubahan live; peringatan guest bila `warnings` terisi.
- Admin (`web/admin/admin.js`): seksi Settings "Live resize" (enabled, maxVcpus, maxMemoryGb) dan checkbox "Live resize" pada form template, disertai panduan persiapan template (kernel >= 5.15, qemu-guest-agent, udev rule).
- Server lama: aksi opsional admin "Prepare for live resize" (PUT hotplug/numa/cores/vcpus, butuh satu restart).

## 8. Keamanan dan keselamatan operasional

| Risiko | Mitigasi |
|---|---|
| Customer melampaui kuota | Pre-check kuota dan pool capacity tidak berubah; cap `maxCores`/`maxMemoryMb` ditegakkan server-side |
| Penyalahgunaan (resize berulang) | Rate limit route yang ada (20/jam) dipertahankan |
| Race | `resizing` Set tetap; satu resize per VM |
| Halaman admin | Hanya `settings.write`/`templates.write`; perubahan diaudit |
| Kill-switch | `enabled=false` langsung mengembalikan perilaku lama |
| Rollback | Tidak ada migrasi destruktif; kolom baru additive, default nonaktif |

## 9. Rencana uji

Unit/API (`test/support/mock-pve.mjs` diperluas): dukungan `vcpus`, `numa`, `hotplug`, `GET config?current=1`, `agent/get-vcpus`, dan semantik "apply live bila hotplug+numa".

| Kasus | Ekspektasi |
|---|---|
| Live up vCPU dan RAM | `applied:true`, tanpa pending |
| Hotplug tidak aktif / template tidak flagged | Jalur pending lama |
| Scale-down | Pending, `liveReason` terisi |
| Melebihi `maxCores`/`maxMemoryMb` | Ditolak atau pending sesuai aturan, kuota ditegakkan |
| Windows | Tidak live |
| Toggle off | Perilaku lama |
| Verifikasi gagal (nilai masih pending) | `pendingRestart:true` |
| Guest tidak online CPU | `warnings` terisi, tanpa revert |
| Plan upgrade | Live bila eligible, billing prorata tetap |
| Kuota `usageOf` dengan vcpus | Benar |

Matriks lab (wajib sebelum rilis): Debian 12, Ubuntu 22.04 dan 24.04, AlmaLinux/Rocky 9. Periksa `nproc`, `free -m`, interaksi ballooning dengan memory hotplug, RAM > 64 GiB (vhost), LXC (apakah cores/memory live), dan `maxcpu` pada cluster resources.

## 10. Rollout dan keputusan terbuka

Rollout: (1) mock + API tests, (2) lab Proxmox, (3) rilis 1.14.0 dengan toggle default OFF, (4) dokumentasi: halaman admin, panduan persiapan template, README features/roadmap.

| Keputusan | Rekomendasi |
|---|---|
| Default `maxVcpus` | 16 |
| Default `maxMemoryGb` | 64 |
| Scale-down live | Tidak di Fase 1 |
| Harga custom mid-cycle | Berubah di renewal berikutnya |
| Toggle per plan | Tunda; cukup global + template |
| Windows | Fase terpisah setelah uji lab |

Risiko utama: perilaku ballooning, kernel guest lama tanpa udev rule, dan perbedaan dokumentasi Proxmox untuk hot-remove. Semuanya tercakup uji lab di atas dan fallback otomatis ke jalur pending.
