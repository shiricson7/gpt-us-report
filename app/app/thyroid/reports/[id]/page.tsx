import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ThyroidReportEditor from "@/components/ThyroidReportEditor";

export const dynamic = "force-dynamic";

export default async function ThyroidReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return <ThyroidReportEditor reportId={id} />;
}
