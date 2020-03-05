export const EPSILON: number = 1e-9;

export function equalWithEpsilon(a: number, b: number) {
  return Math.abs(a - b) < EPSILON;
}
export function greaterThanWithEpsilon(a: number, b: number) {
  return a - b > EPSILON;
}
export function greaterThanOrEqualWithEpsilon(a: number, b: number) {
  return b - a < EPSILON;
}
export function lessThanOrEqualWithEpsilon(a: number, b: number) {
  return a - b < EPSILON;
}
export function lessThanWithEpsilon(a: number, b: number) {
  return b - a > EPSILON;
}
