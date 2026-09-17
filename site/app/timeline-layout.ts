export type AnchoredPoint<T> = { idea: T; anchor: number };

// The point button is deliberately larger than the visible dot so it remains
// easy to hit. Include a small breathing room beyond that hit area when
// deciding whether two points need to be represented by one aggregate.
export const IDEA_NODE_WIDTH = 44;
export const IDEA_COLLISION_MARGIN = 12;
export const IDEA_COLLISION_DISTANCE = IDEA_NODE_WIDTH + IDEA_COLLISION_MARGIN;

/**
 * Cut a stable hierarchy at the requested maximum span. Each branch splits
 * at its largest gap (the earliest gap wins ties), independent of the cutoff.
 * Reducing the cutoff can therefore only subdivide existing groups.
 * Pass all points in date coordinates and a cutoff in date units so panning
 * and floating-point screen projection cannot change the hierarchy.
 */
export function groupOverlappingPoints<T>(points: readonly AnchoredPoint<T>[], collisionDistance = IDEA_COLLISION_DISTANCE) {
  const sorted = [...points].sort((a, b) => a.anchor - b.anchor);
  const groups: AnchoredPoint<T>[][] = [];
  const pending = sorted.length ? [[0, sorted.length]] : [];
  while (pending.length) {
    const [start, end] = pending.pop()!;
    const span = sorted[end - 1].anchor - sorted[start].anchor;
    if (end - start === 1 || span === 0 || span <= collisionDistance) {
      groups.push(sorted.slice(start, end));
      continue;
    }
    let split = start + 1;
    for (let index = start + 2; index < end; index++) {
      if (sorted[index].anchor - sorted[index - 1].anchor > sorted[split].anchor - sorted[split - 1].anchor) split = index;
    }
    // Stack the right branch first to emit groups in chronological order.
    pending.push([split, end], [start, split]);
  }
  return groups;
}

// Grow the visible diameter from 18px to 36px, capped at twenty ideas.
export function ideaDotSize(count: number) {
  return 18 * (1 + Math.min(19, Math.max(0, count - 1)) / 19);
}
