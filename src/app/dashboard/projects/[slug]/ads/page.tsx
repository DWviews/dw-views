import { redirect } from "next/navigation";
import { projectPagePath, normalizeProjectSlug } from "@/lib/project-slug";

export default async function LegacyAdsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = normalizeProjectSlug(rawSlug);
  redirect(projectPagePath(slug));
}
