import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev_secret_change_me");
const COOKIE_NAME = "trlco_session";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

export type Session = {
  sub: string;            // user id
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
};

export async function issueSession(payload: Session) {
  const token = await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(SECRET);

  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function readSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    // minimal shape validation
    const s = payload as unknown as Session;
    if (s?.sub && s?.email && s?.role) return s;
    return null;
  } catch {
    return null;
  }
}

/** Server-side utility: are we authenticated right now? */
export async function isAuthed() {
  return (await readSession()) !== null;
}

/** Useful for CSRF-ish checks if you add forms later */
export function getOrigin() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
