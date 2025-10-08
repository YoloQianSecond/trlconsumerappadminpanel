import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { partnerSchema } from "@/lib/validators";
import { deleteUploadIfLocal } from "@/lib/uploads";

export const runtime = "nodejs";

type Params = { params: { id: string } };

export async function PUT(req: Request, { params }: Params) {
  const body = await req.json().catch(() => ({}));
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.partner.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, categoryId, link, featured, imageUrl } = parsed.data;
  const data: any = { name, categoryId, link, featured };
  if (imageUrl !== undefined) data.imageUrl = imageUrl; // undefined => no change; null => clear

  const updated = await prisma.partner.update({ where: { id: params.id }, data });

  if (imageUrl !== undefined && imageUrl !== existing.imageUrl) {
    await deleteUploadIfLocal(existing.imageUrl);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const existing = await prisma.partner.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.partner.delete({ where: { id: params.id } });
  await deleteUploadIfLocal(existing.imageUrl);

  return NextResponse.json({ ok: true });
}
