/**
 * Axis-aligned bounding box overlap test.
 * @param {object} a - {x, y, hw (half-width), hh (half-height)}
 * @param {object} b - same shape
 * @returns {boolean}
 */
export function aabbOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.hw + b.hw) &&
         Math.abs(a.y - b.y) < (a.hh + b.hh);
}
