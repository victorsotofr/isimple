'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase-browser';

const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
});
type ProfileForm = z.infer<typeof schema>;

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '' },
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? '');
      form.setValue('first_name', user.user_metadata?.first_name ?? '');
      form.setValue('last_name', user.user_metadata?.last_name ?? '');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: ProfileForm) => {
    setSaving(true);
    await supabase.auth.updateUser({ data: values });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="max-w-lg space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Votre profil</h1>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
          <LogOut className="size-4" />
          Se déconnecter
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">Email</Label>
          <p className="text-sm">{email || '—'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Prénom</Label>
            <Input placeholder="Jean" {...form.register('first_name')} />
          </div>
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input placeholder="Dupont" {...form.register('last_name')} />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saved ? 'Enregistré ✓' : saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>
      </form>
    </div>
  );
}
