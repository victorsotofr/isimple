'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Building2 } from 'lucide-react';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  // Supabase retourne les jointures comme tableau même pour les FK many-to-one
  const [invitation, setInvitation] = useState<{
    id: string;
    email: string;
    expires_at: string;
    workspaces: { name: string } | { name: string }[] | null;
  } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email ?? null);
      }

      const { data, error: fetchError } = await supabase
        .from('workspace_invitations')
        .select('id, email, expires_at, status, workspaces(name)')
        .eq('token', token)
        .single();

      if (fetchError || !data) {
        setError('Invitation introuvable');
      } else if (data.status !== 'pending') {
        setError(data.status === 'expired' ? 'Cette invitation a expiré' : 'Cette invitation a déjà été utilisée');
      } else if (new Date(data.expires_at) < new Date()) {
        setError('Cette invitation a expiré');
      } else {
        setInvitation(data as typeof invitation);
      }

      setLoading(false);
    };

    init();
  }, [token, supabase]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/inbox');
      } else {
        setError(data.error ?? "Erreur lors de l'acceptation");
      }
    } catch {
      setError("Erreur réseau lors de l'acceptation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Helper : Supabase retourne les jointures comme tableau pour les FK many-to-one
  const workspaceName = invitation?.workspaces
    ? Array.isArray(invitation.workspaces)
      ? invitation.workspaces[0]?.name
      : invitation.workspaces.name
    : null;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-6" />
            </div>
          </div>
          <CardTitle>
            {error ? 'Invitation invalide' : `Rejoindre ${workspaceName ?? "l'espace de travail"}`}
          </CardTitle>
          {!error && invitation && (
            <CardDescription>
              Vous avez été invité à rejoindre <strong>{workspaceName}</strong>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => router.push('/login')}>
                Retour à la connexion
              </Button>
            </div>
          ) : userEmail ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Connecté en tant que <strong>{userEmail}</strong>
              </p>
              {userEmail.toLowerCase() !== invitation?.email?.toLowerCase() && (
                <p className="text-sm text-center text-destructive">
                  Cette invitation est destinée à <strong>{invitation?.email}</strong>.
                  Connectez-vous avec ce compte.
                </p>
              )}
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting || userEmail.toLowerCase() !== invitation?.email?.toLowerCase()}
              >
                {accepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Accepter l&apos;invitation
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Connectez-vous pour accepter cette invitation.
              </p>
              <Button className="w-full" onClick={() => router.push(`/login?redirect=/invite/${token}`)}>
                Se connecter
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push(`/signup`)}>
                Créer un compte
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
