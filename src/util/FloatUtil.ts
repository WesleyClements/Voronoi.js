export const EPSILON: number = 1e-9;

export function equalWithEpsilon(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}
export function greaterThanWithEpsilon(a: number, b: number): boolean {
  return a - b > EPSILON;
}
export function greaterThanOrEqualWithEpsilon(a: number, b: number): boolean {
  return b - a < EPSILON;
}
export function lessThanOrEqualWithEpsilon(a: number, b: number): boolean {
  return a - b < EPSILON;
}
export function lessThanWithEpsilon(a: number, b: number): boolean {
  return b - a > EPSILON;
}

export function constrain(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function isBetween(n: number, min: number, max: number): boolean {
  if (n < min) return false;
  if (n > max) return false;
  return true;
}
