// Sube una imagen a /api/custom/upload, comprimiéndola en el navegador cuando
// hace falta. Vercel rechaza los cuerpos de request de más de ~4.5 MB con un
// 413 en texto plano (no JSON), así que reducimos el archivo antes de enviarlo
// y traducimos cualquier respuesta no-JSON a un mensaje claro.
//
// Solo debe llamarse desde el navegador (usa FileReader, Image y canvas).

export type UploadResult = {
  url: string;
  filename: string;
  originalName: string;
};

// Umbral por debajo del límite de plataforma de Vercel (~4.5 MB). Por encima de
// esto comprimimos; por debajo subimos el archivo tal cual (respeta PNG, etc.).
const COMPRESS_OVER_BYTES = 3.8 * 1024 * 1024;
// Borde largo máximo. Una carta (63×88 mm) a 600 DPI son ~1488×2080 px, así que
// 1800 px de borde largo sobra para impresión y deja los archivos muy livianos.
const MAX_EDGE = 1800;
const JPEG_QUALITY = 0.9;

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
	const reader = new FileReader();
	reader.onload = () => resolve(reader.result as string);
	reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
	reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
	const img = new Image();
	img.onload = () => resolve(img);
	img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
	img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
	canvas.toBlob(
  	(blob) =>
    	blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen")),
  	type,
  	quality
	);
  });
}

async function prepareImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_OVER_BYTES) return file;

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file; // sin canvas 2D, dejamos que el servidor valide
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);

  // Si por algún motivo sigue muy pesada, devolvemos el original y el manejo
  // de error de abajo dará un mensaje claro en vez de reventar.
  if (blob.size > COMPRESS_OVER_BYTES) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const prepared = await prepareImage(file);

  const fd = new FormData();
  fd.append("file", prepared);

  const res = await fetch("/api/custom/upload", { method: "POST", body: fd });

  if (!res.ok) {
	// La respuesta puede no ser JSON (p.ej. 413 de texto plano de Vercel).
	const text = await res.text();
	let msg: string;
	try {
  	msg = JSON.parse(text).error || `Error ${res.status}`;
	} catch {
  	msg =
    	res.status === 413
      	? "La imagen es demasiado pesada para subirla. Intenta con una versión más liviana."
      	: `Error ${res.status} al subir la imagen`;
	}
	throw new Error(msg);
  }

  return (await res.json()) as UploadResult;
}
