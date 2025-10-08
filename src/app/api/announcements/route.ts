import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { announcementSchema } from "@/lib/validators";
import { deleteUploadIfLocal } from "@/app/lib/uploads";

export async function GET() {
  const items = await prisma.announcement.findMany({
    orderBy: [{ datePublished: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const a = await prisma.announcement.create({ data: parsed.data });
  return NextResponse.json(a, { status: 201 });
}
