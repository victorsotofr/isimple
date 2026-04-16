"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { waitlistSchema, type WaitlistFormData } from "@/lib/validations";
import { Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
  });

  const gdprConsent = watch("gdprConsent");

  async function onSubmit(data: WaitlistFormData) {
    setServerError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          propertyType: data.propertyType,
          unitCount: data.unitCount,
          desiredFeatures: data.desiredFeatures,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Une erreur est survenue");
      }

      setSubmitted(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
    }
  }

  if (submitted) {
    return (
      <section id="waitlist" className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          <div className="mx-auto max-w-md text-center">
            <CheckCircle2 className="mx-auto size-10 text-blue" />
            <h2 className="mt-4 text-3xl font-black text-ink">
              C&apos;est noté !
            </h2>
            <p className="mt-2 text-base text-slate-500">
              Vous recevrez un email de confirmation.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-lg">
          <h2 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">
            Rejoindre la liste d&apos;attente
          </h2>
          <p className="mt-2 text-base text-slate-500">
            Inscrivez-vous pour être informé(e) en priorité du lancement
            et bénéficier du tarif fondateur.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-10 space-y-6"
            noValidate
          >
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-ink">
                Email <span className="text-blue">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="vous@exemple.fr"
                className="mt-2 w-full border-b border-slate-300 bg-transparent pb-2 text-base text-ink outline-none placeholder:text-slate-400 focus:border-ink"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-ink">Type de bien</label>
                <Select
                  onValueChange={(val) =>
                    setValue("propertyType", val as WaitlistFormData["propertyType"])
                  }
                >
                  <SelectTrigger
                    className="mt-2 h-auto w-full rounded-none border-0 border-b border-slate-300 bg-transparent px-0 pb-2 shadow-none focus:border-ink focus:ring-0"
                    aria-label="Type de bien"
                  >
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Appartement">Appartement</SelectItem>
                    <SelectItem value="Maison">Maison</SelectItem>
                    <SelectItem value="Immeuble">Immeuble</SelectItem>
                    <SelectItem value="Local commercial">Local commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink">Nombre de lots</label>
                <Select
                  onValueChange={(val) =>
                    setValue("unitCount", val as WaitlistFormData["unitCount"])
                  }
                >
                  <SelectTrigger
                    className="mt-2 h-auto w-full rounded-none border-0 border-b border-slate-300 bg-transparent px-0 pb-2 shadow-none focus:border-ink focus:ring-0"
                    aria-label="Nombre de lots"
                  >
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2-5">2-5</SelectItem>
                    <SelectItem value="6-10">6-10</SelectItem>
                    <SelectItem value="10+">10+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label htmlFor="desiredFeatures" className="block text-sm font-semibold text-ink">
                Fonctionnalités souhaitées (optionnel)
              </label>
              <textarea
                id="desiredFeatures"
                placeholder="Ex : gestion des charges, déclaration fiscale, relances automatiques..."
                className="mt-2 w-full border-b border-slate-300 bg-transparent pb-2 text-sm leading-relaxed text-ink outline-none placeholder:text-slate-400 focus:border-ink"
                rows={2}
                {...register("desiredFeatures")}
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="gdpr"
                checked={gdprConsent === true}
                onCheckedChange={(checked) =>
                  setValue("gdprConsent", checked === true ? true : (false as unknown as true), {
                    shouldValidate: true,
                  })
                }
                className="mt-0.5"
                aria-invalid={!!errors.gdprConsent}
              />
              <label htmlFor="gdpr" className="text-xs leading-relaxed text-slate-500">
                J&apos;accepte que mes données soient utilisées pour me contacter.{" "}
                <Link href="/politique-confidentialite" className="underline hover:text-ink">
                  Politique de confidentialité
                </Link>
              </label>
            </div>
            {errors.gdprConsent && (
              <p className="text-xs text-red-600">{errors.gdprConsent.message}</p>
            )}

            {serverError && (
              <p className="bg-red-50 p-3 text-sm text-red-600">{serverError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center bg-ink text-base font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Inscription...
                </>
              ) : (
                "M'inscrire sur la liste d'attente"
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
