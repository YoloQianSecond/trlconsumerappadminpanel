import { z } from "zod";

export const partnerSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().min(1),
  link: z.string().url(),
  featured: z.boolean(),

  // Accept absolute URL, /uploads/... path, null (clear), or undefined (no change on PUT)
  imageUrl: z.union([
    z.string().trim().refine(
      v => v === "" || v.startsWith("/uploads/") || /^https?:\/\//i.test(v),
      { message: "imageUrl must be empty, a full URL, or /uploads/..." }
    ),
    z.null(),
    z.undefined(),
  ]).transform(v => (v === "" ? null : v as string | null | undefined)),
});
export type PartnerInput = z.infer<typeof partnerSchema>;

/** Simple category validator */
export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  // Accept absolute URL, /uploads/... path, null (clear), or undefined (no change on PUT)
  imageUrl: z.union([
    z.string().trim().refine(
      (v) => v === "" || v.startsWith("/uploads/") || /^https?:\/\//i.test(v),
      { message: "imageUrl must be empty, a full URL, or /uploads/..." }
    ),
    z.null(),
    z.undefined(),
  ]).transform((v) => (v === "" ? null : (v as string | null | undefined))),
});
export type CategoryInput = z.infer<typeof categorySchema>;

// Announcements: validate + coerce the date coming from the UI

export const announcementSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(4000),
  link: z.string().url(),
  // date-only; normalize to local start-of-day
  datePublished: z.coerce.date().transform(d => new Date(d.getFullYear(), d.getMonth(), d.getDate())),

  // Accept absolute URL, /uploads/... path, or null to clear.
  imageUrl: z.union([
    z.string().trim().refine(
      v => v === "" || v.startsWith("/uploads/") || /^https?:\/\//i.test(v),
      { message: "imageUrl must be empty, a full URL, or /uploads/..." }
    ),
    z.null(),
    z.undefined()
  ]).transform(v => v === "" ? null : v as string | null | undefined),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;