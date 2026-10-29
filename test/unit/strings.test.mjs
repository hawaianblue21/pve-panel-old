// Trimming helpers (they replace regular expressions that took quadratic time on long input).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimSlash, trimDashes } from '../../src/strings.js';

test('trimSlash removes slashes at the end only', () => {
  assert.equal(trimSlash('https://host:8006///'), 'https://host:8006');
  assert.equal(trimSlash('https://host/path'), 'https://host/path');
  assert.equal(trimSlash('//a//b/'), '//a//b');
  assert.equal(trimSlash('///'), '');
  assert.equal(trimSlash(''), '');
  assert.equal(trimSlash(undefined), '');
  assert.equal(trimSlash(null), '');
});

test('trimDashes removes dashes at both ends only', () => {
  assert.equal(trimDashes('--a-b--'), 'a-b');
  assert.equal(trimDashes('a-b'), 'a-b');
  assert.equal(trimDashes('----'), '');
  assert.equal(trimDashes(''), '');
  assert.equal(trimDashes(undefined), '');
});

test('long input is handled in linear time', () => {
  const t0 = Date.now();
  assert.equal(trimSlash('/'.repeat(200_000) + 'x'), '/'.repeat(200_000) + 'x');
  assert.equal(trimSlash('x' + '/'.repeat(2_000_000)), 'x');
  assert.equal(trimDashes('-'.repeat(2_000_000) + 'x' + '-'.repeat(2_000_000)), 'x');
  assert.ok(Date.now() - t0 < 1000, 'took ' + (Date.now() - t0) + ' ms');
});
