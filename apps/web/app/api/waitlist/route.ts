import { NextResponse } from "next/server";
import { z } from "zod";

const apiSchema = z.object({
  email: z.string().email(),
  propertyType: z
    .enum(["Appartement", "Maison", "Immeuble", "Local commercial"])
    .optional(),
  unitCount: z.enum(["1", "2-5", "6-10", "10+"]).optional(),
  desiredFeatures: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    apiSchema.parse(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Données invalides" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
