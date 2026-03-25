import { cookies } from "next/headers";
import { getSession, getUserById, type User } from "./db";

const SESSION_COOKIE = "session";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = getSession(token);
  if (!session) return null;

  const user = getUserById(session.userId);
  return user ?? null;
}

export function getSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  return match.split("=")[1] || null;
}
