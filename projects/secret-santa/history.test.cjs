const assert = require('node:assert/strict');
const {previousMatches} = require('./history.js');
const {drawAssignments} = require('./draw.js');

const old = {names: ['Alice', 'Bob', 'Carol', 'David'], draw: [1, 2, 3, 0]};
const current = {names: ['ALICE', 'bob', 'carol', 'David', 'Evelyn']};
const match = previousMatches(current, old);
assert.deepEqual(match.exclusions, [[1], [2], [3], [0], []]);
assert.equal(match.matched.length, 4);
assert.equal(match.unmatched.length, 1);

const changed = previousMatches({names: ['Alice', 'Bob', 'Caroline', 'David']}, old);
assert.equal(changed.matched.length, 2);
assert.equal(changed.unmatched.length, 2);
assert.ok(changed.unmatched.some(x => x.reason.includes('recipient')));
assert.ok(changed.unmatched.some(x => x.reason.includes('previous event')));

// A pair who drew each other before cannot both be assigned their previous recipient.
const pair = {names: ['Alice', 'Bob', 'Carol', 'David']};
const prior = {names: pair.names, draw: [1, 0, 3, 2]};
for (let i=0; i<250; i++) {
  const exclusions = previousMatches(pair,prior).exclusions;
  const result = drawAssignments(pair.names, exclusions,true);
  assert.ok(result, 'Expected a valid perfect matching');
  result.forEach((recipient, giver) => {
    assert.notEqual(recipient, giver);
    assert.notEqual(recipient, prior.draw[giver]);
  });
}

// Three participants all excluding one particular recipient is correctly rejected.
const impossible = drawAssignments(['A','B','C'], [[1,2],[0,2],[0,1]], true);
assert.equal(impossible, null, 'Self-exclusions plus all other exclusions are impossible');
console.log('Previous-event name matching and 250 exclusion drawings passed');
