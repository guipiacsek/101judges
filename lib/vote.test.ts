import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchOption, parseAsk, seats, shuffle } from './vote.ts';

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

test('matchOption maps replies to options', () => {
  const yn = ['Yes', 'No'];
  assert.equal(matchOption('Yes', yn), 0);
  assert.equal(matchOption(' no. ', yn), 1);
  assert.equal(matchOption('I would say no', yn), 1);
  assert.equal(matchOption('Yes and no', yn), -1);
  assert.equal(matchOption('maybe', yn), -1);
  assert.equal(matchOption('Não', ['Sim', 'Não']), 1);
  assert.equal(matchOption('nao', ['Sim', 'Não']), 1);
  assert.equal(matchOption('Messi and Ronaldo', ['Messi', 'Messi and Ronaldo']), 1);
  assert.equal(matchOption('2000s', ['90s', '2000s']), 1);
  assert.equal(matchOption('C++', ['C', 'C++', 'C#']), 1);
  assert.equal(matchOption('C', ['C', 'C++', 'C#']), 0);
});

test('101 seats, left to right', () => {
  const s = seats();
  assert.equal(s.length, 101);
  assert.ok(s[0].x < 0 && s[100].x > 0);
});

test('shuffle keeps the same items', () => {
  assert.deepEqual(shuffle([1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
});
