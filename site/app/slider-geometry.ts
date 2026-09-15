// Each thumb gets its own diameter of space; the remaining travel represents
// all selectable dates after removing the minimum visible span.
export function sliderFractions(range: number[], min: number, max: number, minimumSpan: number) {
  const travel = max - min - minimumSpan;
  return [(range[0] - min) / travel, (range[1] - min - minimumSpan) / travel];
}

export function clampThumb(range: number[], index: number, value: number, min: number, max: number, minimumSpan: number) {
  return index === 0
    ? [Math.max(min, Math.min(range[1] - minimumSpan, value)), range[1]]
    : [range[0], Math.min(max, Math.max(range[0] + minimumSpan, value))];
}
