/** Round to 2 decimals to avoid floating point drift (e.g. 0.1 + 0.2). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatSAR(value: number): string {
  return `${round2(value).toFixed(2)} SAR`;
}
