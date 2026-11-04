const assert = require('node:assert/strict');
const {render} = require('./transfer.js');

const empty = render();
assert.match(empty, /no verdict yet/);
assert.match(empty, /0 of 550 planned games/);
assert.match(empty, /pending/);
assert.doesNotMatch(empty, /NaN|undefined/);

const per_ai = {};
for (const player of ['haiku', 'luna']) per_ai[player] = {
  comparisons: {sonnet: {n: 2, complete: false, solved: {alone: 0, playbook: 1}}},
  conditions: {alone: {n: 7}, sonnet: {n: 2}},
  shared: {n: 1, solved: {alone: 0, sonnet: 1, opus: 0, sol: 0, placebo: 1}}
};
const partial = render({planned: 55, per_ai});
assert.match(partial, /18 of 550 planned games/);
assert.match(partial, /Sonnet: 1 solved of 2 checked cases/);
assert.match(partial, /2 of 55 shared cases checked/);
assert.match(partial, /1 of 55 shared cases checked/);
assert.match(partial, /no verdict yet/);

for (const player of ['haiku', 'luna']) per_ai[player].comparisons.sonnet = {
  n: 55, complete: true, solved: {alone: 1, playbook: 2}
};
assert.match(render({planned: 55, per_ai}), /^<p class="takeaway"><strong>(Yes|A little|Not yet):/);
per_ai.haiku.comparisons.sonnet.n = 54;
assert.match(render({planned: 55, per_ai}), /no verdict yet/);
console.log('Transfer rendering checks passed.');
