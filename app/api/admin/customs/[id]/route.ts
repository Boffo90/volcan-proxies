import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
	name,
	description,
	tags,
	image_url,
	finish_options,
	surcharge,
	active,
	sort_order,
  } = body as {
	name?: string;
	description?: string | null;
	tags?: string[];
	image_url?: string;
	finish_options?: string[];
	surcharge?: number | null;
	active?: boolean;
	sort_order?: number;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (tags !== undefined) updates.tags = tags;
  if (image_url !== undefined) updates.image_url = image_url;
  if (finish_options !== undefined) updates.finish_options = finish_options;
  if (surcharge !== undefined) updates.surcharge = surcharge;
  if (active !== undefined) updates.active = active;
  if (sort_order !== undefined) updates.sort_order = sort_order;

  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("customs")
	.update(updates)
	.eq("id", id)
	.select()
	.single();

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ custom: data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = supabaseAdmin();
  const { error } = await sb.from("customs").delete().eq("id", id);

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
