import { NextResponse } from "next/server";
import { getPlazosServer } from "@/lib/plazos-server";

// Corto a propósito: cuando Seba pausa los pedidos o sube el plazo, tiene que
// verse casi de inmediato. No es un dato que valga la pena cachear una hora.
export const revalidate = 30;

export async function GET() {
  return NextResponse.json(await getPlazosServer());
}
