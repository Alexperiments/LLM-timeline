import test from 'node:test';
import assert from 'node:assert/strict';
import { groupOverlappingPoints, IDEA_COLLISION_DISTANCE } from '../app/timeline-layout.ts';

const point = (id, anchor) => ({ idea: { id }, anchor });

test('bounds aggregates to one collision window instead of chaining across the timeline', () => {
  const groups = groupOverlappingPoints([
    point('late', 200),
    point('first', 100),
    point('middle', 150),
  ], 56);

  assert.deepEqual(groups.map(group => group.map(item => item.idea.id)), [['first', 'middle'], ['late']]);
  assert.ok(groups.every(group => group.at(-1).anchor - group[0].anchor <= 56));
});

test('keeps final aggregate anchors outside the collision margin', () => {
  const groups = groupOverlappingPoints([
    point('one', 0),
    point('two', IDEA_COLLISION_DISTANCE),
    point('three', IDEA_COLLISION_DISTANCE + 1),
    point('four', IDEA_COLLISION_DISTANCE * 2 + 20),
  ]);
  const anchors = groups.map(group => group[0].anchor);

  assert.deepEqual(groups.map(group => group.length), [2, 1, 1]);
  assert.ok(anchors.slice(1).every((anchor, index) => anchor - anchors[index] > IDEA_COLLISION_DISTANCE));
});
