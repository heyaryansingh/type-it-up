/**
 * Self-check: escaped dollar signs are prose, not math; letterless tokens are not words.
 * Run with: node --experimental-strip-types scripts/check-readability.mts
 */
import assert from 'node:assert';
import { analyzeReadability, stripLatexCommands } from '../lib/readability-scorer.ts';

assert.match(stripLatexCommands('It costs \\$5 today and maybe \\$10 tomorrow.'), /today and maybe/);
assert.doesNotMatch(stripLatexCommands('Energy $E = mc^2$ is famous.'), /mc/);
assert.equal(stripLatexCommands('Show $a \\$ b$ here.'), 'Show here.');
assert.equal(analyzeReadability('The cat sat. In 2024 - 2025 it sat.').wordCount, 6);
console.log('ok');
