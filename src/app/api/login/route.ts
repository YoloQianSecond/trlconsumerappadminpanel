import { NextResponse } from "next/server";
import { z } from "zod";
import { MOCK_USERS } from "@/lib/mockUsers";
import { issueSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = MOCK_USERS.find((u) => u.email === email && u.password === password);

  // In a real app, fetch from Postgres + verify hash here
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await issueSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({ ok: true });
}
