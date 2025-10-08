export type Category = {
  id: string;
  name: string;
};

export type Partner = {
  id: string;
  name: string;
  categoryId: string; // FK to Category.id
  link: string;
  featured: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};
