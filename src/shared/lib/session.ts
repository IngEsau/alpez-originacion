import type { DemoUser } from "../../features/applications/types/application.types";

const SESSION_KEY = "alpez_demo_session";

export const demoUser: DemoUser = {
  id: "demo_user_1",
  name: "Ejecutivo Demo",
  email: "demo@alpez.local",
  role: "admin_demo",
};

export function hasDemoSession(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage.getItem(SESSION_KEY));
}

export function createDemoSession(): DemoUser {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(demoUser));
  return demoUser;
}

export function destroyDemoSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

export function getDemoSession(): DemoUser | null {
  if (!hasDemoSession()) return null;
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as DemoUser | null;
  } catch {
    return demoUser;
  }
}
