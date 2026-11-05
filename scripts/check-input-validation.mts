/**
 * Self-check: escaped delimiters are literal and do not unbalance validateLatex.
 * Run with: node --experimental-strip-types scripts/check-input-validation.mts
 */
import assert from 'node:assert';
import { validateLatex } from '../lib/input-validation.ts';

assert.equal(validateLatex('\\left\\{ x \\right.').isValid, true);
assert.equal(validateLatex('\\left. \\frac{a}{b} \\right\\}').isValid, true);
assert.equal(validateLatex('a \\\\[2pt] b').isValid, true);
assert.equal(validateLatex('\\frac{a}{b').isValid, false);
console.log('ok');
