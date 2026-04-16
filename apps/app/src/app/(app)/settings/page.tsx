import { Settings, User, Bell, Shield, Building2, Users } from 'lucide-react';

const sections = [
  {
    title: 'PERSONNEL',
    items: [
      { icon: User, label: 'Profil', description: 'Nom, email, photo' },
      { icon: Bell, label: 'Notifications', description: 'Alertes et rappels' },
      { icon: Shield, label: 'Sécurité', description: 'Mot de passe, authentification' },
    ],
  },
  {
    title: 'ÉQUIPE',
    items: [
      { icon: Building2, label: 'Workspace', description: 'Nom, plan, facturation' },
      { icon: Users, label: 'Membres', description: 'Inviter et gérer les membres' },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings className="size-5" />
        <h1 className="text-2xl font-semibold">Paramètres</h1>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {section.title}
          </p>
          <div className="rounded-lg border divide-y">
            {section.items.map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
