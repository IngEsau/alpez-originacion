export const MOCK_DELAY_MS = 600;

export function wait(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
