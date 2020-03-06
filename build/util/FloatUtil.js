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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmxvYXRVdGlsLmpzIiwic291cmNlUm9vdCI6Ii4vc3JjLyIsInNvdXJjZXMiOlsidXRpbC9GbG9hdFV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFXLElBQUksQ0FBQztBQUVwQyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsQ0FBUyxFQUFFLENBQVM7SUFDbkQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUM7QUFDbkMsQ0FBQztBQUNELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxDQUFTLEVBQUUsQ0FBUztJQUN6RCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDO0FBQ3pCLENBQUM7QUFDRCxNQUFNLFVBQVUsNkJBQTZCLENBQUMsQ0FBUyxFQUFFLENBQVM7SUFDaEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQztBQUN6QixDQUFDO0FBQ0QsTUFBTSxVQUFVLDBCQUEwQixDQUFDLENBQVMsRUFBRSxDQUFTO0lBQzdELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUM7QUFDekIsQ0FBQztBQUNELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxDQUFTLEVBQUUsQ0FBUztJQUN0RCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDO0FBQ3pCLENBQUMifQ==