import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { incrementWaitlistCount, addWaitlistEntry } from "@/lib/kv";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const data = apiSchema.parse(body);

    await addWaitlistEntry({
      email: data.email,
      propertyType: data.propertyType,
      unitCount: data.unitCount,
      desiredFeatures: data.desiredFeatures,
      createdAt: new Date().toISOString(),
    });

    await incrementWaitlistCount();

    await Promise.all([
      resend.emails.send({
        from: "ImmoSimple <onboarding@resend.dev>",
        to: data.email,
        subject: "Bienvenue sur la liste d'attente ImmoSimple",
        html: `
          <h2>Merci pour votre inscription !</h2>
          <p>Vous faites désormais partie de la liste d'attente d'ImmoSimple.</p>
          <p>Nous vous tiendrons informé(e) dès que la plateforme sera disponible.</p>
          <p>À bientôt,<br/>L'équipe ImmoSimple</p>
        `,
      }),
      resend.emails.send({
        from: "ImmoSimple <onboarding@resend.dev>",
        to: process.env.OWNER_EMAIL!,
        subject: "Nouvelle inscription liste d'attente",
        html: `
          <h2>Nouvelle inscription</h2>
          <p><strong>Email :</strong> ${data.email}</p>
          <p><strong>Type de bien :</strong> ${data.propertyType ?? "Non renseigné"}</p>
          <p><strong>Nombre de lots :</strong> ${data.unitCount ?? "Non renseigné"}</p>
          <p><strong>Fonctionnalités souhaitées :</strong> ${data.desiredFeatures ?? "Aucune"}</p>
          <p><strong>Date :</strong> ${new Date().toLocaleString("fr-FR")}</p>
        `,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Données invalides" },
        { status: 400 }
      );
    }
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { success: false, error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
