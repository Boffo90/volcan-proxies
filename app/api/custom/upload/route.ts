import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED = ["image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  try {
	const formData = await req.formData();
	const file = formData.get("file") as File | null;

	if (!file) {
  	return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
	}
	if (!ALLOWED.includes(file.type)) {
  	return NextResponse.json(
    	{ error: "Formato no permitido (solo JPG o PNG)" },
    	{ status: 400 }
  	);
	}
	if (file.size > MAX_SIZE) {
  	return NextResponse.json(
    	{ error: "Archivo supera 5MB" },
    	{ status: 400 }
  	);
	}

	const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
	const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

	const sb = supabaseAdmin();
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	const { error: uploadError } = await sb.storage
  	.from("custom-cards")
  	.upload(filename, buffer, {
    	contentType: file.type,
    	upsert: false,
  	});

	if (uploadError) {
  	console.error("Upload error:", uploadError);
  	return NextResponse.json(
    	{ error: "Error al subir: " + uploadError.message },
    	{ status: 500 }
  	);
	}

	const { data: urlData } = sb.storage
  	.from("custom-cards")
  	.getPublicUrl(filename);

	return NextResponse.json({
  	url: urlData.publicUrl,
  	filename,
  	originalName: file.name,
	});
  } catch (err) {
	console.error(err);
	return NextResponse.json({ error: "Error servidor" }, { status: 500 });
  }
}

