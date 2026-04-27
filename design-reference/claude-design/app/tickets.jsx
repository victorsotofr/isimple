// ─── Tickets Page ─────────────────────────────────────────────────────────────
const { useState: useTicketState, useEffect: useTicketEffect, useRef: useTicketRef } = React;

const URGENCE_CFG = {
  critique: { label: 'Critique', color: '#ef4444', bg: '#fef2f2' },
  haute:    { label: 'Haute',    color: '#f97316', bg: '#fff7ed' },
  moyenne:  { label: 'Moyenne',  color: '#eab308', bg: '#fefce8' },
  basse:    { label: 'Basse',    color: '#9a9a92', bg: '#f5f4f0' },
};

const STATUT_CFG = {
  ouvert:   { label: 'Ouvert',    color: '#5a8dee', bg: '#eff6ff' },
  en_cours: { label: 'En cours',  color: ACCENT,    bg: ACCENT_DIMMER },
  planifie: { label: 'Planifié',  color: '#8b5cf6', bg: '#f5f3ff' },
  resolu:   { label: 'Résolu',    color: '#22c55e', bg: '#f0fdf4' },
};

const CAT_ICONS = {
  plomberie:     'Wrench',
  serrurerie:    'Settings',
  chauffage:     'Zap',
  electricite:   'Zap',
  voisinage:     'Users',
  menuiserie:    'Layers',
  administratif: 'FileText',
};

function UrgencePill({ urgence }) {
  const cfg = URGENCE_CFG[urgence] || URGENCE_CFG.basse;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 100 }}>
    <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />{cfg.label}
  </span>;
}

function StatutPill({ statut }) {
  const cfg = STATUT_CFG[statut] || STATUT_CFG.ouvert;
  return <span style={{ fontSize: 11, fontWeight: 500, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 100 }}>{cfg.label}</span>;
}

function SLACell({ sla, urgence }) {
  const overdue = sla === 'Dépassé';
  return <span style={{ fontSize: 12, fontWeight: 500, color: overdue ? '#ef4444' : urgence === 'haute' ? '#f97316' : 'var(--fg2)' }}>{sla}</span>;
}

// ─── Ticket Drawer ────────────────────────────────────────────────────────────
function TicketDrawer({ ticket, onClose }) {
  const [showAI, setShowAI] = useTicketState(false);
  const [relanceLoading, setRelanceLoading] = useTicketState(false);

  const relance = () => {
    setRelanceLoading(true);
    setTimeout(() => setRelanceLoading(false), 1800);
  };

  if (!ticket) return null;
  const CatIcon = Icons[CAT_ICONS[ticket.categorie] || 'Wrench'];

  const timelineIcons = {
    creation:     { Icon: Icons.Plus, color: 'var(--fg3)' },
    qualification: { Icon: Icons.Bot, color: ACCENT },
    assignation:  { Icon: Icons.User, color: '#5a8dee' },
    message:      { Icon: Icons.MessageCircle, color: 'var(--fg3)' },
    intervention: { Icon: Icons.Wrench, color: '#f97316' },
    escalade:     { Icon: Icons.AlertTriangle, color: '#ef4444' },
    resolution:   { Icon: Icons.CheckCircle, color: '#22c55e' },
  };

  return (
    <>
      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.18)' }} onClick={onClose} />
      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, zIndex: 900, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', animation: 'slideIn 0.2s ease' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg3)', letterSpacing: '0.05em' }}>{ticket.id}</span>
                {ticket.aiCree && <span style={{ fontSize: 10, background: ACCENT_DIMMER, color: ACCENT, padding: '1px 6px', borderRadius: 100, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><Icons.Bot size={9} /> Créé par IA</span>}
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{ticket.titre}</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <UrgencePill urgence={ticket.urgence} />
                <StatutPill statut={ticket.statut} />
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg3)', padding: 4 }}><Icons.X size={18} /></button>
          </div>
          {/* Meta row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            {[
              { label: 'Bien', val: ticket.adresse },
              { label: 'Locataire', val: ticket.locataire },
              { label: 'SLA', val: ticket.sla },
            ].map(m => (
              <div key={m.label} style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--fg3)' }}>{m.label} · </span>
                <span style={{ fontWeight: 500 }}>{m.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* AI suggestion banner */}
          <div style={{ background: ACCENT_DIMMER, border: `1px solid oklch(0.88 0.06 320)`, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: ACCENT }}>
                <Icons.Sparkles size={13} /> Suggestions IA
              </div>
              <button onClick={() => setShowAI(s => !s)} style={{ fontSize: 11, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer' }}>{showAI ? 'Masquer' : 'Voir'}</button>
            </div>
            {showAI && (
              <div style={{ animation: 'slideIn 0.2s ease' }}>
                {ticket.categorie === 'plomberie' && (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 8 }}>Prestataires suggérés (triés par score + disponibilité) :</div>
                    {AppData.providers.filter(p => p.categorie === 'Plomberie').map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ flex: 1, fontWeight: 500 }}>{p.nom}</span>
                        <span style={{ color: 'var(--fg3)' }}>{p.reponse}</span>
                        <span style={{ color: '#f59e0b' }}>★ {p.score}</span>
                        {p.disponible && <span style={{ fontSize: 10, background: '#f0fdf4', color: '#22c55e', padding: '1px 6px', borderRadius: 100 }}>Dispo</span>}
                      </div>
                    ))}
                  </>
                )}
                <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 8 }}>
                  Urgence réévaluée : <strong style={{ color: '#f97316' }}>Haute</strong> — délai d'intervention recommandé &lt;4h
                </div>
              </div>
            )}
            {!showAI && <div style={{ fontSize: 12, color: 'var(--fg2)' }}>Prestataire recommandé · Urgence confirmée · Pas de doublon détecté</div>}
          </div>

          {/* Timeline */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Historique</div>
          <div style={{ position: 'relative' }}>
            {ticket.timeline.map((ev, i) => {
              const cfg = timelineIcons[ev.type] || timelineIcons.message;
              return (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative' }}>
                  {i < ticket.timeline.length - 1 && (
                    <div style={{ position: 'absolute', left: 11, top: 22, bottom: -8, width: 1, background: 'var(--border)' }} />
                  )}
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: ev.ai ? ACCENT_DIMMER : 'var(--bg)', border: `1px solid ${ev.ai ? 'oklch(0.88 0.06 320)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                    <cfg.Icon size={11} style={{ color: ev.ai ? ACCENT : cfg.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--fg)', marginBottom: 2 }}>{ev.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg3)' }}>{ev.time}</div>
                  </div>
                </div>
              );
            })}
            {ticket.timeline.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg3)' }}>Aucun événement enregistré.</div>}
          </div>

          {/* Prestataire */}
          {ticket.prestataire && (
            <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Prestataire assigné</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{ticket.prestataire}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{ticket.categorie}</div>
                </div>
                <button onClick={relance} style={{ background: relanceLoading ? ACCENT_DIMMER : 'var(--surface)', border: '1px solid var(--border)', color: relanceLoading ? ACCENT : 'var(--fg)', padding: '7px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {relanceLoading ? <><Icons.RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Relance envoyée</> : 'Relancer'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, background: '#22c55e', color: 'white', border: 'none', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icons.CheckCircle size={14} /> Marquer résolu
          </button>
          <button style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--fg2)', padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Modifier</button>
          <button style={{ background: 'none', border: '1px solid #fecaca', color: '#ef4444', padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Archiver</button>
        </div>
      </div>
    </>
  );
}

// ─── Tickets Page ─────────────────────────────────────────────────────────────
function TicketsPage() {
  const [selected, setSelected] = useTicketState(null);
  const [filterUrgence, setFilterUrgence] = useTicketState('all');
  const [filterStatut, setFilterStatut] = useTicketState('all');
  const { compact } = React.useContext(DensityCtx);
  const rowH = compact ? 38 : 48;

  const filtered = AppData.tickets.filter(t => {
    if (filterUrgence !== 'all' && t.urgence !== filterUrgence) return false;
    if (filterStatut !== 'all' && t.statut !== filterStatut) return false;
    return true;
  });

  const cols = [
    { key: 'id', label: '#', w: 80 },
    { key: 'titre', label: 'Titre', w: '1fr' },
    { key: 'adresse', label: 'Bien', w: 160 },
    { key: 'locataire', label: 'Locataire', w: 120 },
    { key: 'categorie', label: 'Cat.', w: 44 },
    { key: 'urgence', label: 'Urgence', w: 90 },
    { key: 'statut', label: 'Statut', w: 90 },
    { key: 'prestataire', label: 'Prestataire', w: 140 },
    { key: 'sla', label: 'SLA', w: 100 },
    { key: 'cree', label: 'Créé', w: 90 },
  ];
  const gridTemplate = cols.map(c => typeof c.w === 'number' ? c.w + 'px' : c.w).join(' ');

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Filters sidebar */}
      <div style={{ width: 180, borderRight: '1px solid var(--border)', background: 'var(--surface)', padding: '14px', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)', marginBottom: 8 }}>Urgence</div>
        {[['all', 'Toutes'], ...Object.entries(URGENCE_CFG).map(([k, v]) => [k, v.label])].map(([val, lab]) => (
          <button key={val} onClick={() => setFilterUrgence(val)} style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: filterUrgence === val ? 'var(--bg)' : 'transparent', color: 'var(--fg)', cursor: 'pointer', fontSize: 13, marginBottom: 2, fontWeight: filterUrgence === val ? 500 : 400 }}>
            {val !== 'all' && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: URGENCE_CFG[val]?.color, marginRight: 6 }} />}
            {lab}
          </button>
        ))}
        <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)', marginBottom: 8 }}>Statut</div>
        {[['all', 'Tous'], ...Object.entries(STATUT_CFG).map(([k, v]) => [k, v.label])].map(([val, lab]) => (
          <button key={val} onClick={() => setFilterStatut(val)} style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: filterStatut === val ? 'var(--bg)' : 'transparent', color: 'var(--fg)', cursor: 'pointer', fontSize: 13, marginBottom: 2, fontWeight: filterStatut === val ? 500 : 400 }}>{lab}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, padding: '0 16px', height: 36, alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
          {cols.map(c => <span key={c.key} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>)}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(t => {
            const CatIcon = Icons[CAT_ICONS[t.categorie] || 'Wrench'];
            const isSelected = selected?.id === t.id;
            return (
              <div key={t.id} onClick={() => setSelected(isSelected ? null : t)}
                style={{ display: 'grid', gridTemplateColumns: gridTemplate, padding: '0 16px', height: rowH, alignItems: 'center', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? ACCENT_DIMMER : 'var(--surface)', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface)'; }}>
                <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t.aiCree && <Icons.Bot size={10} style={{ color: ACCENT }} />}{t.id}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{t.titre}</span>
                <span style={{ fontSize: 12, color: 'var(--fg2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.adresse.split(',')[0]}</span>
                <span style={{ fontSize: 12, color: 'var(--fg2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.locataire}</span>
                <span title={t.categorie}><CatIcon size={14} style={{ color: 'var(--fg3)' }} /></span>
                <UrgencePill urgence={t.urgence} />
                <StatutPill statut={t.statut} />
                <span style={{ fontSize: 12, color: 'var(--fg2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.prestataire || '—'}</span>
                <SLACell sla={t.sla} urgence={t.urgence} />
                <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{t.cree}</span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--fg3)' }}>
          {filtered.length} ticket{filtered.length > 1 ? 's' : ''} · <kbd style={{ fontSize: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontFamily: 'inherit' }}>N</kbd> nouveau ticket
        </div>
      </div>

      {selected && <TicketDrawer ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

Object.assign(window, { TicketsPage });
