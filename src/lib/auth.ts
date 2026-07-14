import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { cache } from "react";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dw-views-secret-key-change-in-production"
);

const COOKIE_NAME = "dw-views-session";

export type UserRole = "admin" | "editor" | "viewer";

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as number,
      username: payload.username as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      displayName: payload.displayName as string,
    };
  } catch {
    return null;
  }
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
});

export { COOKIE_NAME };
