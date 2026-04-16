#!/usr/bin/env node
/**
 * Seed demo data for ImmoSimple.
 * Usage: pnpm seed   (reads frontend/.env.local automatically)
 *
 * Creates:
 *   - 1 demo user  →  demo@immosimple.fr / Demo1234!
 *   - 1 workspace  →  Martin Immobilier
 *   - 3 properties, 3 tenants, 3 leases
 *   - 4 conversations with realistic message threads
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n❌  Missing env vars. Make sure frontend/.env.local has:');
  console.error('    NEXT_PUBLIC_SUPABASE_URL');
  console.error('    SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL    = 'demo@immosimple.fr';
const DEMO_PASSWORD = 'Demo1234!';

// ─── helpers ────────────────────────────────────────────────────────────────

async function upsertUser() {
  const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const existing = users.find(u => u.email === DEMO_EMAIL);
  if (existing) {
    console.log(`  ↩  User already exists (${existing.id})`);
    return existing;
  }
  const { data: { user }, error } = await sb.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`  ✓  User created (${user.id})`);
  return user;
}

async function insertOne(table, row) {
  const { data, error } = await sb.from(table).insert(row).select().single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function insertMany(table, rows) {
  const { data, error } = await sb.from(table).insert(rows).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱  ImmoSimple seed\n');

  // 1. User
  process.stdout.write('1/6  User … ');
  const user = await upsertUser();
  const uid = user.id;

  // 2. Workspace (skip if user already has one)
  process.stdout.write('\n2/6  Workspace … ');
  const { data: existingWs } = await sb
    .from('workspace_members').select('workspace_id').eq('user_id', uid).limit(1);

  let workspace;
  if (existingWs?.length) {
    const { data: ws } = await sb
      .from('workspaces').select('*').eq('id', existingWs[0].workspace_id).single();
    workspace = ws;
    console.log(`↩  already exists (${workspace.name})`);
  } else {
    const slug = 'martin-immo-' + Math.random().toString(36).slice(2, 6);
    workspace = await insertOne('workspaces', {
      name: 'Martin Immobilier', slug, created_by: uid,
    });
    await insertOne('workspace_members', {
      workspace_id: workspace.id, user_id: uid, role: 'admin',
    });
    console.log(`✓  created (${workspace.id})`);
  }
  const wid = workspace.id;

  // 3. Lots
  process.stdout.write('3/6  Lots … ');
  const { data: existingLots } = await sb.from('lots').select('id').eq('workspace_id', wid);
  let lots;
  if (existingLots?.length >= 3) {
    lots = existingLots;
    console.log(`↩  already seeded (${lots.length})`);
  } else {
    lots = await insertMany('lots', [
      { workspace_id: wid, address: '14 rue du Faubourg Saint-Antoine', city: 'Paris',
        postal_code: '75011', type: 'apartment', area_m2: 38, rent_amount: 1050, charges_amount: 120 },
      { workspace_id: wid, address: '7 rue Championnet', city: 'Paris',
        postal_code: '75018', type: 'studio', area_m2: 19, rent_amount: 780, charges_amount: 40 },
      { workspace_id: wid, address: '22 cours Gambetta', city: 'Lyon',
        postal_code: '69007', type: 'apartment', area_m2: 58, rent_amount: 820, charges_amount: 85 },
    ]);
    console.log(`✓  ${lots.length} lots`);
  }
  const [lotParis11, lotParis18, lotLyon] = lots;

  // 4. Tenants
  process.stdout.write('4/6  Tenants … ');
  const { data: existingTenants } = await sb.from('tenants').select('id').eq('workspace_id', wid);
  let tenants;
  if (existingTenants?.length >= 3) {
    tenants = existingTenants;
    console.log(`↩  already seeded (${tenants.length})`);
  } else {
    tenants = await insertMany('tenants', [
      { workspace_id: wid, first_name: 'Sophie',   last_name: 'Moreau',  email: 'sophie.moreau@gmail.com',  phone: '06 23 45 67 89' },
      { workspace_id: wid, first_name: 'Karim',    last_name: 'Benzara', email: 'k.benzara@outlook.fr',      phone: '07 89 01 23 45' },
      { workspace_id: wid, first_name: 'Nathalie', last_name: 'Girard',  email: 'n.girard@yahoo.fr' },
    ]);
    console.log(`✓  ${tenants.length} tenants`);
  }
  const [tSophie, tKarim, tNathalie] = tenants;

  // 5. Leases
  process.stdout.write('5/6  Leases … ');
  const { data: existingLeases } = await sb.from('leases').select('id').eq('workspace_id', wid);
  let leases;
  if (existingLeases?.length >= 3) {
    leases = existingLeases;
    console.log(`↩  already seeded (${leases.length})`);
  } else {
    leases = await insertMany('leases', [
      { workspace_id: wid, lot_id: lotParis11.id, tenant_id: tSophie.id,
        start_date: '2023-10-01', rent_amount: 1050, charges_amount: 120, deposit_amount: 2100 },
      { workspace_id: wid, lot_id: lotParis18.id, tenant_id: tKarim.id,
        start_date: '2024-04-01', rent_amount: 780,  charges_amount: 40,  deposit_amount: 1560 },
      { workspace_id: wid, lot_id: lotLyon.id,    tenant_id: tNathalie.id,
        start_date: '2022-06-01', rent_amount: 820,  charges_amount: 85,  deposit_amount: 1640 },
    ]);
    console.log(`✓  ${leases.length} leases`);
  }

  // 6. Conversations + messages
  process.stdout.write('6/6  Conversations … ');
  const { data: existingConvs } = await sb.from('conversations').select('id').eq('workspace_id', wid);
  if (existingConvs?.length >= 4) {
    console.log(`↩  already seeded (${existingConvs.length})`);
  } else {
    const convDefs = [
      {
        conv: { workspace_id: wid, tenant_id: tSophie.id, subject: 'Dégât des eaux — salle de bain', category: 'maintenance' },
        messages: [
          { role: 'tenant',  content: "Bonjour, depuis hier soir il y a de l'eau qui s'infiltre dans ma salle de bain depuis le plafond. Le plâtre commence à gonfler. C'est urgent !" },
          { role: 'manager', content: "Bonjour Mme Moreau, je prends la situation très au sérieux. J'ai contacté notre plombier qui peut intervenir demain matin entre 9h et 12h. En attendant, pouvez-vous couper l'arrivée d'eau sous l'évier ? Je préviens également le syndic pour le logement du dessus." },
          { role: 'tenant',  content: "Merci beaucoup pour la réactivité ! J'ai coupé l'eau. Je serai présente demain matin." },
        ],
      },
      {
        conv: { workspace_id: wid, tenant_id: tKarim.id, subject: 'Régularisation des charges 2024', category: 'paiement' },
        messages: [
          { role: 'tenant', content: "Bonjour, j'ai reçu votre courrier de régularisation des charges pour 2024. Le montant de 340 € me semble élevé par rapport aux années précédentes. Pouvez-vous me transmettre le détail des charges ?" },
        ],
      },
      {
        conv: { workspace_id: wid, tenant_id: tNathalie.id, subject: 'Renouvellement du bail — mai 2025', category: 'document' },
        messages: [
          { role: 'tenant',  content: "Bonjour, mon bail arrive à échéance le 31 mai. Je souhaite rester dans l'appartement. Quelle est la procédure pour le renouvellement ?" },
          { role: 'manager', content: "Bonjour Mme Girard, je suis ravi que vous souhaitiez rester ! Votre bail se renouvelle automatiquement par tacite reconduction pour 3 ans. Je vous enverrai prochainement un avenant avec l'indexation IRL applicable. Aucune démarche de votre côté n'est nécessaire." },
          { role: 'tenant',  content: "Parfait, merci pour la clarté ! J'attendrai votre avenant." },
        ],
      },
      {
        conv: { workspace_id: wid, tenant_id: tSophie.id, subject: 'Robinet cuisine — petite fuite', category: 'maintenance' },
        messages: [
          { role: 'tenant', content: "Bonjour, le robinet de la cuisine perd un peu d'eau depuis ce matin. Ce n'est pas urgent, ça goutte doucement, mais je préférais vous prévenir." },
        ],
      },
    ];

    for (const { conv, messages } of convDefs) {
      const c = await insertOne('conversations', conv);
      await insertMany('messages', messages.map(m => ({
        ...m,
        conversation_id: c.id,
        workspace_id: wid,
      })));
    }
    console.log(`✓  4 conversations + messages`);
  }

  console.log('\n✅  Seed complete!\n');
  console.log('  🌐  http://localhost:3001');
  console.log(`  📧  ${DEMO_EMAIL}`);
  console.log(`  🔑  ${DEMO_PASSWORD}\n`);
}

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
