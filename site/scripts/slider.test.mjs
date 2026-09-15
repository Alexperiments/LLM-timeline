import test from 'node:test';
import assert from 'node:assert/strict';
import { clampThumb, sliderFractions } from '../app/slider-geometry.ts';

const DAY = 86_400_000;
const min = Date.UTC(2018, 0, 1);
const max = Date.UTC(2026, 8, 15);
const month = 30 * DAY;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test('thumbs touch at one month and reach frame edges at full range, throughout expansion', () => {
  for (const width of [320, 768, 1440]) {
    for (const diameter of [20, 26, 32, 38, 44]) {
      const travel = width - 2 * diameter;
      for (const start of [min, min + 1000 * DAY, max - month]) {
        const [a, b] = sliderFractions([start, start + month], min, max, month);
        near(a * travel + diameter, b * travel + diameter);
        assert.ok(a * travel >= 0);
        assert.ok(b * travel + 2 * diameter <= width);
      }
      const [a, b] = sliderFractions([min, max], min, max, month);
      near(a * travel, 0);
      near(b * travel + 2 * diameter, width);
    }
  }
});

test('dragging either thumb across its neighbor clamps at one month without moving the neighbor', () => {
  const original = [min + 100 * DAY, min + 200 * DAY];
  const left = clampThumb(original, 0, max, min, max, month);
  const right = clampThumb(original, 1, min, min, max, month);
  assert.deepEqual(left, [original[1] - month, original[1]]);
  assert.deepEqual(right, [original[0], original[0] + month]);
  const originalFractions = sliderFractions(original, min, max, month);
  near(sliderFractions(left, min, max, month)[1], originalFractions[1]);
  near(sliderFractions(right, min, max, month)[0], originalFractions[0]);
  assert.deepEqual(clampThumb(original, 0, min - DAY, min, max, month), [min, original[1]]);
  assert.deepEqual(clampThumb(original, 1, max + DAY, min, max, month), [original[0], max]);
});

test('thumbs never overlap for valid ranges and bar joins their top and bottom tangents', () => {
  for (const diameter of [20, 32, 44]) {
    const travel = 1000 - diameter * 2;
    for (const span of [month, 365 * DAY, max - min]) {
      const [a, b] = sliderFractions([min, min + span], min, max, month);
      const leftCenter = a * travel + diameter / 2;
      const barWidth = (b - a) * travel + diameter;
      const rightCenter = b * travel + diameter * 1.5;
      assert.ok(barWidth >= diameter);
      near(leftCenter + barWidth, rightCenter);
    }
  }
});
