// ─── Properties Page ──────────────────────────────────────────────────────────
const { useState: usePropState } = React;

const DPE_COLORS = { A:'#00a550',B:'#51b748',C:'#b1d23a',D:'#ffd600',E:'#f7941d',F:'#ed1d24',G:'#9b0000' };

function DPEBadge({ cls }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: DPE_COLORS[cls] || '#ccc', padding: '2px 7px', borderRadius: 4 }}>{cls}</span>;
}

function PropertyDetail({ prop, onClose }) {
  const [tab, setTab] = usePropState('general');
  const tenant = AppData.tenants.find(t => t.lot === prop.id);
  const tickets = AppData.tickets.filter(t => t.lot === prop.id);
  const tabs = ['Général','Locataire','Tickets','Documents','Travaux'];

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.18)' }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, zIndex: 900, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', animation: 'slideIn 0.2s ease', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 4, fontWeight: 500 }}>{prop.ref}</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{prop.adresse}</h2>
              <div style={{ fontSize: 13, color: 'var(--fg2)', marginBottom: 8 }}>{prop.ville}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <DPEBadge cls={prop.dpe} />
                <span style={{ fontSize: 12, background: prop.statut === 'loue' ? '#f0fdf4' : '#fff7ed', color: prop.statut === 'loue' ? '#22c55e' : '#f97316', padding: '2px 8px', borderRadius: 100, fontWeight: 500 }}>{prop.statut === 'loue' ? 'Loué' : 'Vacant'}</span>
                <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{prop.surface} m² · {prop.type}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg3)' }}><Icons.X size={18} /></button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, padding: '0 20px' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t.toLowerCase())} style={{ padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: tab === t.toLowerCase() ? 'var(--fg)' : 'var(--fg3)', fontWeight: tab === t.toLowerCase() ? 600 : 400, borderBottom: tab === t.toLowerCase() ? `2px solid ${ACCENT}` : '2px solid transparent', marginBottom: -1 }}>
              {t}
            </button>
          ))}
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* AI Tasks always visible */}
          {prop.alerts.length > 0 && (
            <div style={{ background: ACCENT_DIMMER, border: `1px solid oklch(0.88 0.06 320)`, borderRadius: 10, padding: '12px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: ACCENT, marginBottom: 8 }}>
                <Icons.Sparkles size={12} /> Tâches IA en attente ({prop.taches})
              </div>
              {prop.alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < prop.alerts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <Icons.AlertTriangle size={12} style={{ color: '#f97316', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--fg)' }}>{a}</span>
                  <button style={{ marginLeft: 'auto', fontSize: 11, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer' }}>Traiter</button>
                </div>
              ))}
            </div>
          )}
          {tab === 'général' && (
            <div>
              {[['Référence', prop.ref],['Type', prop.type],['Surface', prop.surface + ' m²'],['Loyer', prop.loyer + ' €/mois'],['DPE', prop.dpe],['Statut', prop.statut === 'loue' ? 'Loué' : 'Vacant']].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--fg3)' }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'locataire' && tenant && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '12px', background: 'var(--bg)', borderRadius: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: ACCENT }}>{tenant.nom[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{tenant.nom}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{tenant.email} · {tenant.tel}</div>
                </div>
              </div>
              <div style={{ background: ACCENT_DIMMER, borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13, lineHeight: 1.6, color: 'var(--fg2)', border: `1px solid oklch(0.9 0.04 320)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 600, color: ACCENT, fontSize: 11 }}><Icons.Bot size={11} /> Résumé IA</div>
                {tenant.resume}
              </div>
              {[['Bail depuis', tenant.debutBail],['Fin du bail', tenant.finBail],['Loyer', tenant.loyer + ' €/mois'],['Paiement', tenant.paiement === 'ok' ? '✓ À jour' : '⚠ Retard ce mois']].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--fg3)' }}>{k}</span>
                  <span style={{ fontWeight: 500, color: k === 'Paiement' && tenant.paiement !== 'ok' ? '#f97316' : 'var(--fg)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'tickets' && (
            <div>
              {tickets.length === 0 && <div style={{ textAlign: 'center', color: 'var(--fg3)', padding: '40px 0', fontSize: 13 }}>Aucun ticket pour ce bien.</div>}
              {tickets.map(t => (
                <div key={t.id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{t.titre}</span>
                    <UrgencePill urgence={t.urgence} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg3)' }}>
                    <span>{t.id} · {t.cree}</span>
                    <StatutPill statut={t.statut} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'documents' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--fg3)' }}>
              <Icons.FileText size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 13, marginBottom: 8 }}>3 documents liés à ce bien</div>
              <button style={{ fontSize: 13, color: ACCENT, background: 'none', border: `1px solid oklch(0.88 0.06 320)`, padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>Voir dans Documents →</button>
            </div>
          )}
          {tab === 'travaux' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--fg3)' }}>
              <Icons.Wrench size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 13 }}>Aucun travaux planifiés</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PropertiesPage() {
  const [selected, setSelected] = usePropState(null);
  const [search, setSearch] = usePropState('');
  const [filterStatut, setFilterStatut] = usePropState('all');
  const { compact } = React.useContext(DensityCtx);
  const rowH = compact ? 38 : 50;

  const filtered = AppData.properties.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.adresse.toLowerCase().includes(q) && !p.ville.toLowerCase().includes(q) && !(p.locataire||'').toLowerCase().includes(q)) return false;
    if (filterStatut !== 'all' && p.statut !== filterStatut) return false;
    return true;
  });

  const alertCount = AppData.properties.filter(p => p.alerts.length > 0).length;
  const gridTemplate = '80px 1fr 80px 60px 80px 120px 80px 60px 80px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* AI alert banner */}
      {alertCount > 0 && (
        <div style={{ background: ACCENT_DIMMER, borderBottom: `1px solid oklch(0.88 0.06 320)`, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Icons.Sparkles size={13} style={{ color: ACCENT }} />
          <span style={{ fontSize: 13, color: 'var(--fg2)' }}><strong style={{ color: 'var(--fg)' }}>{alertCount} biens</strong> ont des tâches IA en attente — baux proches de l'échéance, DPE à renouveler, quittances en retard.</span>
          <button style={{ marginLeft: 'auto', fontSize: 12, color: ACCENT, background: 'none', border: `1px solid oklch(0.88 0.06 320)`, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>Voir tout</button>
        </div>
      )}
      {/* Toolbar */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Icons.Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un bien…"
            style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
        </div>
        {[['all','Tous'],['loue','Loués'],['vacant','Vacants']].map(([val,lab]) => (
          <button key={val} onClick={() => setFilterStatut(val)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: filterStatut === val ? 'var(--fg)' : 'transparent', color: filterStatut === val ? 'var(--bg)' : 'var(--fg2)', fontSize: 12, cursor: 'pointer', fontWeight: filterStatut === val ? 500 : 400 }}>{lab}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg3)' }}>{filtered.length} biens</span>
      </div>
      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, padding: '0 16px', height: 36, alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        {['Réf.','Adresse','Type','Surf.','Loyer','Locataire','Statut','DPE','Tâches'].map(h => (
          <span key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)' }}>{h}</span>
        ))}
      </div>
      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map(p => {
          const isSelected = selected?.id === p.id;
          return (
            <div key={p.id} onClick={() => setSelected(isSelected ? null : p)}
              style={{ display: 'grid', gridTemplateColumns: gridTemplate, padding: '0 16px', height: rowH, alignItems: 'center', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? ACCENT_DIMMER : 'var(--surface)', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface)'; }}>
              <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 500 }}>{p.ref}</span>
              <div style={{ minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.adresse}</div>
                <div style={{ fontSize: 11, color: 'var(--fg3)' }}>{p.ville}</div>
              </div>
              <span style={{ fontSize: 12 }}>{p.type}</span>
              <span style={{ fontSize: 12 }}>{p.surface} m²</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{p.loyer} €</span>
              <span style={{ fontSize: 12, color: p.locataire ? 'var(--fg)' : 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.locataire || '—'}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: p.statut === 'loue' ? '#22c55e' : '#f97316' }}>{p.statut === 'loue' ? 'Loué' : 'Vacant'}</span>
              <DPEBadge cls={p.dpe} />
              {p.taches > 0
                ? <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT, background: ACCENT_DIMMER, padding: '2px 8px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icons.Zap size={10} />{p.taches}</span>
                : <span style={{ fontSize: 12, color: 'var(--fg3)' }}>—</span>}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--fg3)', background: 'var(--surface)' }}>
        {AppData.properties.filter(p => p.statut === 'loue').length} loués · {AppData.properties.filter(p => p.statut === 'vacant').length} vacants · {Math.round(AppData.properties.filter(p=>p.statut==='loue').reduce((a,p)=>a+p.loyer,0)/1000)}k€/mois encaissés
      </div>
      {selected && <PropertyDetail prop={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

Object.assign(window, { PropertiesPage });
