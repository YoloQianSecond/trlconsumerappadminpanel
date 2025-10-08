import { unlink } from "fs/promises";
import path from "path";

/** Accept only our public uploads path and block traversal. */
export function isLocalUpload(url?: string | null): url is string {
  return !!url && url.startsWith("/uploads/") && !url.includes("..");
}

export function toFsPath(url: string) {
  // url like /uploads/abc.jpg  ->  <repo>/public/uploads/abc.jpg
  return path.join(process.cwd(), "public", url);
}

export async function deleteUploadIfLocal(url?: string | null) {
  if (!isLocalUpload(url)) return;
  try {
    await unlink(toFsPath(url));
  } catch {
    // ignore (file already missing, race, etc.)
  }
}
