import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "./supabase";

export async function seedDatabase(): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { count, error: countError } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (countError) throw countError;

  if (count === 0) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    const { error } = await supabase.from("users").insert({
      username: "ADMIN ACC",
      email: "admin@dwviews.com",
      password_hash: passwordHash,
      role: "admin",
      display_name: "ADMIN ACC",
    });
    if (error) throw error;
    console.log("✅ Seeded default admin user (ADMIN ACC / admin123)");
  }
}
