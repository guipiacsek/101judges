import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAsk, pickByOdds, seats, shuffle } from './vote.ts';

test('parseAsk guards what reaches OpenAI', () => {
  const ok = { question: 'Best language?', options: ['C', 'C++', 'C#'] };
  assert.deepEqual(parseAsk(ok), { locale: 'en', ...ok });
  assert.equal(parseAsk({ ...ok, locale: 'pt' })?.locale, 'pt');
  assert.equal(parseAsk({ ...ok, options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] }), null); // 7 options
  assert.equal(parseAsk({ ...ok, options: ['A', 'x'.repeat(41)] }), null); // option too long
  assert.equal(parseAsk({ ...ok, options: ['Yes', 'yes!'] }), null); // duplicates
  assert.equal(parseAsk({ ...ok, options: ['A'] }), null);
  assert.equal(parseAsk({ ...ok, question: 'x'.repeat(1000) }), null);
  assert.equal(parseAsk({ ...ok, options: ['A', 5] }), null); // non-string
  assert.equal(parseAsk(null), null);
});

test('pickByOdds rolls the judge\'s odds', () => {
  assert.equal(pickByOdds('70 30', 2, 0), 0);
  assert.equal(pickByOdds('70 30', 2, 0.69), 0);
  assert.equal(pickByOdds('70 30', 2, 0.7), 1);
  assert.equal(pickByOdds('A: 0, B: 100', 2, 0.01), 1); // labels and punctuation are ignored
  assert.equal(pickByOdds('5 10 60 25', 4, 0.99), 3);
  assert.equal(pickByOdds('50 50', 3), -1); // wrong count
  assert.equal(pickByOdds('0 0', 2), -1); // no positive total
  assert.equal(pickByOdds('Yes', 2), -1);
});

test('101 seats, left to right', () => {
  const s = seats();
  assert.equal(s.length, 101);
  assert.ok(s[0].x < 0 && s[100].x > 0);
});

test('shuffle keeps the same items', () => {
  assert.deepEqual(shuffle([1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
});
