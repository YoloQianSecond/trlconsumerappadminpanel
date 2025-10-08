import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const cat = await prisma.category.create({ data: parsed.data });
  return NextResponse.json(cat, { status: 201 });
}
