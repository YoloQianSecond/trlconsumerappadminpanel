import { readSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await readSession();
  if (session) redirect("/dashboard"); // or your preferred start page
  redirect("/login");
}
