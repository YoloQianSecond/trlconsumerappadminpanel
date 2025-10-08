import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validators";
import { deleteUploadIfLocal } from "@/lib/uploads";

export const runtime = "nodejs";
type Params = { params: { id: string } };

export async function PUT(req: Request, { params }: Params) {
  const body = await req.json().catch(() => ({}));
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, imageUrl } = parsed.data;
  const data: any = { name };
  if (imageUrl !== undefined) data.imageUrl = imageUrl; // undefined=no change; null=clear; string=set

  const updated = await prisma.category.update({ where: { id: params.id }, data });

  // If image changed or cleared, delete old file (best-effort)
  if (imageUrl !== undefined && imageUrl !== existing.imageUrl) {
    await deleteUploadIfLocal(existing.imageUrl);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Partners use onDelete:SetNull, so safe to delete the category
  await prisma.category.delete({ where: { id: params.id } });

  await deleteUploadIfLocal(existing.imageUrl);
  return NextResponse.json({ ok: true });
}
