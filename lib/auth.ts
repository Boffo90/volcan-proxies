import crypto from "crypto";
import { cookies } from "next/headers";

export function getExpectedSessionToken(): string {
  const password = process.env.ADMIN_PASSWORD || "";
  const secret = process.env.ADMIN_SESSION_SECRET || "default-secret-change-me";
  return crypto.createHash("sha256").update(password + secret).digest("hex");
}

export function verifyPassword(password: string): boolean {
  if (!process.env.ADMIN_PASSWORD) return false;
  return password === process.env.ADMIN_PASSWORD;
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!session) return false;
  return session === getExpectedSessionToken();
}

