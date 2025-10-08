import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { partnerSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.partner.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const p = await prisma.partner.create({ data: parsed.data });
  return NextResponse.json(p, { status: 201 });
}
