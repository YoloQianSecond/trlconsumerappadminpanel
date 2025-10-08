"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Partner, Category } from "@/lib/types";

/* ------------------------ Utilities ------------------------ */
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
  return res.json();
}

type PartnerFormState = {
  id?: string;
  name: string;
  categoryId: string;
  link: string;
  featured: boolean;
  imageUrl?: string | null;   // <-- NEW
  _file?: File | null;
  _preview?: string | null;
};

/* ------------------------ Client-side validation ------------------------ */
const PartnerFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  categoryId: z.string().min(1, "Choose a category"),
  link: z.string().trim().url("Please enter a valid URL (https://...)"),
  featured: z.boolean(),
  imageUrl: z.string().trim().optional().nullable().refine(
    v => v == null || v.startsWith("/uploads/") || /^https?:\/\//i.test(v),
    { message: "Image must be a full URL or start with /uploads/" }
  ),
});
type PartnerFormInput = z.infer<typeof PartnerFormSchema>;

/* ------------------------ Page ------------------------ */
export default function PartnerPage() {
  const [items, setItems] = useState<Partner[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<PartnerFormState | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ items: partners }, { items: categories }] = await Promise.all([
          api<{ items: Partner[] }>("/api/partners"),
          api<{ items: Category[] }>("/api/categories"),
        ]);
        setItems(partners);
        setCats(categories);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function validateDraft(d: PartnerFormState): Record<string, string> {
    const res = PartnerFormSchema.safeParse({
      name: d.name, categoryId: d.categoryId, link: d.link, featured: d.featured, imageUrl: d.imageUrl,
    } as PartnerFormInput);
    if (res.success) return {};
    const map: Record<string, string> = {};
    for (const issue of res.error.issues) {
      const k = issue.path[0] as string;
      if (!map[k]) map[k] = issue.message;
    }
    return map;
  }

  function openCreate() {
    const d: PartnerFormState = { name: "", categoryId: cats[0]?.id ?? "", link: "", featured: false, imageUrl: undefined, _file: null, _preview: null };
    setDraft(d); setErrors(validateDraft(d)); setFormAlert(null); setModalOpen(true);
  }

  function openEdit(p: Partner) {
    const d: PartnerFormState = { id: p.id, name: p.name, categoryId: p.categoryId, link: p.link, featured: p.featured, imageUrl: (p as any).imageUrl ?? undefined, _file: null, _preview: null };
    setDraft(d); setErrors(validateDraft(d)); setFormAlert(null); setModalOpen(true);
  }

  function onFileChange(file: File | null) {
    if (!draft) return;
    if (draft._preview) URL.revokeObjectURL(draft._preview);
    const next = { ...draft, _file: file, _preview: file ? URL.createObjectURL(file) : null, imageUrl: file ? draft.imageUrl : draft.imageUrl };
    setDraft(next);
    setErrors(validateDraft(next));
  }

  async function uploadFileIfNeeded(): Promise<string | null | undefined> {
    if (!draft?._file) return draft?.imageUrl ?? null; // if Remove clicked, imageUrl will be null
    const fd = new FormData();
    fd.append("file", draft._file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Upload failed");
    return json.url as string; // /uploads/xxx.jpg
  }

  async function submitDraft() {
    if (!draft) return;

    const clientErrors = validateDraft(draft);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) { setFormAlert("Please fix the highlighted fields."); return; }

    setSaving(true);
    setFormAlert(null);
    let uploadedUrl: string | null | undefined = undefined;

    try {
      uploadedUrl = await uploadFileIfNeeded();

      const payload = {
        name: draft.name.trim(),
        categoryId: draft.categoryId,
        link: draft.link.trim(),
        featured: draft.featured,
        imageUrl: uploadedUrl, // string | null | undefined
      };

      if (draft.id) {
        const updated = await api<Partner>(`/api/partners/${draft.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setItems((cur) => cur.map((x) => (x.id === (updated as any).id ? updated : x)));
      } else {
        const created = await api<Partner>("/api/partners", { method: "POST", body: JSON.stringify(payload) });
        setItems((cur) => [created, ...cur]);
      }

      if (draft._preview) URL.revokeObjectURL(draft._preview);
      setModalOpen(false); setDraft(null);
    } catch (e: any) {
      // optional: cleanup uploadedUrl if API failed
      if (uploadedUrl && uploadedUrl.startsWith("/uploads/") && draft?.id) {
        fetch(`/api/upload?url=${encodeURIComponent(uploadedUrl)}`, { method: "DELETE" }).catch(() => {});
      }
      setFormAlert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deletePartner(id: string) {
    if (!confirm("Delete this partner?")) return;
    try {
      await api(`/api/partners/${id}`, { method: "DELETE" });
      setItems((cur) => cur.filter((x) => x.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c.name])), [cats]);

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Partners</h1>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div className="helper">Create and manage partners. Fields: name, category, link, featured, image.</div>
          <button className="btn btn-primary" onClick={openCreate}>Add partner</button>
        </div>
      </div>

      {error && <div className="card alert">{error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="helper">Loading…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 13, color: "var(--muted)" }}>
                <th style={{ padding: "10px 8px" }}>Image</th>
                <th style={{ padding: "10px 8px" }}>Name</th>
                <th style={{ padding: "10px 8px" }}>Category</th>
                <th style={{ padding: "10px 8px" }}>Link</th>
                <th style={{ padding: "10px 8px" }}>Featured</th>
                <th style={{ padding: "10px 8px", width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 8px" }}>
                    {(p as any).imageUrl ? (
                      <img src={(p as any).imageUrl} alt="" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                    ) : <span className="helper">—</span>}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{p.name}</td>
                  <td style={{ padding: "10px 8px" }}>{catMap[p.categoryId] ?? "—"}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <a href={p.link} target="_blank" rel="noreferrer" className="helper" style={{ textDecoration: "underline" }}>{p.link}</a>
                  </td>
                  <td style={{ padding: "10px 8px" }}>{p.featured ? "Yes" : "No"}</td>
                  <td style={{ padding: "10px 8px", display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn" onClick={() => deletePartner(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 12 }} className="helper">No partners yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && draft && (
        <div>
          <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 50 }} />
          <div className="card" style={{ position: "fixed", zIndex: 51, top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 640, maxWidth: "94vw" }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>{draft.id ? "Edit partner" : "Add partner"}</h3>
            {formAlert && <div className="alert">{formAlert}</div>}

            <div style={{ display: "grid", gap: 10 }}>
              {/* Name */}
              <label className="helper">Name</label>
              <input required minLength={2} className={`input ${errors.name ? "input-error" : ""}`}
                value={draft.name}
                onChange={(e) => { const next = { ...draft, name: e.target.value }; setDraft(next); setErrors(validateDraft(next)); }}
              />
              {errors.name && <div className="error-text">{errors.name}</div>}

              {/* Category + inline add */}
              <div style={{ display: "grid", gap: 6 }}>
                <label className="helper">Category</label>
                {cats.length > 0 ? (
                  <select className={`input ${errors.categoryId ? "input-error" : ""}`}
                    value={draft.categoryId}
                    onChange={(e) => { const next = { ...draft, categoryId: e.target.value }; setDraft(next); setErrors(validateDraft(next)); }}
                  >
                    {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                ) : (<div className="helper">No categories yet — add one below.</div>)}
                {errors.categoryId && <div className="error-text">{errors.categoryId}</div>}

                <InlineAddCategory onCreated={(cat) => {
                  setCats((cur) => [cat, ...cur]);
                  setDraft((d) => { if (!d) return d; const next = { ...d, categoryId: cat.id }; setErrors(validateDraft(next)); return next; });
                }} />
              </div>

              {/* Link */}
              <label className="helper">Link</label>
              <input type="url" required pattern="https?://.+" className={`input ${errors.link ? "input-error" : ""}`}
                placeholder="https://example.com"
                value={draft.link}
                onChange={(e) => { const next = { ...draft, link: e.target.value }; setDraft(next); setErrors(validateDraft(next)); }}
              />
              {errors.link && <div className="error-text">{errors.link}</div>}

              {/* Featured */}
              <label className="helper" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={draft.featured}
                  onChange={(e) => { const next = { ...draft, featured: e.target.checked }; setDraft(next); setErrors(validateDraft(next)); }}
                />
                Featured
              </label>

              {/* Image */}
              <div style={{ display: "grid", gap: 6 }}>
                <label className="helper">Image (optional)</label>
                {draft._preview || draft.imageUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={draft._preview || (draft.imageUrl as string)} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                    <button className="btn" onClick={() => {
                      if (draft._preview) URL.revokeObjectURL(draft._preview);
                      const next = { ...draft, _file: null, _preview: null, imageUrl: null }; // null => clear on save
                      setDraft(next); setErrors(validateDraft(next));
                    }}>Remove</button>
                  </div>
                ) : (<span className="helper">No image selected.</span>)}
                <input type="file" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
                {errors.imageUrl && <div className="error-text">{errors.imageUrl}</div>}
                <span className="helper">Accepted: JPG, PNG, WEBP, GIF. Max 5MB.</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitDraft} disabled={saving || !!Object.keys(errors).length}>
                {saving ? "Saving..." : draft.id ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------ Inline Add Category ------------------------ */
function InlineAddCategory({ onCreated }: { onCreated: (c: Category) => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // image selection
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null | undefined>(undefined); // undefined=no change; string=set; null=clear

  const valid = name.trim().length >= 2;

  function onFileChange(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    // we intentionally leave imageUrl undefined here; we only set after upload
  }

  async function uploadIfNeeded(): Promise<string | null | undefined> {
    if (!file) return imageUrl ?? null; // allow clearing
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Upload failed");
    return json.url as string;
  }

  async function create() {
    if (!valid) return;
    setBusy(true);
    let uploaded: string | null | undefined = undefined;

    try {
      uploaded = await uploadIfNeeded();

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), imageUrl: uploaded }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");

      onCreated(json);
      setName("");
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setImageUrl(undefined);
      setOpen(false);
    } catch (e: any) {
      // optional: cleanup orphan file if POST failed
      if (uploaded && uploaded.startsWith("/uploads/")) {
        fetch(`/api/upload?url=${encodeURIComponent(uploaded)}`, { method: "DELETE" }).catch(() => {});
      }
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ background: "transparent", borderStyle: "dashed", padding: 10 }}>
      {!open ? (
        <button className="btn" onClick={() => setOpen(true)}>+ Add new category</button>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={create} disabled={!valid || busy}>
              {busy ? "Saving..." : "Save"}
            </button>
            <button
              className="btn"
              onClick={() => {
                setOpen(false);
                setName("");
                setFile(null);
                if (preview) URL.revokeObjectURL(preview);
                setPreview(null);
                setImageUrl(undefined);
              }}
            >
              Cancel
            </button>
          </div>

          {/* Image picker */}
          <div style={{ display: "grid", gap: 6 }}>
            <label className="helper">Image (optional)</label>
            {preview || imageUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img
                  src={preview || (imageUrl as string)}
                  alt=""
                  style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
                />
                <button
                  className="btn"
                  onClick={() => {
                    if (preview) URL.revokeObjectURL(preview);
                    setFile(null);
                    setPreview(null);
                    setImageUrl(null); // null => clear on save
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <span className="helper">No image selected.</span>
            )}
            <input type="file" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
            <span className="helper">Accepted: JPG, PNG, WEBP, GIF. Max 5MB.</span>
          </div>
        </div>
      )}
    </div>
  );
}

