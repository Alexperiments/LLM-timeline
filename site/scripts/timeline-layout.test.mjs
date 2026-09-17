import test from 'node:test';
import assert from 'node:assert/strict';
import { groupOverlappingPoints } from '../app/timeline-layout.ts';

const point = (id, anchor) => ({ idea: { id }, anchor });
const ids = groups => groups.map(group => group.map(item => item.idea.id));

test('zooming subdivides 4 + 2 without transferring members', () => {
  const points = [0, 10, 20, 40, 65, 75].map((anchor, id) => point(id, anchor));
  assert.deepEqual(ids(groupOverlappingPoints(points, 56)), [[0, 1, 2, 3], [4, 5]]);
  assert.deepEqual(ids(groupOverlappingPoints(points, 35)), [[0, 1, 2], [3], [4, 5]]);
});

test('finer groups belong to one parent and retain all points, including tied gaps', () => {
  const points = [0, 0, 10, 20, 30, 41, 52, 100, 110, 120].map((anchor, id) => point(id, anchor));
  let parents = groupOverlappingPoints(points, 200);
  for (let cutoff = 120; cutoff >= 0; cutoff--) {
    const groups = groupOverlappingPoints(points, cutoff);
    assert.deepEqual(groups.flat(), points);
    for (const group of groups) {
      assert.ok(group.at(-1).anchor - group[0].anchor <= cutoff);
      assert.equal(parents.filter(parent => group.every(member => parent.includes(member))).length, 1);
    }
    parents = groups;
  }
  assert.deepEqual(ids(groupOverlappingPoints(points, 200)), [points.map(point => point.idea.id)]);
});

test('panning preserves full membership of groups crossing viewport edges', () => {
  const points = [0, 10, 20, 40, 65, 75].map((anchor, id) => point(id, anchor));
  const visible = (start, end) => groupOverlappingPoints(points, 56)
    .filter(group => group.at(-1).anchor >= start && group[0].anchor <= end);
  assert.deepEqual(ids(visible(0, 80)), ids(visible(15, 95)));
  assert.deepEqual(ids(visible(50, 130)), [[4, 5]]);
});

test('bounds groups instead of chaining across a dense timeline', () => {
  const points = [0, 50, 100, 150, 200].map((anchor, id) => point(id, anchor));
  const groups = groupOverlappingPoints(points, 56);
  assert.ok(groups.length > 1);
  assert.ok(groups.every(group => group.at(-1).anchor - group[0].anchor <= 56));
});

test('handles empty input, unsorted input and inseparable same-date points', () => {
  assert.deepEqual(groupOverlappingPoints([], 0), []);
  assert.deepEqual(ids(groupOverlappingPoints([point('late', 20), point('a', 10), point('b', 10)], 0)), [['a', 'b'], ['late']]);
});
