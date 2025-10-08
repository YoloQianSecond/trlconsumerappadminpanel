import { Partner, Category } from "@/lib/types";

let _categories: Category[] = [
  { id: "cat_exch", name: "Exchange" },
  { id: "cat_brand", name: "Brand" },
  { id: "cat_media", name: "Media" },
];

let _partners: Partner[] = [
  {
    id: "p_okx",
    name: "OKX",
    categoryId: "cat_exch",
    link: "https://www.okx.com",
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const db = {
  // ---- Categories ----
  listCategories(): Category[] {
    return [..._categories].sort((a, b) => a.name.localeCompare(b.name));
  },
  createCategory(name: string): Category {
    const exists = _categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) throw new Error("Category already exists");
    const cat = { id: newId("cat"), name };
    _categories = [cat, ..._categories];
    return cat;
  },
  updateCategory(id: string, name: string): Category | null {
    const idx = _categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    _categories[idx] = { ..._categories[idx], name };
    return _categories[idx];
  },
  deleteCategory(id: string): boolean {
    // also detach partners that referenced this category (optional behavior)
    _partners = _partners.map((p) => (p.categoryId === id ? { ...p, categoryId: "" } : p));
    const before = _categories.length;
    _categories = _categories.filter((c) => c.id !== id);
    return _categories.length < before;
  },

  // ---- Partners ----
  listPartners(): Partner[] {
    return [..._partners].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  createPartner(data: Omit<Partner, "id" | "createdAt" | "updatedAt">): Partner {
    const p: Partner = {
      id: newId("prtn"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    _partners = [p, ..._partners];
    return p;
  },
  updatePartner(id: string, patch: Partial<Omit<Partner, "id" | "createdAt">>): Partner | null {
    const idx = _partners.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const updated: Partner = { ..._partners[idx], ...patch, updatedAt: new Date().toISOString() };
    _partners[idx] = updated;
    return updated;
  },
  deletePartner(id: string): boolean {
    const before = _partners.length;
    _partners = _partners.filter((p) => p.id !== id);
    return _partners.length < before;
  },
};
