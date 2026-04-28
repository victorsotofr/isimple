'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, Building2, FileText, Home, Loader2 } from 'lucide-react';

const onboardingSteps = [
  {
    icon: Building2,
    title: 'Créer votre espace',
    body: 'Un espace unique pour votre agence, vos biens et votre équipe.',
  },
  {
    icon: Home,
    title: 'Ajouter un premier bien',
    body: 'Posez la base de votre source de vérité immobilière.',
  },
  {
    icon: FileText,
    title: 'Importer un document',
    body: 'L’IA extrait les informations utiles et prépare les rattachements.',
  },
];

export default function CreateWorkspacePage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setLoading(false);
    };
    checkAuth();
  }, [router, supabase]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/lots?onboarding=1');
      } else {
        setError(data.error ?? 'Erreur lors de la création');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
              <span className="size-1.5 rounded-full bg-brand" />
              Mise en route
            </div>
            <h1 className="max-w-2xl font-serif text-5xl leading-tight tracking-tight">
              Construisez votre source de vérité locative en quelques minutes.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              isimple démarre simplement : un espace, un bien, puis un document. Ensuite l’IA
              vous aide à garder les données propres et exploitables.
            </p>
          </div>

          <div className="grid gap-3">
            {onboardingSteps.map(({ icon: Icon, title, body }, index) => (
              <div key={title} className="flex gap-4 rounded-xl border bg-card p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Étape {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="w-full border-border/80 shadow-sm">
          <CardHeader>
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="size-6" />
            </div>
            <CardTitle>Créer votre espace</CardTitle>
            <CardDescription>
              Donnez un nom à votre agence ou portefeuille. Vous pourrez le modifier plus tard.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nom de l&apos;agence</Label>
            <Input
              id="workspace-name"
              placeholder="Martin Immobilier Paris 11e"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
          >
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Créer et ajouter mon premier bien
            {!creating && <ArrowRight className="ml-2 size-4" />}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
