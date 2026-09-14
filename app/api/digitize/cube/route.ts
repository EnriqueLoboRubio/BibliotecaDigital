import { NextResponse } from "next/server";
import { digitizeCubeSpines } from "@/lib/services/digitize";
import type { DigitizeCubeRequest } from "@/lib/types/digitize";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<DigitizeCubeRequest>;

    if (!body.imageBase64) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere la imagen del compartimento en formato base64.",
          candidates: [],
          totalDetected: 0,
          source: "fallback-simulation",
        },
        { status: 400 },
      );
    }

    if (
      body.row === undefined ||
      body.column === undefined ||
      body.depth === undefined ||
      !body.shelfId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Faltan las coordenadas físicas del compartimento (shelfId, row, column, depth).",
          candidates: [],
          totalDetected: 0,
          source: "fallback-simulation",
        },
        { status: 400 },
      );
    }

    const requestPayload: DigitizeCubeRequest = {
      imageBase64: body.imageBase64,
      shelfId: body.shelfId,
      row: body.row,
      column: body.column,
      depth: body.depth,
      existingCount: body.existingCount || 0,
    };

    const result = await digitizeCubeSpines(requestPayload);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[API Digitize Cube] Error interno:", error);
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
