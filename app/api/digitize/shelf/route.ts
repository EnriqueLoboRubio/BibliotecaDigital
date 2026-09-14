import { NextResponse } from "next/server";
import { digitizeShelfSpines } from "@/lib/services/digitize";
import type { DigitizeShelfRequest } from "@/lib/types/digitize";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<DigitizeShelfRequest>;

    if (!body.imageBase64) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere la imagen de la estantería o cubo en base64.",
          candidates: [],
          totalDetected: 0,
          source: "fallback-simulation",
        },
        { status: 400 },
      );
    }

    if (!body.shelfId) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere el identificador de la estantería (shelfId).",
          candidates: [],
          totalDetected: 0,
          source: "fallback-simulation",
        },
        { status: 400 },
      );
    }

    const payload: DigitizeShelfRequest = {
      imageBase64: body.imageBase64,
      mode: body.mode || "full-shelf",
      shelfId: body.shelfId,
      gridDimensions: body.gridDimensions || { rows: 4, columns: 4 },
      enabledCells: body.enabledCells || [],
      existingBooks: body.existingBooks || [],
      targetCell: body.targetCell,
    };

    const result = await digitizeShelfSpines(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[API Digitize Shelf] Error procesando solicitud:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error interno procesando la imagen.",
        candidates: [],
        totalDetected: 0,
        source: "fallback-simulation",
      },
      { status: 500 },
    );
  }
}
