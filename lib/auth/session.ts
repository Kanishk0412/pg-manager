import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "../db/client";

const COOKIE_NAME = "pgm_session";

/**
 * Resolve the JWT secret at call time. We deliberately do NOT fall back to a
 * hardcoded value: a known secret would let anyone forge session tokens
 * (including owner/super_admin) in any environment where JWT_SECRET is unset.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is not configured. Refusing to sign/verify sessions with an insecure default."
    );
  }
  return secret;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  fullName: string;
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(payload: SessionPayload) {
  const cookieStore = await cookies();
  const token = signToken(payload);
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { organization: true },
  });

  if (!user || user.status !== "active") return null;
  return user;
}
