// Live resize: CPU and memory of a running Linux server grow without a restart.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startStack, waitFor } from '../support/stack.mjs';

let stack;
let admin;
let lena;
const linux = (hostname, extra = {}) => ({
  hostname, templateId: 9000, cores: 2, memoryMb: 2048, diskGb: 20, username: 'lena', password: 'supersecret-123', ...extra,
});
const cfg = (vmid) => stack.mock.vms.get(vmid)?.cfg;
const num = (vmid, key) => Number(cfg(vmid)?.[key]);
const running = (vmid) => waitFor(async () => (await lena.get(`/api/vms/${vmid}`)).json?.status === 'running', { what: `${vmid} running` });
const create = async (name, extra) => {
  const r = await lena.post('/api/vms', linux(name, extra));
  assert.equal(r.status, 202, r.text);
  assert.equal((await stack.serverSettled(lena, r.json.vmid)).state, 'ready');
  return r.json.vmid;
};

before(async () => {
  stack = await startStack({ env: { LIVE_RESIZE_GUEST_WAIT_MS: 1500 } });
  admin = await stack.adminSession();
  await stack.offerTemplates();
  lena = await stack.customerWith('lena@example.com', { limits: { maxServers: 5, maxCores: 8, maxMemoryMb: 65536, maxDiskGb: 200 } });
});
after(async () => { await stack?.stop(); });

test('settings: validated, and off by default', async () => {
  const r = await admin.get('/api/admin/settings/live-resize');
  assert.deepEqual(r.json, { enabled: false, maxVcpus: 16, maxMemoryGb: 64 });
  assert.equal((await admin.put('/api/admin/settings/live-resize', { maxVcpus: 0 })).status, 400);
  assert.equal((await admin.put('/api/admin/settings/live-resize', { maxMemoryGb: 5000 })).status, 400);
});

test('switched off: servers are built and resized as before (wait for a restart)', async () => {
  await admin.put('/api/admin/templates/9000', { label: 'Debian 12', liveResize: true });
  const vmid = await create('plain');
  assert.equal(cfg(vmid).numa, undefined, 'no hotplug config while the setting is off');
  await lena.post(`/api/vms/${vmid}/power/start`);
  await running(vmid);
  const r = await lena.post(`/api/vms/${vmid}/resize`, { cores: 3, restart: false });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.pendingRestart, true);
  assert.equal(r.json.live, null);
  assert.equal((await lena.get(`/api/vms/${vmid}`)).json.liveResize.supported, false);
});

test('Windows templates never get the flag', async () => {
  await admin.put('/api/admin/templates/9100', { label: 'Windows', setup: 'windows', liveResize: true });
  const list = (await admin.get('/api/admin/templates')).json.templates;
  assert.equal(list.find((t) => t.vmid === 9100).liveResize, false);
  assert.equal(list.find((t) => t.vmid === 9000).liveResize, true);
});

let live;
test('enabled: a new server gets hotplug, and CPU/memory grow while running', async () => {
  assert.equal((await admin.put('/api/admin/settings/live-resize', { enabled: true, maxVcpus: 8, maxMemoryGb: 16 })).status, 200);
  live = await create('live1');
  assert.equal(num(live, 'numa'), 1);
  assert.match(cfg(live).hotplug, /cpu/);
  assert.match(cfg(live).hotplug, /memory/);
  assert.equal(num(live, 'cores'), 8, 'cores is the ceiling');
  assert.equal(num(live, 'vcpus'), 2, 'vcpus is what is active');

  await lena.post(`/api/vms/${live}/power/start`);
  await running(live);
  const before = (await lena.get(`/api/vms/${live}`)).json;
  assert.deepEqual(before.liveResize, { supported: true, maxCores: 8, maxMemoryMb: 16384 });
  assert.equal(before.cores, 2);

  const r = await lena.post(`/api/vms/${live}/resize`, { cores: 4, memoryMb: 4096 });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.pendingRestart, false);
  assert.equal(r.json.live.applied, true);
  assert.deepEqual(r.json.live.warnings, []);
  const after = (await lena.get(`/api/vms/${live}`)).json;
  assert.equal(after.cores, 4);
  assert.equal(after.memoryMb, 4096);
  assert.equal(after.pendingSize, null);
  assert.equal(num(live, 'vcpus'), 4);
  assert.equal(num(live, 'cores'), 8, 'ceiling untouched');
});

test('quota counts the active vCPUs, not the ceiling', async () => {
  // plain 3 + live1 4 active = 7 of 8; one more core fits. Counting live1's ceiling (8) would refuse it.
  const second = await lena.post('/api/vms', linux('live2', { cores: 1 }));
  assert.equal(second.status, 202, second.text);
  assert.equal((await stack.serverSettled(lena, second.json.vmid)).state, 'ready');
});

test('a running server only grows and stays inside the ceilings', async () => {
  const shrink = await lena.post(`/api/vms/${live}/resize`, { cores: 2 });
  assert.equal(shrink.status, 409);
  assert.match(shrink.json.error, /only grow/);
  const mem = await lena.post(`/api/vms/${live}/resize`, { memoryMb: 32768 });
  assert.equal(mem.status, 409);
  assert.match(mem.json.error, /at most 16 GB/);
  assert.equal(num(live, 'vcpus'), 4, 'nothing changed');
});

test('guest that does not online the CPUs: the change stays, with a warning', async () => {
  await admin.patch(`/api/admin/users/${lena.userId}`, { maxCores: 16 });
  stack.mock.vms.get(live).guestCpus = 1;
  const r = await lena.post(`/api/vms/${live}/resize`, { cores: 5 });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.live.applied, true);
  assert.deepEqual(r.json.live.warnings, ['guest-did-not-online-cpus']);
  assert.equal(num(live, 'vcpus'), 5);
  delete stack.mock.vms.get(live).guestCpus;
});

test('stopped: any size applies at the next start', async () => {
  await lena.post(`/api/vms/${live}/power/stop`);
  await waitFor(async () => (await lena.get(`/api/vms/${live}`)).json?.status === 'stopped', { what: 'stopped' });
  const r = await lena.post(`/api/vms/${live}/resize`, { cores: 2, memoryMb: 2048 });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.pendingRestart, false);
  assert.equal(r.json.live, null);
  assert.equal(num(live, 'vcpus'), 2);
  assert.equal(num(live, 'memory'), 2048);
});

test('switching it off again stops live changes on servers that have hotplug', async () => {
  await admin.put('/api/admin/settings/live-resize', { enabled: false });
  await lena.post(`/api/vms/${live}/power/start`);
  await running(live);
  const r = await lena.post(`/api/vms/${live}/resize`, { cores: 3 });
  assert.equal(r.status, 409);
  assert.match(r.json.error, /switched off/);
  assert.equal((await lena.get(`/api/vms/${live}`)).json.liveResize.supported, false);
});
