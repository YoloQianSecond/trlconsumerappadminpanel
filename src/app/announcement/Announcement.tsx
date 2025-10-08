"use client";

import * as React from "react";
import { z } from "zod";

/* ---------- Types (client-side) ---------- */
type Announcement = {
  id: string;
  title: string;
  description: string;
  link: string;
  datePublished: string; // ISO from API
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ---------- Helpers ---------- */
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok)
    throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
  return res.json();
}

// ISO -> "yyyy-MM-dd" for <input type="date">
function toLocalDateValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Table display: date only
function fmtDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/* ---------- Draft form state ---------- */
type Draft = {
  id?: string;
  title: string;
  description: string;
  link: string;
  datePublished: string; // "yyyy-MM-dd" for input
  imageUrl?: string | null;     // persisted URL (relative or absolute)
  _file?: File | null;   // selected (not yet uploaded)
  _preview?: string | null; // object URL
};

/* ---------- Client-side validation (mirrors server) ---------- */
const AnnFormSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  description: z.string().trim().min(2, "Description must be at least 2 characters"),
  link: z.string().trim().url("Please enter a valid URL (https://...)"),
  datePublished: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (v) => !v || v.startsWith("/uploads/") || /^https?:\/\//i.test(v),
      { message: "Image must be a full URL or start with /uploads/" }
    ),
});
type AnnFormInput = z.infer<typeof AnnFormSchema>;

/* ---------- Page ---------- */
export default function AnnouncementPage() {
  const [items, setItems] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);

  // validation state
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formAlert, setFormAlert] = React.useState<string | null>(null);

  // Initial load
  React.useEffect(() => {
    (async () => {
      try {
        const { items } = await api<{ items: Announcement[] }>("/api/announcements");
        setItems(items);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- Validation helpers ---------- */
  function validateDraft(d: Draft): Record<string, string> {
    const res = AnnFormSchema.safeParse({
      title: d.title,
      description: d.description,
      link: d.link,
      datePublished: d.datePublished,
      imageUrl: d.imageUrl,
    } as AnnFormInput);
    if (res.success) return {};
    const map: Record<string, string> = {};
    for (const issue of res.error.issues) {
      const k = issue.path[0] as string;
      if (!map[k]) map[k] = issue.message;
    }
    return map;
  }

  /* ---------- Actions ---------- */
  function openCreate() {
    const todayIso = new Date().toISOString();
    const d: Draft = {
      title: "",
      description: "",
      link: "",
      datePublished: toLocalDateValue(todayIso),
      imageUrl: undefined,
      _file: null,
      _preview: null,
    };
    setDraft(d);
    setErrors(validateDraft(d));
    setFormAlert(null);
    setModalOpen(true);
  }

  function openEdit(a: Announcement) {
    const d: Draft = {
      id: a.id,
      title: a.title,
      description: a.description,
      link: a.link,
      datePublished: toLocalDateValue(a.datePublished),
      imageUrl: a.imageUrl ?? undefined,
      _file: null,
      _preview: null,
    };
    setDraft(d);
    setErrors(validateDraft(d));
    setFormAlert(null);
    setModalOpen(true);
  }

  function onFileChange(file: File | null) {
    if (!draft) return;
    if (draft._preview) URL.revokeObjectURL(draft._preview);
    const next = {
      ...draft,
      _file: file,
      _preview: file ? URL.createObjectURL(file) : null,
      // clearing persisted url when removing a new selection (keep if you prefer)
      imageUrl: file ? draft.imageUrl : undefined,
    };
    setDraft(next);
    setErrors(validateDraft(next));
  }

  async function uploadFileIfNeeded(): Promise<string | null | undefined> {
    if (!draft?._file) return draft?.imageUrl ?? null; // keep existing, or clear if none
    const fd = new FormData();
    fd.append("file", draft._file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Upload failed");
    return json.url as string; // e.g. /uploads/xxx.jpg
  }

  async function submitDraft() {
    if (!draft) return;

    // client-side validation first
    const clientErrors = validateDraft(draft);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      setFormAlert("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setFormAlert(null);
    try {
      const imageUrl = await uploadFileIfNeeded();
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        link: draft.link.trim(),
        // send "YYYY-MM-DD"; server zod will coerce and normalize to midnight
        datePublished: draft.datePublished,
        imageUrl,
      };

      if (draft.id) {
        const updated = await api<Announcement>(`/api/announcements/${draft.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setItems((cur) => cur.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await api<Announcement>("/api/announcements", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setItems((cur) => [created, ...cur]);
      }

      if (draft._preview) URL.revokeObjectURL(draft._preview);
      setModalOpen(false);
      setDraft(null);
    } catch (e: any) {
      setFormAlert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await api(`/api/announcements/${id}`, { method: "DELETE" });
      setItems((cur) => cur.filter((x) => x.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  /* ---------- Render ---------- */
  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Announcements</h1>

      <div className="card" style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div className="helper">
            Publish and manage announcements. Fields: date, title, description, link, image.
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            Add announcement
          </button>
        </div>
      </div>

      {error && (
        <div className="card alert">{error}</div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="helper">Loading…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 13, color: "var(--muted)" }}>
                <th style={{ padding: "10px 8px" }}>Image</th>
                <th style={{ padding: "10px 8px" }}>Date</th>
                <th style={{ padding: "10px 8px" }}>Title</th>
                <th style={{ padding: "10px 8px" }}>Description</th>
                <th style={{ padding: "10px 8px" }}>Link</th>
                <th style={{ padding: "10px 8px", width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 8px" }}>
                    {a.imageUrl ? (
                      <img
                        src={a.imageUrl}
                        alt=""
                        style={{
                          width: 60,
                          height: 40,
                          objectFit: "cover",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                        }}
                      />
                    ) : (
                      <span className="helper">—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{fmtDateOnly(a.datePublished)}</td>
                  <td style={{ padding: "10px 8px", fontWeight: 600 }}>{a.title}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <span className="helper">{a.description}</span>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <a
                      href={a.link}
                      target="_blank"
                      rel="noreferrer"
                      className="helper"
                      style={{ textDecoration: "underline" }}
                    >
                      {a.link}
                    </a>
                  </td>
                  <td style={{ padding: "10px 8px", display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => openEdit(a)}>
                      Edit
                    </button>
                    <button className="btn" onClick={() => deleteAnnouncement(a.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 12 }} className="helper">
                    No announcements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && draft && (
        <div>
          <div
            onClick={() => setModalOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 50 }}
          />
          <div
            className="card"
            style={{
              position: "fixed",
              zIndex: 51,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 680,
              maxWidth: "94vw",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              {draft.id ? "Edit announcement" : "Add announcement"}
            </h3>

            {formAlert && <div className="alert">{formAlert}</div>}

            <div style={{ display: "grid", gap: 10 }}>
              {/* Date */}
              <label className="helper">Date</label>
              <input
                type="date"
                required
                className={`input ${errors.datePublished ? "input-error" : ""}`}
                value={draft.datePublished}
                onChange={(e) => {
                  const next = { ...draft, datePublished: e.target.value };
                  setDraft(next);
                  setErrors(validateDraft(next));
                }}
              />
              {errors.datePublished && (
                <div className="error-text">{errors.datePublished}</div>
              )}

              {/* Title */}
              <label className="helper">Title</label>
              <input
                required
                minLength={2}
                className={`input ${errors.title ? "input-error" : ""}`}
                value={draft.title}
                onChange={(e) => {
                  const next = { ...draft, title: e.target.value };
                  setDraft(next);
                  setErrors(validateDraft(next));
                }}
              />
              {errors.title && <div className="error-text">{errors.title}</div>}

              {/* Description */}
              <label className="helper">Description</label>
              <textarea
                required
                minLength={2}
                className={`input ${errors.description ? "input-error" : ""}`}
                rows={4}
                value={draft.description}
                onChange={(e) => {
                  const next = { ...draft, description: e.target.value };
                  setDraft(next);
                  setErrors(validateDraft(next));
                }}
                style={{ resize: "vertical", paddingTop: 10, paddingBottom: 10 }}
              />
              {errors.description && (
                <div className="error-text">{errors.description}</div>
              )}

              {/* Link */}
              <label className="helper">Link</label>
              <input
                type="url"
                required
                pattern="https?://.+"
                className={`input ${errors.link ? "input-error" : ""}`}
                placeholder="https://example.com"
                value={draft.link}
                onChange={(e) => {
                  const next = { ...draft, link: e.target.value };
                  setDraft(next);
                  setErrors(validateDraft(next));
                }}
              />
              {errors.link && <div className="error-text">{errors.link}</div>}

              {/* Image */}
              <div style={{ display: "grid", gap: 6 }}>
                <label className="helper">Image (optional)</label>
                {draft._preview || draft.imageUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={draft._preview || (draft.imageUrl as string)}
                      alt=""
                      style={{
                        width: 120,
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <button
                      className="btn"
                      onClick={() => {
                        onFileChange(null);
                        const next = { ...draft, imageUrl: null }; // clear persisted url too
                        setDraft(next);
                        setErrors(validateDraft(next));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="helper">No image selected.</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
                {errors.imageUrl && (
                  <div className="error-text">{errors.imageUrl}</div>
                )}
                <span className="helper">Accepted: JPG, PNG, WEBP, GIF. Max 5MB.</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
              }}
            >
              <button className="btn" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submitDraft}
                disabled={
                  saving ||
                  !!Object.keys(errors).length || // trust validation
                  !draft.title.trim() ||
                  !draft.description.trim() ||
                  !draft.link.trim() ||
                  !draft.datePublished
                }
              >
                {saving ? "Saving..." : draft.id ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
