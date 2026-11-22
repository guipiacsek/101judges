import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchOption, seats, shuffle } from './vote.ts';

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
});

test('101 seats, left to right', () => {
  const s = seats();
  assert.equal(s.length, 101);
  assert.ok(s[0].x < 0 && s[100].x > 0);
});

test('shuffle keeps the same items', () => {
  assert.deepEqual(shuffle([1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
});
