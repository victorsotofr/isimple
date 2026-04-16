'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2 } from 'lucide-react';

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
        router.push('/inbox');
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
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-6" />
            </div>
          </div>
          <CardTitle>Bienvenue sur ImmoSimple</CardTitle>
          <CardDescription>
            Créez votre espace de travail pour commencer à gérer vos biens.
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
            Créer mon espace de travail
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
