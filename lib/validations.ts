import { z } from "zod";

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Veuillez entrer un email valide"),
  propertyType: z
    .enum(["Appartement", "Maison", "Immeuble", "Local commercial"])
    .optional(),
  unitCount: z.enum(["1", "2-5", "6-10", "10+"]).optional(),
  desiredFeatures: z.string().max(1000).optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({
      message: "Vous devez accepter la politique de confidentialité",
    }),
  }),
});

export type WaitlistFormData = z.infer<typeof waitlistSchema>;
