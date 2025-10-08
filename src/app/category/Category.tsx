"use client";

import * as React from "react";
import { z } from "zod";
import { Category } from "@/lib/types";

/* ------------------------ Utilities ------------------------ */
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
  return res.json();
}

/* If your Category type doesn't include imageUrl yet, it should be:
   type Category = { id: string; name: string; imageUrl?: string | null; createdAt: string; updatedAt: string } */

/* ------------------------ Client-side validation ------------------------ */
const CategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  // Accept absolute URL, /uploads/... path, or null/undefined (clear / no change)
  imageUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (v) => v == null || v.startsWith("/uploads/") || /^https?:\/\//i.test(v),
      { message: "Image must be a full URL or start with /uploads/" }
    ),
});
type CategoryInput = z.infer<typeof CategorySchema>;

/* ------------------------ Local state types ------------------------ */
type NewDraft = {
  name: string;
  imageUrl?: string | null;
  _file?: File | null;
  _preview?: string | null;
};

type EditDraft = {
  id: string;
  name: string;
  imageUrl?: string | null; // undefined => no change, string => set, null => clear
  _file?: File | null;
  _preview?: string | null;
};

export default function CategoriesPage() {
  const [items, setItems] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);

  // Create row
  const [create, setCreate] = React.useState<NewDraft>({ name: "", imageUrl: undefined, _file: null, _preview: null });
  const [createErrors, setCreateErrors] = React.useState<Record<string, string>>({});
  const [createBusy, setCreateBusy] = React.useState(false);

  // Edit row (inline)
  const [edit, setEdit] = React.useState<EditDraft | null>(null);
  const [editErrors, setEditErrors] = React.useState<Record<string, string>>({});
  const [editBusy, setEditBusy] = React.useState(false);

  // Load categories
  React.useEffect(() => {
    (async () => {
      try {
        const { items } = await api<{ items: Category[] }>("/api/categories");
        setItems(items);
      } catch (e: any) {
        setPageError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ------------------------ Validation helpers ------------------------ */
  function validateNew(d: NewDraft): Record<string, string> {
    const res = CategorySchema.safeParse({ name: d.name, imageUrl: d.imageUrl } as CategoryInput);
    if (res.success) return {};
    const map: Record<string, string> = {};
    for (const issue of res.error.issues) {
      const k = issue.path[0] as string;
      if (!map[k]) map[k] = issue.message;
    }
    return map;
  }

  function validateEdit(d: EditDraft): Record<string, string> {
    // For edit, imageUrl can be undefined (no change), but Zod requires something; validate “provided” values only.
    const input: CategoryInput = { name: d.name, imageUrl: d.imageUrl ?? undefined };
    const res = CategorySchema.safeParse(input);
    if (res.success) return {};
    const map: Record<string, string> = {};
    for (const issue of res.error.issues) {
      const k = issue.path[0] as string;
      if (!map[k]) map[k] = issue.message;
    }
    return map;
  }

  /* ------------------------ File helpers ------------------------ */
  function newOnFileChange(file: File | null) {
    if (create._preview) URL.revokeObjectURL(create._preview);
    const next: NewDraft = {
      ...create,
      _file: file,
      _preview: file ? URL.createObjectURL(file) : null,
      // (keep imageUrl undefined; set after upload)
    };
    setCreate(next);
    setCreateErrors(validateNew(next));
  }

  function editOnFileChange(file: File | null) {
    if (!edit) return;
    if (edit._preview) URL.revokeObjectURL(edit._preview);
    const next: EditDraft = {
      ...edit,
      _file: file,
      _preview: file ? URL.createObjectURL(file) : null,
      // keep imageUrl as-is; will be set/cleared on actions
    };
    setEdit(next);
    setEditErrors(validateEdit(next));
  }

  async function upload(file: File | null): Promise<string | null | undefined> {
    if (!file) return null; // caller can decide how to use null (usually means "no image" on create)
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Upload failed");
    return json.url as string; // e.g. /uploads/xxx.jpg
  }

  /* ------------------------ Create ------------------------ */
  async function add() {
    const errs = validateNew(create);
    setCreateErrors(errs);
    if (Object.keys(errs).length) return;

    setCreateBusy(true);
    let uploaded: string | null | undefined = undefined;

    try {
      uploaded = await upload(create._file!); // null if no file chosen
      const payload = { name: create.name.trim(), imageUrl: uploaded ?? null };

      const cat = await api<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setItems((cur) => [cat, ...cur]);

      // reset
      if (create._preview) URL.revokeObjectURL(create._preview);
      setCreate({ name: "", imageUrl: undefined, _file: null, _preview: null });
      setCreateErrors({});
    } catch (e: any) {
      // optional orphan cleanup
      if (uploaded && uploaded.startsWith("/uploads/")) {
        fetch(`/api/upload?url=${encodeURIComponent(uploaded)}`, { method: "DELETE" }).catch(() => {});
      }
      alert(e.message);
    } finally {
      setCreateBusy(false);
    }
  }

  /* ------------------------ Edit ------------------------ */
  function startEdit(c: Category) {
    // imageUrl undefined so "no change" unless user uploads or clicks Remove
    const d: EditDraft = {
      id: c.id,
      name: c.name,
      imageUrl: undefined,
      _file: null,
      _preview: null,
    };
    setEdit(d);
    setEditErrors(validateEdit(d));
  }

  async function save() {
    if (!edit) return;
    const errs = validateEdit(edit);
    setEditErrors(errs);
    if (Object.keys(errs).length) return;

    setEditBusy(true);
    let uploaded: string | null | undefined = undefined;

    try {
      // If user picked a file, upload; else use imageUrl (could be null if they clicked Remove)
      uploaded = edit._file ? await upload(edit._file) : edit.imageUrl ?? undefined;

      const payload: any = { name: edit.name.trim() };
      if (uploaded !== undefined) payload.imageUrl = uploaded; // undefined => no change; null => clear; string => set

      const updated = await api<Category>(`/api/categories/${edit.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setItems((cur) => cur.map((c) => (c.id === updated.id ? updated : c)));

      if (edit._preview) URL.revokeObjectURL(edit._preview);
      setEdit(null);
      setEditErrors({});
    } catch (e: any) {
      // optional orphan cleanup if upload happened but PUT failed
      if (uploaded && uploaded.startsWith("/uploads/")) {
        fetch(`/api/upload?url=${encodeURIComponent(uploaded)}`, { method: "DELETE" }).catch(() => {});
      }
      alert(e.message);
    } finally {
      setEditBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this category? Partners using it will be detached.")) return;
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      setItems((cur) => cur.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  /* ------------------------ Render ------------------------ */
  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Categories</h1>

      {/* Page error */}
      {pageError && <div className="card" style={{ borderColor: "#5b1a22", background: "#2a1215", color: "#ffb3b8" }}>{pageError}</div>}

      {/* Create */}
      <div className="card" style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className={`input ${createErrors.name ? "input-error" : ""}`}
            placeholder="New category name"
            value={create.name}
            onChange={(e) => {
              const next = { ...create, name: e.target.value };
              setCreate(next);
              setCreateErrors(validateNew(next));
            }}
          />
          <button className="btn btn-primary" onClick={add} disabled={createBusy || !!Object.keys(createErrors).length || !create.name.trim()}>
            {createBusy ? "Adding..." : "Add"}
          </button>
        </div>
        {createErrors.name && <div className="error-text">{createErrors.name}</div>}

        {/* Create image */}
        <div style={{ display: "grid", gap: 6 }}>
          <label className="helper">Image (optional)</label>
          {create._preview ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={create._preview}
                alt=""
                style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
              />
              <button
                className="btn"
                onClick={() => {
                  if (create._preview) URL.revokeObjectURL(create._preview);
                  const next = { ...create, _file: null, _preview: null, imageUrl: null }; // null => clear on save
                  setCreate(next);
                  setCreateErrors(validateNew(next));
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <span className="helper">No image selected.</span>
          )}
          <input type="file" accept="image/*" onChange={(e) => newOnFileChange(e.target.files?.[0] ?? null)} />
          {createErrors.imageUrl && <div className="error-text">{createErrors.imageUrl}</div>}
          <span className="helper">Accepted: JPG, PNG, WEBP, GIF. Max 5MB.</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ marginTop: 12 }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: 13, color: "var(--muted)" }}>
              <th style={{ padding: "10px 8px" }}>Image</th>
              <th style={{ padding: "10px 8px" }}>Name</th>
              <th style={{ padding: "10px 8px", width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="helper" style={{ padding: 12 }}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="helper" style={{ padding: 12 }}>No categories yet.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 8px" }}>
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt="" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                    ) : (
                      <span className="helper">—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {edit?.id === c.id ? (
                      <input
                        className={`input ${editErrors.name ? "input-error" : ""}`}
                        value={edit.name}
                        onChange={(e) => {
                          const next = { ...edit!, name: e.target.value };
                          setEdit(next);
                          setEditErrors(validateEdit(next));
                        }}
                      />
                    ) : (
                      c.name
                    )}
                    {edit?.id === c.id && editErrors.name && <div className="error-text">{editErrors.name}</div>}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {edit?.id === c.id ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {/* Edit image */}
                        <div style={{ display: "grid", gap: 6 }}>
                          <label className="helper">Image (optional)</label>
                          {edit._preview || edit.imageUrl === null /* explicitly marked for removal */ ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {edit._preview ? (
                                <img src={edit._preview} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                              ) : (
                                <span className="helper">Marked to remove on save.</span>
                              )}
                              <button
                                className="btn"
                                onClick={() => {
                                  if (edit._preview) URL.revokeObjectURL(edit._preview);
                                  const next = { ...edit!, _file: null, _preview: null, imageUrl: null }; // null => clear on save
                                  setEdit(next);
                                  setEditErrors(validateEdit(next));
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ) : c.imageUrl ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <img src={c.imageUrl} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                              <button
                                className="btn"
                                onClick={() => {
                                  const next = { ...edit!, imageUrl: null, _file: null, _preview: null };
                                  setEdit(next);
                                  setEditErrors(validateEdit(next));
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <span className="helper">No image selected.</span>
                          )}
                          <input type="file" accept="image/*" onChange={(e) => editOnFileChange(e.target.files?.[0] ?? null)} />
                          {editErrors.imageUrl && <div className="error-text">{editErrors.imageUrl}</div>}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-primary" onClick={save} disabled={editBusy || !!Object.keys(editErrors).length || !edit.name.trim()}>
                            {editBusy ? "Saving..." : "Save"}
                          </button>
                          <button
                            className="btn"
                            onClick={() => {
                              if (edit._preview) URL.revokeObjectURL(edit._preview);
                              setEdit(null);
                              setEditErrors({});
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn" onClick={() => startEdit(c)}>Edit</button>
                        <button className="btn" onClick={() => del(c.id)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
