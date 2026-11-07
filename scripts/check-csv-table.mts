/**
 * Self-check: CSV import keeps quoted commas/newlines in one cell and skips blank lines.
 * Run with: node --experimental-strip-types scripts/check-csv-table.mts
 */
import assert from 'node:assert';
import { csvToLatex, parseCsv } from '../lib/latex-table-generator.ts';

assert.deepEqual(parseCsv('Name,City\r\n"Smith, John","New\nYork"\r\n\r\n"say ""hi""",LA\n'), [
  ['Name', 'City'],
  ['Smith, John', 'New\nYork'],
  ['say "hi"', 'LA'],
]);

const tex = csvToLatex('Name,Score\n"Smith, John",90\n\n');
assert.match(tex, /Smith, John & 90/);
assert.equal((tex.match(/\\\\/g) ?? []).length, 2); // header + one data row
assert.throws(() => csvToLatex('   '));
console.log('ok');
