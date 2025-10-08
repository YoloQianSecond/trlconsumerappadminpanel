// Thin mock "table" for now. Replace with Prisma/SQL later.
export type MockUser = {
  id: string;
  email: string;
  name: string;
  // NOTE: plain text for dev only. Swap to hashed before prod.
  password: string;
  role: "admin" | "editor" | "viewer";
};

export const MOCK_USERS: MockUser[] = [
  {
    id: "u_admin_1",
    email: "qian@trlco.world",
    name: "Admin",
    password: "admin123",
    role: "admin",
  },
  {
    id: "u_ops_1",
    email: "ops@trlco.local",
    name: "Ops",
    password: "ops123",
    role: "editor",
  },
];
