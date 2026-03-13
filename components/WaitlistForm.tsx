"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <section id="waitlist" className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-3 overflow-hidden rounded-2xl sm:mx-0 sm:rounded-3xl">
            <div className="flex items-center justify-center bg-blue px-8 py-16">
              <div className="text-center">
                <CheckCircle2 className="mx-auto size-12 text-white" />
                <h2 className="mt-4 text-2xl font-bold text-white">
                  C&apos;est noté !
                </h2>
                <p className="mt-2 text-base text-white/70">
                  Vous recevrez un email de confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="px-3 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl sm:rounded-3xl">
          <div className="grid sm:grid-cols-[1fr_1fr]">
            <div className="flex flex-col justify-center bg-blue px-8 py-10 sm:px-10 sm:py-14">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Rejoindre la
                <br />
                liste d&apos;attente
              </h2>
              <p className="mt-3 text-base leading-relaxed text-white/70">
                Inscrivez-vous pour être informé(e) en priorité du lancement et bénéficier du tarif fondateur.
              </p>
            </div>

            {/* Right: Form block */}
            <div className="bg-white px-8 py-10 sm:px-10 sm:py-14">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-5 space-y-3"
                noValidate
              >
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-ink">
                    Email <span className="text-blue">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.fr"
                    className="mt-1 h-10 rounded-lg border-warm-border bg-surface text-base"
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-ink">Type de bien</label>
                    <Select
                      onValueChange={(val) =>
                        setValue("propertyType", val as WaitlistFormData["propertyType"])
                      }
                    >
                      <SelectTrigger
                        className="mt-1 h-10 w-full rounded-lg border-warm-border bg-surface"
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
                        className="mt-1 h-10 w-full rounded-lg border-warm-border bg-surface"
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

                {/* Desired features textarea */}
                <div>
                  <label htmlFor="desiredFeatures" className="block text-sm font-semibold text-ink">
                    Fonctionnalités souhaitées
                  </label>
                  <textarea
                    id="desiredFeatures"
                    placeholder="Ex : gestion des charges, déclaration fiscale, relances automatiques..."
                    className="mt-1 w-full rounded-lg border border-warm-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-muted-text focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                    rows={3}
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
                  <label htmlFor="gdpr" className="text-xs leading-relaxed text-muted-text">
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
                  <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{serverError}</p>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 w-full rounded-lg bg-blue text-sm font-medium text-white hover:bg-blue-dark"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Inscription...
                    </>
                  ) : (
                    "M'inscrire sur la liste d'attente"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
