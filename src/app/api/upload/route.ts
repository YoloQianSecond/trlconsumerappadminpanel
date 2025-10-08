import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { randomBytes } from "crypto";
import { extname } from "path";

export const runtime = "nodejs"; // ensure Node runtime (not edge) for fs

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  // Expect multipart/form-data with field name "file"
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const type = file.type || "application/octet-stream";
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  // Decide extension by MIME (fallback to original, if any)
  const orig = (file as any).name as string | undefined;
  const origExt = orig ? extname(orig) : "";
  const ext = type === "image/jpeg" ? ".jpg"
            : type === "image/png"  ? ".png"
            : type === "image/webp" ? ".webp"
            : type === "image/gif"  ? ".gif"
            : (origExt || ".bin");

  const bytes = await file.arrayBuffer();
  const buf = Buffer.from(bytes);

  // Ensure folder exists
  const dir = process.cwd() + "/public/uploads";
  await mkdir(dir, { recursive: true });

  // Unique name
  const name = `${Date.now()}_${randomBytes(6).toString("hex")}${ext}`;
  const fullPath = `${dir}/${name}`;
  await writeFile(fullPath, buf);

  // Public URL (served by Next static)
  const url = `/uploads/${name}`;
  return NextResponse.json({ url }, { status: 201 });
}
