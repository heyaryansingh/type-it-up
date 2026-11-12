/**
 * Self-check: token-bucket getStatus reflects refills since last check.
 * Run with: node --experimental-transform-types scripts/check-rate-limiter.mts
 */
import assert from 'node:assert';
import { rateLimiter } from '../lib/rate-limiter.ts';

const real = Date.now;
let t = 1_000_000;
Date.now = () => t;
const cfg = { maxRequests: 2, windowMs: 1000 };
await rateLimiter.check('k', cfg);
await rateLimiter.check('k', cfg);
assert.equal(rateLimiter.getAllStatus().k.remaining, 0);
t += 1000;
assert.equal(rateLimiter.getAllStatus().k.remaining, 2);
Date.now = real;
console.log('ok');
