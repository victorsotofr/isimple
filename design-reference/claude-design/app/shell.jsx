// ─── Shell: Sidebar + Topbar + Command Palette ────────────────────────────────
const { useState, useEffect, useContext, createContext, useRef, useCallback } = React;

const DarkCtx = createContext({ dark: false, toggle: () => {} });
const DensityCtx = createContext({ compact: false, toggle: () => {} });
const NavCtx = createContext({ page: 'inbox', go: () => {} });

const ACCENT = 'oklch(0.55 0.18 320)';
const ACCENT_DIM = 'oklch(0.55 0.18 320 / 0.15)';
const ACCENT_DIMMER = 'oklch(0.55 0.18 320 / 0.08)';

const NAV_ITEMS = [
  { id: 'inbox',       label: 'Inbox',        icon: 'Inbox2',   badge: 'inbox' },
  { id: 'tickets',     label: 'Tickets',       icon: 'Ticket',   badge: 'tickets' },
  null, // divider
  { id: 'agenda',      label: 'Agenda',        icon: 'Calendar' },
  { id: 'properties',  label: 'Propriétés',    icon: 'Building' },
  { id: 'tenants',     label: 'Locataires',    icon: 'Users' },
  null,
  { id: 'providers',   label: 'Prestataires',  icon: 'Wrench' },
  { id: 'documents',   label: 'Documents',     icon: 'FileText' },
  { id: 'analytics',   label: 'Analytics',     icon: 'BarChart' },
  null,
  { id: 'settings',    label: 'Paramètres',    icon: 'Settings' },
];

const CMD_ITEMS = [
  { label: 'Aller à l\'Inbox',       action: 'nav:inbox',      shortcut: 'G I' },
  { label: 'Aller aux Tickets',      action: 'nav:tickets',    shortcut: 'G T' },
  { label: 'Aller à l\'Agenda',      action: 'nav:agenda',     shortcut: 'G A' },
  { label: 'Aller aux Propriétés',   action: 'nav:properties', shortcut: 'G P' },
  { label: 'Aller aux Locataires',   action: 'nav:tenants',    shortcut: 'G L' },
  { label: 'Aller aux Analytics',    action: 'nav:analytics',  shortcut: 'G R' },
  { label: 'Nouveau ticket',         action: 'new:ticket',     shortcut: 'N' },
  { label: 'Nouvelle propriété',     action: 'new:property',   shortcut: null },
  { label: 'Marc Lefort — LOT-042',  action: 'nav:tenants',    shortcut: null, type: 'tenant' },
  { label: 'Isabelle Laurent — LOT-017', action: 'nav:tenants', shortcut: null, type: 'tenant' },
  { label: '12 rue Lepic — Paris 18',action: 'nav:properties', shortcut: null, type: 'property' },
  { label: 'T-0491 — Fuite évier',   action: 'nav:tickets',    shortcut: null, type: 'ticket' },
];

function useDark() {
  const [dark, setDark] = useState(() => localStorage.getItem('isimple_dark') === 'true');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('isimple_dark', dark);
  }, [dark]);
  return { dark, toggle: () => setDark(d => !d) };
}

function useDensity() {
  const [compact, setCompact] = useState(() => localStorage.getItem('isimple_compact') === 'true');
  return { compact, toggle: () => setCompact(c => { localStorage.setItem('isimple_compact', !c); return !c; }) };
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ page, go, dark, toggleDark, compact, toggleCompact, openCmd }) {
  const inboxCount = AppData.conversations.filter(c => c.status === 'arbitrage').length;
  const ticketUrgent = AppData.tickets.filter(t => t.urgence === 'critique' && t.statut !== 'resolu').length;

  return (
    <aside style={{
      width: 220, background: '#1c1c1a', color: '#f0efe9',
      display: 'flex', flexDirection: 'column', height: '100vh',
      borderRight: '1px solid #2a2a28', flexShrink: 0, position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #2a2a28' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, background: ACCENT, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="6" height="6" rx="1" fill="white"/>
              <rect x="10" y="2" width="6" height="6" rx="1" fill="white" opacity="0.5"/>
              <rect x="2" y="10" width="6" height="6" rx="1" fill="white" opacity="0.5"/>
              <rect x="10" y="10" width="6" height="6" rx="1" fill="white"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 17, letterSpacing: '-0.01em' }}>isimple</span>
        </div>
        {/* Search / Cmd */}
        <button onClick={openCmd} style={{ width: '100%', background: '#2a2a28', border: '1px solid #3a3a38', borderRadius: 7, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#6a6a65' }}>
          <Icons.Search size={12} />
          <span style={{ fontSize: 12, flex: 1, textAlign: 'left' }}>Rechercher…</span>
          <kbd style={{ fontSize: 10, background: '#1c1c1a', border: '1px solid #3a3a38', borderRadius: 3, padding: '1px 5px', color: '#6a6a65', fontFamily: 'inherit' }}>⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map((item, i) => {
          if (!item) return <div key={i} style={{ height: 1, background: '#2a2a28', margin: '5px 8px' }} />;
          const active = page === item.id;
          const Ic = Icons[item.icon];
          const badge = item.badge === 'inbox' ? inboxCount : item.badge === 'tickets' ? ticketUrgent : 0;
          return (
            <button key={item.id} onClick={() => go(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: active ? ACCENT_DIM : 'transparent',
              color: active ? '#f0efe9' : '#8a8a85',
              marginBottom: 1, transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#2a2a28'; e.currentTarget.style.color = '#f0efe9'; }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8a85'; } }}>
              <Ic size={14} />
              <span style={{ fontSize: 13, flex: 1, textAlign: 'left', fontWeight: active ? 500 : 400 }}>{item.label}</span>
              {badge > 0 && <span style={{ background: active ? ACCENT : '#3a3a38', color: active ? 'white' : '#c0bfba', borderRadius: 100, fontSize: 10, fontWeight: 600, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div style={{ borderTop: '1px solid #2a2a28', padding: '10px 8px' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <button onClick={toggleDark} title={dark ? 'Mode clair' : 'Mode sombre'} style={{ flex: 1, background: '#2a2a28', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#8a8a85', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {dark ? <Icons.Sun size={13} /> : <Icons.Moon size={13} />}
          </button>
          <button onClick={toggleCompact} title={compact ? 'Vue confortable' : 'Vue compacte'} style={{ flex: 1, background: '#2a2a28', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: compact ? ACCENT : '#8a8a85', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.LayoutList size={13} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, background: '#2a2a28' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>LE</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#f0efe9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Leonardo Immo.</div>
            <div style={{ fontSize: 10, color: '#6a6a65', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Pro · 12 lots actifs</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ page, action }) {
  const labels = {
    inbox: 'Inbox', tickets: 'Tickets', agenda: 'Agenda',
    properties: 'Propriétés', tenants: 'Locataires', providers: 'Prestataires',
    documents: 'Documents', analytics: 'Analytics', settings: 'Paramètres',
  };
  const actions = {
    inbox: null, tickets: { label: '+ Nouveau ticket', shortcut: 'N' },
    agenda: { label: '+ Ajouter un créneau' }, properties: { label: '+ Ajouter un bien' },
    tenants: { label: '+ Ajouter un locataire' }, providers: { label: '+ Prestataire' },
    documents: { label: '+ Importer' }, analytics: null, settings: null,
  };
  const act = actions[page];
  return (
    <div style={{ height: 48, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, background: 'var(--surface)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <span style={{ fontSize: 13, color: 'var(--fg3)', fontWeight: 400 }}>Leonardo Immobilier</span>
        <Icons.ChevronRight size={12} style={{ color: 'var(--fg3)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{labels[page] || page}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* AI status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 100, padding: '4px 10px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, color: 'var(--fg2)', fontWeight: 500 }}>IA active</span>
        </div>
        {act && (
          <button onClick={action} style={{ background: ACCENT, color: 'white', border: 'none', padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {act.label}
            {act.shortcut && <kbd style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 5px', fontFamily: 'inherit' }}>{act.shortcut}</kbd>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Command Palette ──────────────────────────────────────────────────────────
function CommandPalette({ open, onClose, go }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef();
  const results = CMD_ITEMS.filter(i => !q || i.label.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  useEffect(() => { setSel(0); }, [q]);

  const runAction = (item) => {
    if (item.action.startsWith('nav:')) go(item.action.slice(4));
    onClose();
  };

  useEffect(() => {
    const handler = (e) => {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && results[sel]) runAction(results[sel]);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, sel, results]);

  if (!open) return null;
  const typeIcon = { tenant: <Icons.Users size={12} />, property: <Icons.Building size={12} />, ticket: <Icons.Ticket size={12} /> };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, width: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <Icons.Search size={16} style={{ color: 'var(--fg3)' }} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher ou naviguer…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: 'var(--fg)', fontFamily: 'DM Sans, sans-serif' }} />
          <kbd style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', color: 'var(--fg3)', fontFamily: 'inherit' }}>Échap</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px' }}>
          {results.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg3)', fontSize: 13 }}>Aucun résultat</div>}
          {results.map((item, i) => (
            <button key={i} onClick={() => runAction(item)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: sel === i ? 'var(--bg)' : 'transparent', color: 'var(--fg)', textAlign: 'left',
            }}
            onMouseEnter={() => setSel(i)}>
              <span style={{ color: 'var(--fg3)', display: 'flex' }}>{item.type ? typeIcon[item.type] : <Icons.ArrowRight size={12} />}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
              {item.shortcut && <kbd style={{ fontSize: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', color: 'var(--fg3)', fontFamily: 'inherit', letterSpacing: '0.05em' }}>{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
          {[['↑↓', 'naviguer'], ['↵', 'ouvrir'], ['Échap', 'fermer']].map(([k, v]) => (
            <span key={k} style={{ fontSize: 11, color: 'var(--fg3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ fontSize: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontFamily: 'inherit' }}>{k}</kbd> {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
function useGlobalKeys(go, openCmd) {
  const pending = useRef('');
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCmd(); return; }
      if (e.key === '/') { e.preventDefault(); openCmd(); return; }
      if (e.key === 'g') { pending.current = 'g'; setTimeout(() => { pending.current = ''; }, 800); return; }
      if (pending.current === 'g') {
        const map = { i: 'inbox', t: 'tickets', a: 'agenda', p: 'properties', l: 'tenants', r: 'analytics' };
        if (map[e.key]) { go(map[e.key]); pending.current = ''; }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go, openCmd]);
}

// ─── Shell wrapper ────────────────────────────────────────────────────────────
function Shell({ children, page, go }) {
  const { dark, toggle: toggleDark } = useDark();
  const { compact, toggle: toggleCompact } = useDensity();
  const [cmdOpen, setCmdOpen] = useState(false);
  const openCmd = useCallback(() => setCmdOpen(true), []);
  useGlobalKeys(go, openCmd);

  return (
    <DarkCtx.Provider value={{ dark, toggle: toggleDark }}>
      <DensityCtx.Provider value={{ compact, toggle: toggleCompact }}>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar page={page} go={go} dark={dark} toggleDark={toggleDark} compact={compact} toggleCompact={toggleCompact} openCmd={openCmd} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
            <Topbar page={page} action={() => {}} />
            <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
          </div>
          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} go={go} />
        </div>
      </DensityCtx.Provider>
    </DarkCtx.Provider>
  );
}

Object.assign(window, { Shell, DarkCtx, DensityCtx, NavCtx, ACCENT, ACCENT_DIM, ACCENT_DIMMER });
