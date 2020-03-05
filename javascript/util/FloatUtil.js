export const EPSILON = 1e-9;

export function equalWithEpsilon(a, b) {
  return Math.abs(a - b) < EPSILON;
}
export function greaterThanWithEpsilon(a, b) {
  return a - b > EPSILON;
}
export function greaterThanOrEqualWithEpsilon(a, b) {
  return b - a < EPSILON;
}
export function lessThanOrEqualWithEpsilon(a, b) {
  return a - b < EPSILON;
}
export function lessThanWithEpsilon(a, b) {
  return b - a > EPSILON;
}
