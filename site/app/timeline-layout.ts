export type AnchoredPoint<T> = { idea: T; anchor: number };

// The point button is deliberately larger than the visible dot so it remains
// easy to hit. Include a small breathing room beyond that hit area when
// deciding whether two points need to be represented by one aggregate.
export const IDEA_NODE_WIDTH = 44;
export const IDEA_COLLISION_MARGIN = 12;
export const IDEA_COLLISION_DISTANCE = IDEA_NODE_WIDTH + IDEA_COLLISION_MARGIN;

/**
 * Group only the points in one bounded collision window.
 *
 * Comparing with the first point in the current group is intentional. Using
 * the previous point creates a transitive chain where a whole dense timeline
 * becomes one aggregate, even though its endpoints would not overlap.
 */
export function groupOverlappingPoints<T>(points: readonly AnchoredPoint<T>[], collisionDistance = IDEA_COLLISION_DISTANCE) {
  const sorted = [...points].sort((a, b) => a.anchor - b.anchor);
  const groups: AnchoredPoint<T>[][] = [];
  for (const point of sorted) {
    const current = groups.at(-1);
    if (current && point.anchor - current[0].anchor <= collisionDistance) current.push(point);
    else groups.push([point]);
  }
  return groups;
}

// Grow the visible diameter from 18px to 36px, capped at twenty ideas.
export function ideaDotSize(count: number) {
  return 18 * (1 + Math.min(19, Math.max(0, count - 1)) / 19);
}
