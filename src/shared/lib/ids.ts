export function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createFolio(nextNumber: number): string {
  return `ALP-${String(nextNumber).padStart(6, "0")}`;
}
