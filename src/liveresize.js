// Live resize: add vCPUs and memory to a RUNNING Linux server without a restart
// (Proxmox CPU and memory hotplug). The administrator switches it on in
// Settings → Live resize and per template; a server created from such a
// template gets NUMA + hotplug, `cores` as the ceiling and `vcpus` as the
// number of CPUs that are active. Only growing is live; shrinking a running
// server (hot-unplug) is not offered because the guest must cooperate.

import { db } from './db.js';
import { pve } from './pve.js';

const KEY = 'live_resize';
const DEFAULTS = { enabled: false, maxVcpus: 16, maxMemoryGb: 64 };
export const HOTPLUG = 'disk,network,usb,memory,cpu';

const fail = (status, message) => Object.assign(new Error(message), { statusCode: status, expose: true });

export function liveSettings() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY);
  return { ...DEFAULTS, ...(row ? JSON.parse(row.value) : {}) };
}

export function saveLiveSettings(input) {
  const next = { ...liveSettings() };
  if (input.enabled !== undefined) next.enabled = !!input.enabled;
  for (const [k, min, max, label] of [['maxVcpus', 1, 128, 'Maximum vCPUs'], ['maxMemoryGb', 1, 1024, 'Maximum memory (GB)']]) {
    if (input[k] === undefined) continue;
    if (!Number.isInteger(input[k]) || input[k] < min || input[k] > max) throw fail(400, `${label}: a whole number from ${min} to ${max}`);
    next[k] = input[k];
  }
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(KEY, JSON.stringify(next));
  return next;
}

/** Active CPUs: `vcpus` when set (hotplug), else cores x sockets. */
export const vcpusOf = (cfg) => Number(cfg.vcpus) || (Number(cfg.cores) || 1) * (Number(cfg.sockets) || 1);
/** The most CPUs this server can have without a restart: the configured topology. */
export const maxCoresOf = (cfg) => (Number(cfg.cores) || 1) * (Number(cfg.sockets) || 1);

/** Is this VM set up for CPU and memory hotplug (NUMA on, `cpu` and `memory` in `hotplug`)? */
export function hotplugReady(cfg) {
  const hp = new Set(String(cfg.hotplug ?? 'disk,network,usb').split(',').map((x) => x.trim()));
  return hp.has('cpu') && hp.has('memory') && Number(cfg.numa) === 1 && !/^w/.test(cfg.ostype ?? '');
}

/** Should a new server from this template be built for live resize? */
export const templateLive = (tplRow, windows) => !windows && !!tplRow?.live_resize && liveSettings().enabled;

/** Config for a new live-resizable server: `cores` is the ceiling, `vcpus` what is active. */
export function liveParams(cores, memoryMb) {
  return { numa: 1, hotplug: HOTPLUG, sockets: 1, cores: Math.max(cores, liveSettings().maxVcpus), vcpus: cores, memory: memoryMb };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const guestWaitMs = () => Number(process.env.LIVE_RESIZE_GUEST_WAIT_MS) || 15_000;

/**
 * After a live change: did Proxmox apply it (nothing left pending), and did the
 * guest bring the CPUs online? Nothing is rolled back; the caller reports it.
 */
export async function verifyLive(path, { vcpus }) {
  const pending = await pve.get(`${path}/pending`).catch(() => []);
  const stuck = pending.some((e) => ['vcpus', 'memory', 'cores'].includes(e.key) && e.pending !== undefined);
  if (stuck) return { applied: false, verified: null, warnings: ['pending-restart'] };
  const online = async () => {
    const r = await pve.get(`${path}/agent/get-vcpus`);
    return (r?.result ?? r ?? []).filter((c) => c.online).length;
  };
  const until = Date.now() + guestWaitMs();
  try {
    let n = await online();
    while (n < vcpus && Date.now() < until) { await sleep(1000); n = await online(); }
    return n >= vcpus
      ? { applied: true, verified: 'guest', warnings: [] }
      : { applied: true, verified: 'proxmox', warnings: ['guest-did-not-online-cpus'] };
  } catch {
    return { applied: true, verified: 'proxmox', warnings: [] }; // no guest agent: Proxmox accepted it
  }
}
