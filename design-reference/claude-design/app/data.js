// ─── Mock Data ────────────────────────────────────────────────────────────────
window.AppData = {

conversations: [
  {
    id: 'c1', contact: 'Sophie Mercier', type: 'prospect', channel: 'whatsapp',
    property: null, lot: null, status: 'arbitrage',
    lastMsg: 'Bonjour, est-ce que l\'appartement du 8ème est encore disponible ?',
    time: '08:14', unread: 2, aiHandled: true,
    messages: [
      { id: 'm1', from: 'contact', text: 'Bonjour ! Je cherche un appartement F2 dans le 8e ou 9e arrondissement, budget 1400€ max charges comprises. Vous avez quelque chose ?', time: '07:48', channel: 'whatsapp' },
      { id: 'm2', from: 'ai', text: 'Bonjour Sophie ! Oui, nous avons un T2 de 42m² rue de la Bienfaisance (8e) à 1 350€ cc. Il est disponible le 1er juin. Souhaitez-vous que je vous propose des créneaux de visite ?', time: '07:49', aiAction: null },
      { id: 'm3', from: 'contact', text: 'Oui super ! Vous auriez quelque chose ce weekend ou en semaine après 18h ?', time: '08:11', channel: 'whatsapp' },
      { id: 'm4', from: 'ai', text: 'Je vérifie les disponibilités…', time: '08:12', typing: true },
      { id: 'm5', from: 'contact', text: 'Bonjour, est-ce que l\'appartement du 8ème est encore disponible ?', time: '08:14', channel: 'whatsapp' },
    ]
  },
  {
    id: 'c2', contact: 'Marc Lefort', type: 'locataire', channel: 'email',
    property: '12 rue Lepic, Paris 18', lot: 'LOT-042', status: 'ticket_cree',
    lastMsg: 'Il y a encore de l\'eau qui coule sous l\'évier ce matin', time: '07:30', unread: 0, aiHandled: true,
    messages: [
      { id: 'm1', from: 'contact', text: 'Bonjour, j\'ai une fuite sous l\'évier de ma cuisine depuis hier soir. L\'eau coule lentement mais ça empire.', time: '23:42', channel: 'email' },
      { id: 'm2', from: 'ai', text: 'Bonsoir Marc, j\'ai bien pris note de votre signalement. J\'ai créé un ticket d\'intervention (T-0491) et je contacte notre plombier partenaire pour une intervention dès demain matin. Je vous confirme le créneau par email.', time: '23:43', aiAction: 'ticket_created', ticketId: 'T-0491' },
      { id: 'm3', from: 'ai', text: 'Bonne nouvelle : Plomberie Rapide est disponible demain entre 9h et 11h. En attendant, pouvez-vous placer un récipient sous la fuite et fermer le robinet d\'arrêt sous l\'évier ?', time: '23:44', aiAction: null },
      { id: 'm4', from: 'contact', text: 'Merci pour la réactivité ! Ok pour demain 9h-11h.', time: '23:51', channel: 'email' },
      { id: 'm5', from: 'contact', text: 'Il y a encore de l\'eau qui coule sous l\'évier ce matin', time: '07:30', channel: 'email' },
    ]
  },
  {
    id: 'c3', contact: 'Inconnu (+33 6 12 34 56 78)', type: 'inconnu', channel: 'phone',
    property: null, lot: null, status: 'arbitrage',
    lastMsg: '[Transcription] Bonjour j\'appelle pour l\'annonce du studio rue Mouffetard…', time: '06:52', unread: 1, aiHandled: false,
    messages: [
      { id: 'm1', from: 'ai', text: '[Transcription appel — 06:52] "Bonjour j\'appelle pour l\'annonce du studio rue Mouffetard que j\'ai vu sur Le Bon Coin. Est-ce qu\'il est toujours disponible et est-ce qu\'on peut visiter cette semaine ?"', time: '06:52', aiAction: 'call_transcribed' },
      { id: 'm2', from: 'ai', text: 'Appel reçu hors horaires. J\'ai envoyé un SMS automatique pour proposer un rappel. Aucun bien "rue Mouffetard" dans votre portefeuille — il s\'agit peut-être d\'une annonce concurrente ou d\'une erreur de numéro. Votre arbitrage est nécessaire.', time: '06:53', aiAction: 'escalade' },
    ]
  },
  {
    id: 'c4', contact: 'Isabelle Laurent', type: 'locataire', channel: 'whatsapp',
    property: '7 rue du Faubourg, Bordeaux', lot: 'LOT-017', status: 'resolu',
    lastMsg: 'Merci beaucoup, c\'est parfait !', time: 'Hier', unread: 0, aiHandled: true,
    messages: [
      { id: 'm1', from: 'contact', text: 'Bonjour, pouvez-vous m\'envoyer ma quittance d\'avril ?', time: 'Hier 14:10', channel: 'whatsapp' },
      { id: 'm2', from: 'ai', text: 'Bien sûr Isabelle ! Votre quittance d\'avril 2024 (850€) vient d\'être envoyée sur votre adresse email isabelle.laurent@gmail.com.', time: 'Hier 14:10', aiAction: 'document_sent' },
      { id: 'm3', from: 'contact', text: 'Merci beaucoup, c\'est parfait !', time: 'Hier 14:12', channel: 'whatsapp' },
    ]
  },
  {
    id: 'c5', contact: 'Antoine Rousseau', type: 'prospect', channel: 'chat',
    property: null, lot: null, status: 'ia_en_cours',
    lastMsg: 'Vous acceptez les garants étrangers ?', time: '09:02', unread: 0, aiHandled: true,
    messages: [
      { id: 'm1', from: 'contact', text: 'Bonjour, je suis intéressé par l\'appartement rue de Rivoli. Mes revenus sont 3x le loyer mais mon garant est en Belgique, c\'est ok ?', time: '08:55', channel: 'chat' },
      { id: 'm2', from: 'ai', text: 'Bonjour Antoine ! Oui, nous acceptons les garants européens. Le garant devra fournir les 3 derniers bulletins de salaire et un justificatif de domicile traduit si nécessaire. Souhaitez-vous commencer le dossier en ligne ?', time: '08:56', aiAction: null },
      { id: 'm3', from: 'contact', text: 'Vous acceptez les garants étrangers ?', time: '09:02', channel: 'chat' },
    ]
  },
],

tickets: [
  { id: 'T-0491', titre: 'Fuite sous évier cuisine', lot: 'LOT-042', adresse: '12 rue Lepic, Paris 18', locataire: 'Marc Lefort', categorie: 'plomberie', urgence: 'haute', statut: 'en_cours', prestataire: 'Plomberie Rapide SARL', sla: '2h restantes', cree: 'il y a 8h', aiCree: true,
    timeline: [
      { type: 'creation', text: 'Ticket créé automatiquement par l\'IA', time: '23:43', ai: true },
      { type: 'qualification', text: 'Catégorie : Plomberie · Urgence : Haute · Score confiance 94%', time: '23:43', ai: true },
      { type: 'assignation', text: 'Prestataire assigné : Plomberie Rapide SARL (score 4.7/5)', time: '23:44', ai: true },
      { type: 'message', text: 'Locataire confirmé pour créneau 9h-11h', time: '23:51', ai: false },
      { type: 'intervention', text: 'Plombier en route', time: '08:47', ai: false },
    ]
  },
  { id: 'T-0490', titre: 'Porte d\'entrée bloquée', lot: 'LOT-018', adresse: '3 av. Victor Hugo, Lyon', locataire: 'Jean Martin', categorie: 'serrurerie', urgence: 'critique', statut: 'ouvert', prestataire: null, sla: 'Dépassé', cree: 'il y a 2h', aiCree: true,
    timeline: [
      { type: 'creation', text: 'Ticket créé automatiquement', time: '07:12', ai: true },
      { type: 'escalade', text: 'Urgence critique — escalade vers gestionnaire humain', time: '07:13', ai: true },
    ]
  },
  { id: 'T-0489', titre: 'Chauffage en panne', lot: 'LOT-031', adresse: '24 allée des Roses, Nice', locataire: 'Claire Dumont', categorie: 'chauffage', urgence: 'haute', statut: 'planifie', prestataire: 'Techni-Clim Pro', sla: '18h restantes', cree: 'il y a 1j', aiCree: false,
    timeline: [
      { type: 'creation', text: 'Ticket créé manuellement', time: 'Hier 14:30', ai: false },
      { type: 'assignation', text: 'Assigné à Techni-Clim Pro', time: 'Hier 14:45', ai: false },
    ]
  },
  { id: 'T-0488', titre: 'Voisinage — nuisances sonores', lot: 'LOT-042', adresse: '12 rue Lepic, Paris 18', locataire: 'Marc Lefort', categorie: 'voisinage', urgence: 'basse', statut: 'ouvert', prestataire: null, sla: '5j restants', cree: 'il y a 2j', aiCree: true, timeline: [] },
  { id: 'T-0487', titre: 'Interphone défaillant', lot: 'LOT-007', adresse: '8 rue des Trois Frères, Paris 18', locataire: 'Thomas Bernard', categorie: 'electricite', urgence: 'moyenne', statut: 'resolu', prestataire: 'Élec Service Paris', sla: 'Résolu', cree: 'il y a 3j', aiCree: true, timeline: [] },
  { id: 'T-0486', titre: 'Fenêtre cassée', lot: 'LOT-023', adresse: '5 bd Voltaire, Paris 11', locataire: 'Nadia Kone', categorie: 'menuiserie', urgence: 'moyenne', statut: 'planifie', prestataire: 'Vitrerie Express', sla: '3j restants', cree: 'il y a 4j', aiCree: false, timeline: [] },
  { id: 'T-0485', titre: 'DPE à renouveler', lot: 'LOT-055', adresse: '17 rue Oberkampf, Paris 11', locataire: 'Paul Fontaine', categorie: 'administratif', urgence: 'basse', statut: 'ouvert', prestataire: null, sla: '30j restants', cree: 'il y a 5j', aiCree: true, timeline: [] },
],

properties: [
  { id: 'LOT-007', ref: 'LOT-007', adresse: '8 rue des Trois Frères', ville: 'Paris 18', type: 'T2', surface: 42, loyer: 1200, locataire: 'Thomas Bernard', statut: 'loue', taches: 0, dpe: 'C', alerts: [] },
  { id: 'LOT-017', ref: 'LOT-017', adresse: '7 rue du Faubourg', ville: 'Bordeaux', type: 'T3', surface: 68, loyer: 850, locataire: 'Isabelle Laurent', statut: 'loue', taches: 1, dpe: 'D', alerts: ['Quittance à envoyer'] },
  { id: 'LOT-018', ref: 'LOT-018', adresse: '3 av. Victor Hugo', ville: 'Lyon', type: 'T4', surface: 89, loyer: 1450, locataire: 'Jean Martin', statut: 'loue', taches: 2, dpe: 'B', alerts: ['Ticket urgent', 'Bail expire dans 2 mois'] },
  { id: 'LOT-023', ref: 'LOT-023', adresse: '5 bd Voltaire', ville: 'Paris 11', type: 'T2', surface: 38, loyer: 1100, locataire: 'Nadia Kone', statut: 'loue', taches: 1, dpe: 'E', alerts: ['DPE à renouveler'] },
  { id: 'LOT-031', ref: 'LOT-031', adresse: '24 allée des Roses', ville: 'Nice', type: 'T3', surface: 74, loyer: 980, locataire: 'Claire Dumont', statut: 'loue', taches: 1, dpe: 'D', alerts: ['Chauffage en panne'] },
  { id: 'LOT-042', ref: 'LOT-042', adresse: '12 rue Lepic', ville: 'Paris 18', type: 'T2', surface: 48, loyer: 1280, locataire: 'Marc Lefort', statut: 'loue', taches: 3, dpe: 'D', alerts: ['Fuite en cours', 'Nuisances sonores', 'Quittance en attente'] },
  { id: 'LOT-055', ref: 'LOT-055', adresse: '17 rue Oberkampf', ville: 'Paris 11', type: 'T1', surface: 27, loyer: 920, locataire: 'Paul Fontaine', statut: 'loue', taches: 1, dpe: 'F', alerts: ['DPE classe F — régularisation obligatoire avant 2025'] },
  { id: 'LOT-061', ref: 'LOT-061', adresse: '2 rue de la Paix', ville: 'Nantes', type: 'T3', surface: 72, loyer: 780, locataire: null, statut: 'vacant', taches: 0, dpe: 'C', alerts: [] },
  { id: 'LOT-074', ref: 'LOT-074', adresse: '9 rue Championnet', ville: 'Paris 18', type: 'T2', surface: 35, loyer: 950, locataire: 'Ahmed Diallo', statut: 'loue', taches: 0, dpe: 'D', alerts: [] },
  { id: 'LOT-082', ref: 'LOT-082', adresse: '44 rue des Gravilliers', ville: 'Paris 3', type: 'T1', surface: 28, loyer: 880, locataire: 'Lucie Simon', statut: 'loue', taches: 0, dpe: 'C', alerts: [] },
  { id: 'LOT-091', ref: 'LOT-091', adresse: '6 impasse Doré', ville: 'Marseille', type: 'T4', surface: 95, loyer: 1100, locataire: null, statut: 'vacant', taches: 0, dpe: 'B', alerts: [] },
  { id: 'LOT-103', ref: 'LOT-103', adresse: '33 av. de la République', ville: 'Paris 11', type: 'T3', surface: 65, loyer: 1350, locataire: 'Fatou Diop', statut: 'loue', taches: 0, dpe: 'D', alerts: [] },
],

tenants: [
  { id: 't1', nom: 'Marc Lefort', lot: 'LOT-042', adresse: '12 rue Lepic, Paris 18', loyer: 1280, debutBail: 'Mars 2022', finBail: 'Fév. 2025', paiement: 'retard', humeur: 'neutre', tickets: 4, email: 'marc.lefort@email.fr', tel: '06 12 34 56 78', resume: 'Locataire depuis mars 2022. 4 tickets signalés, principalement plomberie. Communication réactive et cordiale. Retard de paiement ponctuel ce mois (3 jours). Aucun antécédent majeur.' },
  { id: 't2', nom: 'Isabelle Laurent', lot: 'LOT-017', adresse: '7 rue du Faubourg, Bordeaux', loyer: 850, debutBail: 'Jan. 2021', finBail: 'Déc. 2023', paiement: 'ok', humeur: 'positif', tickets: 1, email: 'isabelle.laurent@gmail.com', tel: '06 98 76 54 32', resume: 'Locataire modèle depuis 3 ans. Paiements toujours à temps. 1 seul ticket (demande de quittance). Ton des échanges très positif. Bail expiré — à renouveler.' },
  { id: 't3', nom: 'Jean Martin', lot: 'LOT-018', adresse: '3 av. Victor Hugo, Lyon', loyer: 1450, debutBail: 'Juin 2023', finBail: 'Mai 2026', paiement: 'ok', humeur: 'negatif', tickets: 6, email: 'j.martin@hotmail.fr', tel: '07 11 22 33 44', resume: 'Locataire depuis juin 2023. 6 tickets en 10 mois — fréquence élevée. Ton parfois revendicateur dans les messages. Bail expire dans 2 mois. Paiements corrects malgré tout.', flag: true },
  { id: 't4', nom: 'Thomas Bernard', lot: 'LOT-007', adresse: '8 rue des Trois Frères, Paris 18', loyer: 1200, debutBail: 'Sept. 2020', finBail: 'Août 2026', paiement: 'ok', humeur: 'positif', tickets: 2, email: 'thomas.bernard@gmail.com', tel: '06 55 44 33 22', resume: 'Locataire fidèle depuis 2020. Paiements impeccables. 2 tickets mineurs (interphone, ampoule). Communication rapide et agréable.' },
],

providers: [
  { id: 'p1', nom: 'Plomberie Rapide SARL', categorie: 'Plomberie', zones: ['Paris 18', 'Paris 17', 'Paris 9'], score: 4.7, reponse: '1h30 moy.', interventions: 23, disponible: true, tel: '01 42 00 11 22' },
  { id: 'p2', nom: 'Élec Service Paris', categorie: 'Électricité', zones: ['Paris intra-muros'], score: 4.2, reponse: '3h moy.', interventions: 11, disponible: true, tel: '01 43 00 55 66' },
  { id: 'p3', nom: 'Techni-Clim Pro', categorie: 'Chauffage / Clim', zones: ['PACA', 'Occitanie'], score: 3.9, reponse: '4h moy.', interventions: 8, disponible: false, tel: '04 93 00 77 88' },
  { id: 'p4', nom: 'Vitrerie Express', categorie: 'Menuiserie', zones: ['Île-de-France'], score: 4.5, reponse: '2h moy.', interventions: 15, disponible: true, tel: '01 44 00 99 00' },
  { id: 'p5', nom: 'SOS Serrurerie', categorie: 'Serrurerie', zones: ['Paris', 'Lyon', 'Marseille'], score: 4.8, reponse: '45min moy.', interventions: 34, disponible: true, tel: '09 70 00 12 34' },
],

analytics: {
  kpis: [
    { label: 'Conversations traitées par l\'IA', val: '847', sub: 'ce mois', delta: '+12%' },
    { label: 'Temps gagné estimé', val: '31h', sub: 'ce mois', delta: '+8%' },
    { label: 'Tickets ouverts', val: '14', sub: 'dont 2 critiques', delta: '-3' },
    { label: 'Taux de résolution', val: '91%', sub: 'sous SLA', delta: '+4pts' },
  ],
  insights: [
    { titre: 'Concentration plomberie sur 3 immeubles', texte: 'Vos tickets plomberie ont augmenté de 40% ce mois. 8 des 11 tickets concernent les immeubles Lepic, Voltaire et Oberkampf. Un audit tuyauterie préventif serait rentable avant l\'hiver.', action: 'Voir les tickets plomberie', urgence: 'warning' },
    { titre: 'Locataire LOT-018 à surveiller', texte: 'Jean Martin (Lyon) a ouvert 6 tickets en 10 mois — fréquence 3× la moyenne de votre portefeuille. Le ton de ses 3 derniers messages est revendicateur. Le bail expire dans 2 mois.', action: 'Voir le dossier locataire', urgence: 'warning' },
    { titre: 'Performance IA en hausse', texte: 'Ce mois, 94% des demandes entrantes ont été qualifiées et traitées sans intervention humaine. Le temps de réponse moyen est passé de 4h à 12 minutes.', action: 'Voir les stats détaillées', urgence: 'positive' },
  ]
}

};
