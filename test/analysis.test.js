import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDomain, compareAppListing, editDistance, normalizeUrl, sourceAvailability } from '../analysis.js';

const profiles = [{ brand: 'Northstar Bank', brandSlug: 'northstar', domains: ['northstarbank.com'] }];
test('normalizes a public URL and removes its fragment', () => assert.equal(normalizeUrl(' NorthStarBank.com/login#step ').href, 'https://northstarbank.com/login'));
test('rejects malformed, unsupported and unsafe destinations', () => {
  for (const value of ['not a url', 'javascript:alert(1)', 'ftp://example.com', 'http://localhost', 'http://192.168.1.1', 'https://user:pass@example.com']) assert.throws(() => normalizeUrl(value));
});
test('recognizes a configured official domain', () => {
  const result = analyzeDomain('https://northstarbank.com', profiles);
  assert.equal(result.official, true); assert.equal(result.riskScore, 5); assert.equal(result.brand, 'Northstar Bank');
});
test('flags a close lookalike with an explanation and no unsupported page scan claim', () => {
  const result = analyzeDomain('northstarbank-secure.com/login', profiles);
  assert.equal(result.matched, true); assert.equal(result.severity, 'High'); assert.match(result.explanation, /not proof of phishing/);
});
test('leaves unrelated domains low risk without claiming they are safe', () => {
  const result = analyzeDomain('example.org', profiles);
  assert.equal(result.riskScore, 8); assert.equal(result.matched, false); assert.match(result.explanation, /cannot establish.*safe/);
});
test('supports app name, publisher and package comparison signals', () => {
  const official = { name: 'Northstar Mobile', publisher: 'Northstar Bank, N.A.', package: 'com.northstar.mobile' };
  const candidate = { name: 'Northstar Mobile Banking', publisher: 'Unknown Studio', package: 'com.northstar.bank' };
  const comparison = compareAppListing(official, candidate);
  assert.equal(editDistance('northstar', 'northstar'), 0);
  assert.equal(comparison.nameSimilar, true); assert.equal(comparison.publisherMatch, false); assert.equal(comparison.packageMatch, false);
  assert.match(comparison.explanation, /investigation signals/);
});
test('reports missing app metadata as unavailable and lowers confidence', () => {
  const result = compareAppListing({ name: 'Aster Health', publisher: 'Aster Group', package: 'com.aster.health' }, {});
  assert.equal(result.riskScore, 0); assert.equal(result.confidence, 'Low');
  assert.ok(result.signals.includes('Publisher metadata unavailable'));
  assert.ok(result.signals.includes('Package identifier metadata unavailable'));
});
test('labels failed sample sources as unavailable without inventing evidence', () => {
  assert.deepEqual(sourceAvailability(false, 'timeout'), { state: 'unavailable', label: 'Source unavailable · timeout' });
  assert.match(sourceAvailability(true).label, /simulated/);
});
