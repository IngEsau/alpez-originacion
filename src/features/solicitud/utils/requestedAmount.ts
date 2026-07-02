export const MIN_REQUESTED_AMOUNT = 10000;
export const MAX_REQUESTED_AMOUNT = 120000;

export function isRequestedAmountInDemoRange(value: number | undefined): boolean {
  return typeof value === "number" && value >= MIN_REQUESTED_AMOUNT && value <= MAX_REQUESTED_AMOUNT;
}
