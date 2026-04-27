// ─── Other Pages ──────────────────────────────────────────────────────────────

// ─── Agenda ──────────────────────────────────────────────────────────────────
function AgendaPage() {
  const [viewDay, setViewDay] = React.useState(null);
  const days = ['Lun 22','Mar 23','Mer 24','Jeu 25','Ven 26','Sam 27','Dim 28'];
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  const events = [
    { day: 0, start: 9, end: 10.5, type: 'visite', title: 'Visite — Sophie Mercier', sub: '8 rue des Trois Frères', color: ACCENT },
    { day: 0, start: 14, end: 15, type: 'intervention', title: 'Plomberie Rapide', sub: '12 rue Lepic — Fuite évier', color: '#f97316' },
    { day: 1, start: 10, end: 11, type: 'visite', title: 'Visite — Antoine Rousseau', sub: 'Rue de Rivoli', color: ACCENT },
    { day: 1, start: 16, end: 17, type: 'bailleur', title: 'RDV propriétaire', sub: 'SCI Les Lilas', color: '#5a8dee' },
    { day: 2, start: 9, end: 10, type: 'visite', title: 'Visite — Prospect', sub: '44 rue des Gravilliers', color: ACCENT },
    { day: 2, start: 11, end: 12, type: 'intervention', title: 'Techni-Clim Pro', sub: '24 allée des Roses — Chauffage', color: '#f97316' },
    { day: 4, start: 9, end: 10, type: 'visite', title: 'Visite — Prospect', sub: '7 rue du Faubourg', color: ACCENT },
    { day: 4, start: 9.5, end: 10.5, type: 'visite', title: 'Visite — Prospect 2', sub: '5 bd Voltaire', color: ACCENT },
    { day: 5, start: 10, end: 11, type: 'visite', title: 'Visite groupée (3)', sub: 'Paris 11e · regroupement IA', color: ACCENT },
  ];

  const pending = [
    { contact: 'Lucas Bernard', type: 'prospect', note: 'Disponible sam. matin ou soir semaine' },
    { contact: 'Amina Traoré', type: 'prospect', note: 'Flexibletout sauf vendredi' },
    { contact: 'Marc Lefort', type: 'locataire', note: 'RDV état des lieux — mai' },
  ];

  const HOUR_H = 56;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Pending list */}
      <div style={{ width: 220, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)', marginBottom: 4 }}>À planifier</div>
          <div style={{ fontSize: 12, color: 'var(--fg2)' }}>Glissez vers le calendrier</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {pending.map((p, i) => (
            <div key={i} style={{ padding: '10px', border: '1px dashed var(--border)', borderRadius: 8, marginBottom: 8, cursor: 'grab', background: 'var(--bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{p.contact}</div>
              <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 4 }}>{p.note}</div>
              <span style={{ fontSize: 10, fontWeight: 500, color: p.type === 'prospect' ? ACCENT : '#5a8dee', background: p.type === 'prospect' ? ACCENT_DIMMER : '#eff6ff', padding: '1px 6px', borderRadius: 100 }}>{p.type === 'prospect' ? 'Prospect' : 'Locataire'}</span>
            </div>
          ))}
        </div>
        {/* AI suggestion */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)', background: ACCENT_DIMMER, margin: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: ACCENT, marginBottom: 6 }}><Icons.Sparkles size={11} /> Suggestion IA</div>
          <div style={{ fontSize: 12, color: 'var(--fg2)', lineHeight: 1.5, marginBottom: 8 }}>3 visites samedi matin dans le 11e → à regrouper pour économiser 2h de déplacement.</div>
          <button style={{ width: '100%', background: ACCENT, color: 'white', border: 'none', padding: '7px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Regrouper →</button>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <div />
          {days.map((d, i) => (
            <div key={d} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid var(--border)', background: i === 0 ? ACCENT_DIMMER : 'transparent' }}>
              <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 2 }}>{d.slice(0, 3)}</div>
              <div style={{ fontSize: 18, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? ACCENT : 'var(--fg)' }}>{d.slice(4)}</div>
            </div>
          ))}
        </div>
        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', position: 'relative' }}>
            {/* Hour labels */}
            <div>
              {hours.map(h => (
                <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--fg3)' }}>{h}h</span>
                </div>
              ))}
            </div>
            {/* Day columns */}
            {days.map((d, di) => (
              <div key={d} style={{ borderLeft: '1px solid var(--border)', position: 'relative' }}>
                {hours.map(h => (
                  <div key={h} style={{ height: HOUR_H, borderBottom: '1px solid var(--border)', borderBottomStyle: h % 2 === 0 ? 'solid' : 'dashed', borderBottomColor: 'var(--border)' }} />
                ))}
                {events.filter(e => e.day === di).map((ev, ei) => (
                  <div key={ei} style={{
                    position: 'absolute', left: 2, right: 2,
                    top: (ev.start - 7) * HOUR_H + 1,
                    height: (ev.end - ev.start) * HOUR_H - 2,
                    background: ev.color + '22', border: `1px solid ${ev.color}55`,
                    borderLeft: `3px solid ${ev.color}`, borderRadius: 5, padding: '4px 6px', overflow: 'hidden', cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: ev.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.sub}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const { kpis, insights } = AppData.analytics;
  const insightColors = { warning: '#f97316', positive: '#22c55e', info: ACCENT };

  const barData = [
    { label: 'Lun', val: 42 }, { label: 'Mar', val: 68 }, { label: 'Mer', val: 55 }, { label: 'Jeu', val: 71 },
    { label: 'Ven', val: 83 }, { label: 'Sam', val: 29 }, { label: 'Dim', val: 18 },
  ];
  const maxBar = Math.max(...barData.map(d => d.val));

  const catData = [
    { label: 'Plomberie', val: 38, color: '#5a8dee' },
    { label: 'Chauffage', val: 22, color: '#f97316' },
    { label: 'Électricité', val: 18, color: '#eab308' },
    { label: 'Menuiserie', val: 12, color: '#8b5cf6' },
    { label: 'Autres', val: 10, color: '#9a9a92' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 8, fontWeight: 500 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'DM Serif Display, serif', marginBottom: 4 }}>{k.val}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: k.delta.startsWith('+') ? '#22c55e' : k.delta.startsWith('-') ? '#ef4444' : 'var(--fg3)', fontWeight: 500 }}>{k.delta}</span>
              <span style={{ fontSize: 11, color: 'var(--fg3)' }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights — star of the page */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icons.Sparkles size={16} style={{ color: ACCENT }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Insights IA — semaine du 22 avril</span>
          <span style={{ fontSize: 12, color: 'var(--fg3)', marginLeft: 4 }}>Généré ce matin à 6h00</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {insights.map((ins, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderTop: `3px solid ${insightColors[ins.urgence]}`, borderRadius: 10, padding: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>{ins.titre}</div>
              <p style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.65, marginBottom: 12 }}>{ins.texte}</p>
              <button style={{ fontSize: 12, color: insightColors[ins.urgence], background: 'none', border: `1px solid ${insightColors[ins.urgence]}44`, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                {ins.action} <Icons.ArrowRight size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Bar chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Conversations traitées / jour (7 derniers jours)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {barData.map(d => (
              <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--fg3)' }}>{d.val}</span>
                <div style={{ width: '100%', background: ACCENT, borderRadius: '3px 3px 0 0', opacity: 0.7 + (d.val / maxBar) * 0.3, height: (d.val / maxBar) * 100 }} />
                <span style={{ fontSize: 10, color: 'var(--fg3)' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Pie-style donut */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Répartition tickets par catégorie</div>
          {catData.map(c => (
            <div key={c.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />{c.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{c.val}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: c.val + '%', background: c.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Locataires ───────────────────────────────────────────────────────────────
function LocatairesPage() {
  const [selected, setSelected] = React.useState(null);
  const { compact } = React.useContext(DensityCtx);
  const rowH = compact ? 38 : 52;
  const HUMEUR = { positif: { label: '↑ Positif', color: '#22c55e' }, neutre: { label: '→ Neutre', color: '#9a9a92' }, negatif: { label: '↓ Tendu', color: '#ef4444' } };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 100px 80px 80px 60px', padding: '0 16px', height: 36, alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
          {['Locataire','Bien','Bail','Paiement','Humeur IA','Tickets',''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)' }}>{h}</span>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {AppData.tenants.map(t => {
            const humeur = HUMEUR[t.humeur] || HUMEUR.neutre;
            const isSelected = selected?.id === t.id;
            return (
              <div key={t.id} onClick={() => setSelected(isSelected ? null : t)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 100px 80px 80px 60px', padding: '0 16px', height: rowH, alignItems: 'center', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? ACCENT_DIMMER : 'var(--surface)', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ACCENT, flexShrink: 0 }}>{t.nom[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>{t.nom}{t.flag && <Icons.Flag size={11} style={{ color: '#ef4444' }} />}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg3)' }}>{t.email}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--fg2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lot}</span>
                <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{t.debutBail} → {t.finBail.slice(-4)}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: t.paiement === 'ok' ? '#22c55e' : '#f97316' }}>{t.paiement === 'ok' ? 'À jour' : 'Retard'}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: humeur.color }}>{humeur.label}</span>
                <span style={{ fontSize: 12, color: 'var(--fg2)' }}>{t.tickets}</span>
                <Icons.ChevronRight size={14} style={{ color: 'var(--fg3)' }} />
              </div>
            );
          })}
        </div>
      </div>
      {selected && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 800 }} onClick={() => setSelected(null)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, zIndex: 900, background: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: '20px', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', animation: 'slideIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: ACCENT }}>{selected.nom[0]}</div>
                <div><div style={{ fontSize: 16, fontWeight: 700 }}>{selected.nom}</div><div style={{ fontSize: 12, color: 'var(--fg3)' }}>{selected.lot} · {selected.adresse}</div></div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg3)' }}><Icons.X size={18} /></button>
            </div>
            {selected.flag && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}><Icons.Flag size={13} /> Locataire signalé — surveiller de près</div>}
            <div style={{ background: ACCENT_DIMMER, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid oklch(0.9 0.04 320)` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: ACCENT, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Icons.Bot size={11} /> Résumé IA</div>
              <p style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.65 }}>{selected.resume}</p>
            </div>
            {[['Email', selected.email],['Téléphone', selected.tel],['Loyer', selected.loyer + ' €/mois'],['Bail', selected.debutBail + ' → ' + selected.finBail],['Tickets', selected.tickets + ' signalés']].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--fg3)' }}>{k}</span><span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Prestataires ─────────────────────────────────────────────────────────────
function PrestatairesPage() {
  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {AppData.providers.map(p => (
          <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px', transition: 'box-shadow 0.15s', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{p.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{p.categorie}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: p.disponible ? '#22c55e' : '#9a9a92', background: p.disponible ? '#f0fdf4' : '#f5f4f0', padding: '3px 9px', borderRadius: 100 }}>{p.disponible ? 'Disponible' : 'Indisponible'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 14, color: s <= Math.round(p.score) ? '#f59e0b' : 'var(--border)' }}>★</span>)}
              <span style={{ fontSize: 12, color: 'var(--fg3)', marginLeft: 4 }}>{p.score} · Score IA</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['Réponse moy.', p.reponse],['Interventions', p.interventions],['Zones', p.zones.join(', ')]].map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: 'var(--fg3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                </div>
              ))}
            </div>
            <button style={{ width: '100%', marginTop: 14, background: ACCENT_DIMMER, color: ACCENT, border: `1px solid oklch(0.88 0.06 320)`, padding: '8px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Envoyer un ticket</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────
function DocumentsPage() {
  const cats = ['Baux','Quittances','États des lieux','DPE','Factures','Assurances','Autres'];
  const [cat, setCat] = React.useState('Baux');
  const docs = [
    { name: 'Bail_Dubois_2024.pdf', lot: 'LOT-042', date: '1 mars 2024', status: 'confirmed', conf: 0.97 },
    { name: 'Bail_Laurent_2021.pdf', lot: 'LOT-017', date: '1 jan. 2021', status: 'confirmed', conf: 0.99 },
    { name: 'Bail_Martin_2023.pdf', lot: 'LOT-018', date: '1 juin 2023', status: 'review', conf: 0.88 },
    { name: 'Bail_Bernard_2020.pdf', lot: 'LOT-007', date: '1 sept. 2020', status: 'confirmed', conf: 0.95 },
  ];
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: 200, borderRight: '1px solid var(--border)', background: 'var(--surface)', padding: '12px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)', padding: '0 8px', marginBottom: 6 }}>Par type</div>
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 6, border: 'none', background: cat === c ? ACCENT_DIMMER : 'transparent', color: cat === c ? ACCENT : 'var(--fg)', cursor: 'pointer', fontSize: 13, marginBottom: 2, fontWeight: cat === c ? 500 : 400 }}>{c}</button>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <div style={{ position: 'relative', maxWidth: 400 }}>
            <Icons.Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg3)' }} />
            <input placeholder='Recherche sémantique — ex: "baux qui expirent avant juillet"'
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'DM Sans, sans-serif', outline: 'none', fontStyle: 'italic' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, alignContent: 'start' }}>
          {docs.map(d => (
            <div key={d.name} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: 'var(--surface)', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ height: 100, background: d.status === 'review' ? 'oklch(0.95 0.04 52)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)' }}>
                <Icons.FileText size={32} style={{ color: d.status === 'review' ? 'oklch(0.58 0.13 52)' : 'var(--fg3)' }} />
              </div>
              <div style={{ padding: '10px' }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 6 }}>{d.lot} · {d.date}</div>
                <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 100, background: d.status === 'confirmed' ? '#f0fdf4' : 'oklch(0.95 0.04 52)', color: d.status === 'confirmed' ? '#22c55e' : 'oklch(0.58 0.13 52)' }}>
                  {d.status === 'confirmed' ? 'Confirmé' : 'À réviser'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Paramètres ───────────────────────────────────────────────────────────────
function ParametresPage() {
  const sections = ['Profil','Agence','IA','Canaux','Équipe','Facturation'];
  const [sec, setSec] = React.useState('IA');
  const [aiPrompt, setAiPrompt] = React.useState('');
  const channels = [
    { name: 'Email (IMAP)', desc: 'contact@leonardoimmobilier.fr', connected: true, icon: 'Mail' },
    { name: 'WhatsApp Business', desc: '+33 7 00 00 00 00', connected: true, icon: 'MessageCircle' },
    { name: 'Téléphone (Retell)', desc: 'Numéro IA dédié', connected: false, icon: 'Phone' },
    { name: 'Chat web', desc: 'Widget sur votre site', connected: false, icon: 'MessageCircle' },
  ];
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: 180, borderRight: '1px solid var(--border)', background: 'var(--surface)', padding: '12px 8px', flexShrink: 0 }}>
        {sections.map(s => (
          <button key={s} onClick={() => setSec(s)} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', background: sec === s ? ACCENT_DIMMER : 'transparent', color: sec === s ? ACCENT : 'var(--fg)', cursor: 'pointer', fontSize: 13, marginBottom: 2, fontWeight: sec === s ? 500 : 400 }}>{s}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', maxWidth: 680 }}>
        {sec === 'IA' && (
          <div>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, marginBottom: 4 }}>Configuration de l'IA</h2>
            <p style={{ fontSize: 14, color: 'var(--fg2)', marginBottom: 24 }}>Définissez le comportement de votre agent IA en langage naturel.</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Comment l'IA doit-elle gérer les appels de nuit ?</label>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Ex: La nuit (22h-7h), l'IA doit toujours répondre pour les urgences (fuite, serrure) et envoyer un SMS automatique pour le reste. Les urgences doivent m'appeler directement sur mon portable." rows={4} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, background: 'var(--bg)', color: 'var(--fg)', resize: 'none', outline: 'none', lineHeight: 1.6 }} />
              {aiPrompt.length > 20 && (
                <div style={{ marginTop: 10, background: ACCENT_DIMMER, border: `1px solid oklch(0.88 0.06 320)`, borderRadius: 8, padding: '12px', fontSize: 13, color: 'var(--fg2)', lineHeight: 1.6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: ACCENT, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Icons.Bot size={11} /> Synthèse IA générée</div>
                  Règle de nuit (22h–7h) : répondre immédiatement aux urgences (fuite d'eau, serrure bloquée) → escalade appel mobile. Pour les autres demandes : message automatique + traitement différé à 7h.
                </div>
              )}
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 12 }}>Horaires de l'agent IA</label>
              {[['Lun – Ven', '8h00 – 20h00', true],['Samedi', '9h00 – 14h00', true],['Dimanche', 'Urgences uniquement', false]].map(([day, hours, active]) => (
                <div key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{day}</span>
                  <span style={{ color: 'var(--fg2)' }}>{hours}</span>
                  <div style={{ width: 36, height: 20, borderRadius: 100, background: active ? ACCENT : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: active ? 18 : 2, transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>
            <button style={{ background: ACCENT, color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Enregistrer la configuration</button>
          </div>
        )}
        {sec === 'Canaux' && (
          <div>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, marginBottom: 4 }}>Canaux de communication</h2>
            <p style={{ fontSize: 14, color: 'var(--fg2)', marginBottom: 24 }}>Connectez les canaux sur lesquels l'IA doit opérer.</p>
            {channels.map(c => {
              const Ic = Icons[c.icon];
              return (
                <div key={c.name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic size={18} style={{ color: 'var(--fg2)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{c.connected ? c.desc : 'Non connecté'}</div>
                  </div>
                  <button style={{ padding: '8px 16px', borderRadius: 7, border: c.connected ? '1px solid var(--border)' : 'none', background: c.connected ? 'transparent' : ACCENT, color: c.connected ? 'var(--fg2)' : 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    {c.connected ? 'Gérer' : 'Connecter'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {!['IA','Canaux'].includes(sec) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--fg3)' }}>
            <Icons.Settings size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Section {sec}</div>
            <div style={{ fontSize: 13 }}>En cours de développement.</div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { AgendaPage, AnalyticsPage, LocatairesPage, PrestatairesPage, DocumentsPage, ParametresPage });
