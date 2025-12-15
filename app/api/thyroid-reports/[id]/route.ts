import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function listAllPaths(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, prefix: string) {
  const all: string[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const { data, error } = await supabase.storage
      .from("ultrasound-images")
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    const items = data ?? [];
    for (const item of items) {
      if (item.name) all.push(`${prefix}/${item.name}`);
    }
    if (items.length < limit) break;
    offset += items.length;
  }

  return all;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const folder = `${user.id}/thyroid/${id}`;

  try {
    const paths = await listAllPaths(supabase, folder);
    if (paths.length) {
      const { error: removeError } = await supabase.storage.from("ultrasound-images").remove(paths);
      if (removeError) throw removeError;
    }

    const { error: deleteError } = await supabase.from("thyroid_reports").delete().eq("id", id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return new NextResponse(message, { status: 500 });
  }
}

