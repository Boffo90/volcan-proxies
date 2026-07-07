import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function slugify(name: string): string {
  return name
	.toLowerCase()
	.normalize("NFD")
	.replace(/[̀-ͯ]/g, "")
	.replace(/[^a-z0-9]+/g, "-")
	.replace(/^-+|-+$/g, "");
}

export async function GET() {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("customs")
	.select("*")
	.order("sort_order", { ascending: true });

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customs: data });
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, tags, image_url, finish_options, surcharge } =
	body as {
  	name: string;
  	description?: string;
  	tags?: string[];
  	image_url: string;
  	finish_options?: string[];
  	surcharge?: number | null;
	};

  if (!name || !image_url) {
	return NextResponse.json(
  	{ error: "Nombre e imagen son requeridos" },
  	{ status: 400 }
	);
  }

  const sb = supabaseAdmin();

  const { data, error } = await sb
	.from("customs")
	.insert({
  	slug: slugify(name) + "-" + Date.now().toString(36),
  	name,
  	description: description || null,
  	tags: tags || [],
  	image_url,
  	finish_options: finish_options?.length
    	? finish_options
    	: ["glossy", "matte"],
  	surcharge: surcharge ?? null,
	})
	.select()
	.single();

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ custom: data });
}
