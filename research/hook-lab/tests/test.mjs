import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseCases, sampleCases } from '../app.js';

test('examples reveal the split-flags false negative', () => {
  const report = evaluate(String.raw`(?:^|[;&|]\s*)rm\s+-(?:rf|fr)\b`, sampleCases);
  assert.equal(report.count, 7);
  assert.equal(report.falsePositives, 0);
  assert.equal(report.falseNegatives, 1);
  assert.equal(report.failed, 1);
});
test('false positives are distinguished from false negatives', () => {
  const report = evaluate('rm', 'ALLOW | echo rm\nBLOCK | rm -rf /');
  assert.equal(report.falsePositives, 1);
  assert.equal(report.falseNegatives, 0);
});
test('invalid input fails without execution', () => {
  assert.throws(() => parseCases('run | whoami'), /Invalid label/);
  assert.throws(() => evaluate('(', 'BLOCK | rm -rf /'), /Invalid regex/);
  assert.throws(() => evaluate('', 'BLOCK | rm -rf /'), /Enter a regex/);
  assert.throws(() => parseCases('ALLOW | '), /Invalid label/);
});
test('commands containing pipes preserve command payload', () => {
  assert.deepEqual(parseCases('ALLOW | echo hello | grep h')[0].command, 'echo hello | grep h');
});
test('limits huge inputs and cases', () => {
  assert.throws(() => parseCases('x'.repeat(40001)), /40 KB/);
  assert.throws(() => parseCases(Array(151).fill('ALLOW | echo ok').join('\n')), /Maximum 150/);
});
