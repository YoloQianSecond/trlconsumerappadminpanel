import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { announcementSchema } from "@/lib/validators";
import { deleteUploadIfLocal } from "@/lib/uploads";

export const runtime = "nodejs"; // required because we use fs in deleteUploadIfLocal

type Params = { params: { id: string } };

export async function PUT(req: Request, { params }: Params) {
  const body = await req.json().catch(() => ({}));
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.announcement.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only set imageUrl if provided:
  //   undefined => no change; null => clear; string => set
  const { title, description, link, datePublished, imageUrl: suppliedImage } = parsed.data;
  const data: Record<string, any> = { title, description, link, datePublished };
  if (suppliedImage !== undefined) data.imageUrl = suppliedImage;

  const updated = await prisma.announcement.update({ where: { id: params.id }, data });

  // If image changed or was cleared, delete the old file (best-effort)
  if (suppliedImage !== undefined && suppliedImage !== existing.imageUrl) {
    await deleteUploadIfLocal(existing.imageUrl);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  // fetch first to get imageUrl
  const existing = await prisma.announcement.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.announcement.delete({ where: { id: params.id } });

  // best-effort file cleanup
  await deleteUploadIfLocal(existing.imageUrl);

  return NextResponse.json({ ok: true });
}
