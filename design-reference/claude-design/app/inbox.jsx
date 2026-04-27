// ─── Inbox Page ───────────────────────────────────────────────────────────────
const { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = React;

const CHANNEL_ICONS = {
  whatsapp: { icon: 'MessageCircle', color: '#25d366', label: 'WhatsApp' },
  email:    { icon: 'Mail',          color: '#5a8dee', label: 'Email' },
  phone:    { icon: 'Phone',         color: '#f97316', label: 'Appel' },
  chat:     { icon: 'MessageCircle', color: '#8b5cf6', label: 'Chat' },
  sms:      { icon: 'MessageCircle', color: '#6366f1', label: 'SMS' },
};

const CONTACT_COLORS = {
  locataire: { bg: '#e8f5e9', color: '#2e7d32', label: 'Locataire' },
  prospect:  { bg: 'oklch(0.93 0.06 320)', color: 'oklch(0.45 0.15 320)', label: 'Prospect' },
  inconnu:   { bg: '#f5f4f0', color: '#9a9a92', label: 'Inconnu' },
};

const STATUS_GROUPS = [
  { key: 'arbitrage',   label: 'À arbitrer',         color: '#f97316' },
  { key: 'ia_en_cours', label: 'Géré par l\'IA',     color: ACCENT },
  { key: 'ticket_cree', label: 'Ticket créé',         color: '#5a8dee' },
  { key: 'resolu',      label: 'Résolu',              color: '#9a9a92' },
];

function ChannelBadge({ channel, size = 12 }) {
  const cfg = CHANNEL_ICONS[channel] || CHANNEL_ICONS.chat;
  const Ic = Icons[cfg.icon];
  return <Ic size={size} style={{ color: cfg.color }} />;
}

function ContactBadge({ type }) {
  const cfg = CONTACT_COLORS[type] || CONTACT_COLORS.inconnu;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, background: cfg.bg, color: cfg.color, padding: '2px 7px', borderRadius: 100 }}>
      {cfg.label}
    </span>
  );
}

function ConvList({ convs, selected, onSelect }) {
  const groups = STATUS_GROUPS.map(g => ({
    ...g,
    items: convs.filter(c => c.status === g.key),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ width: 300, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      {/* Filter bar */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}>
        {['Tous', 'Email', 'WA', 'Appel'].map((f, i) => (
          <button key={f} style={{ padding: '4px 10px', borderRadius: 100, border: '1px solid var(--border)', background: i === 0 ? 'var(--fg)' : 'transparent', color: i === 0 ? 'var(--bg)' : 'var(--fg2)', fontSize: 11, cursor: 'pointer', fontWeight: i === 0 ? 500 : 400 }}>{f}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {groups.map(g => (
          <div key={g.key}>
            <div style={{ padding: '10px 14px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: g.color }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg3)' }}>{g.label}</span>
              <span style={{ fontSize: 10, color: 'var(--fg3)' }}>{g.items.length}</span>
            </div>
            {g.items.map(conv => {
              const active = selected?.id === conv.id;
              return (
                <div key={conv.id} onClick={() => onSelect(conv)}
                  style={{ padding: '10px 14px', cursor: 'pointer', background: active ? ACCENT_DIMMER : 'transparent', borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent', transition: 'all 0.12s' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: conv.unread > 0 ? 600 : 500, color: 'var(--fg)' }}>{conv.contact}</span>
                      {conv.unread > 0 && <span style={{ width: 16, height: 16, borderRadius: '50%', background: ACCENT, color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{conv.unread}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ChannelBadge channel={conv.channel} size={11} />
                      <span style={{ fontSize: 10, color: 'var(--fg3)' }}>{conv.time}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12, color: 'var(--fg2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{conv.lastMsg}</p>
                    <ContactBadge type={conv.type} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Thread({ conv, onTakeOver }) {
  const [msg, setMsg] = useState2('');
  const [controlled, setControlled] = useState2(false);
  const [suggestions] = useState2(['Bien reçu, je reviens vers vous rapidement.', 'Je vous propose un créneau demain à 10h.', 'Votre ticket a bien été créé, nous intervenons sous 24h.']);
  const [showSugg, setShowSugg] = useState2(false);
  const bottomRef = useRef2();
  useEffect2(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conv]);

  if (!conv) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg3)', flexDirection: 'column', gap: 12 }}>
      <Icons.Inbox2 size={32} style={{ opacity: 0.3 }} />
      <span style={{ fontSize: 14 }}>Sélectionnez une conversation</span>
    </div>
  );

  const isAiManaged = conv.aiHandled && !controlled;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Thread header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
            {conv.contact[0]}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{conv.contact}</div>
            <div style={{ display: 'flex', align: 'center', gap: 6 }}>
              <ContactBadge type={conv.type} />
              {conv.property && <span style={{ fontSize: 11, color: 'var(--fg3)' }}>{conv.property}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAiManaged ? (
            <button onClick={() => { setControlled(true); onTakeOver?.(conv.id); }}
              style={{ background: ACCENT, color: 'white', border: 'none', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icons.User size={12} /> Prendre la main
            </button>
          ) : (
            <button onClick={() => setControlled(false)}
              style={{ background: 'var(--bg)', color: 'var(--fg2)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icons.Bot size={12} /> Rendre à l'IA
            </button>
          )}
        </div>
      </div>

      {/* AI banner */}
      {isAiManaged && (
        <div style={{ background: ACCENT_DIMMER, borderBottom: '1px solid var(--border)', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.Bot size={13} style={{ color: ACCENT }} />
          <span style={{ fontSize: 12, color: 'var(--fg2)' }}>L'IA gère cette conversation. <strong>Cliquez "Prendre la main"</strong> pour intervenir manuellement.</span>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {conv.messages.map(m => {
          const isAI = m.from === 'ai';
          const isContact = m.from === 'contact';
          // Contact (external) = left, AI/operator (us) = right
          const isRight = isAI;
          return (
            <div key={m.id} style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: isRight ? 'flex-end' : 'flex-start' }}>
              {isAI && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  {m.aiAction && <span style={{ fontSize: 10, color: 'var(--fg3)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 100 }}>
                    {m.aiAction === 'ticket_created' ? `→ Ticket ${m.ticketId}` : m.aiAction === 'escalade' ? '→ Escalade' : m.aiAction === 'call_transcribed' ? '→ Transcription' : m.aiAction === 'document_sent' ? '→ Doc envoyé' : ''}
                  </span>}
                  <span style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>Agent IA</span>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Bot size={10} style={{ color: 'white' }} />
                  </div>
                </div>
              )}
              {isContact && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <ChannelBadge channel={m.channel || conv.channel} size={11} />
                  <span style={{ fontSize: 11, color: 'var(--fg3)' }}>{m.time}</span>
                </div>
              )}
              {m.typing ? (
                <div style={{ background: ACCENT_DIMMER, border: `1px solid oklch(0.85 0.08 320)`, borderRadius: '12px 12px 2px 12px', padding: '8px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, animation: `pulse 1.4s ${i * 0.2}s infinite` }} />)}
                  <span style={{ fontSize: 12, color: ACCENT, marginLeft: 4 }}>L'IA est en train d'écrire…</span>
                </div>
              ) : (
                <div style={{
                  maxWidth: '75%', padding: '9px 13px',
                  borderRadius: isRight ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: isRight ? ACCENT_DIM : 'var(--bg)',
                  color: 'var(--fg)',
                  border: `1px solid ${isRight ? 'oklch(0.82 0.1 320)' : 'var(--border)'}`,
                  fontSize: 13, lineHeight: 1.55,
                }}>
                  {m.text}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', background: 'var(--surface)', flexShrink: 0 }}>
        {showSugg && (
          <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { setMsg(s); setShowSugg(false); }}
                style={{ fontSize: 12, padding: '5px 10px', border: `1px solid oklch(0.85 0.08 320)`, borderRadius: 100, background: ACCENT_DIMMER, color: 'var(--fg)', cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder={controlled ? 'Répondre manuellement…' : 'L\'IA gère les réponses — prenez la main pour intervenir'}
            disabled={!controlled}
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, resize: 'none', height: 60, background: controlled ? 'var(--surface)' : 'var(--bg)', color: 'var(--fg)', outline: 'none' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => setShowSugg(s => !s)} title="Suggestions IA"
              style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid var(--border)', background: showSugg ? ACCENT_DIMMER : 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT }}>
              <Icons.Sparkles size={14} />
            </button>
            <button disabled={!controlled || !msg.trim()} onClick={() => setMsg('')}
              style={{ width: 34, height: 34, borderRadius: 7, border: 'none', background: msg.trim() && controlled ? ACCENT : 'var(--border)', cursor: msg && controlled ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Icons.Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactPanel({ conv }) {
  if (!conv) return <div style={{ width: 320, borderLeft: '1px solid var(--border)', background: 'var(--surface)' }} />;
  const tenant = AppData.tenants.find(t => t.nom === conv.contact);
  const relatedTickets = AppData.tickets.filter(t => t.lot === conv.lot);

  return (
    <div style={{ width: 320, borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflowY: 'auto', flexShrink: 0 }}>
      {/* Contact card */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: ACCENT }}>
            {conv.contact[0]}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{conv.contact}</div>
            <ContactBadge type={conv.type} />
          </div>
        </div>
        {tenant && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--fg3)' }}>Bien</span>
              <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{tenant.adresse}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--fg3)' }}>Loyer</span>
              <span style={{ fontWeight: 500 }}>{tenant.loyer} €/mois</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--fg3)' }}>Bail</span>
              <span style={{ fontWeight: 500 }}>{tenant.debutBail} → {tenant.finBail}</span>
            </div>
            <div style={{ padding: '10px 0 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Résumé IA</div>
              <p style={{ fontSize: 12, color: 'var(--fg2)', lineHeight: 1.6, background: ACCENT_DIMMER, padding: 10, borderRadius: 8, border: `1px solid oklch(0.9 0.04 320)` }}>{tenant.resume}</p>
            </div>
          </>
        )}
      </div>

      {/* Tickets liés */}
      {relatedTickets.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tickets liés</div>
          {relatedTickets.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.urgence === 'critique' ? '#ef4444' : t.urgence === 'haute' ? '#f97316' : t.urgence === 'moyenne' ? '#eab308' : '#9a9a92', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</div>
                <div style={{ fontSize: 11, color: 'var(--fg3)' }}>{t.id} · {t.cree}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions rapides</div>
        {[
          { icon: 'Ticket', label: 'Créer un ticket' },
          { icon: 'Calendar', label: 'Programmer une visite' },
          { icon: 'FileText', label: 'Envoyer un document' },
        ].map(a => {
          const Ic = Icons[a.icon];
          return (
            <button key={a.label} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', marginBottom: 6, color: 'var(--fg)', fontSize: 13 }}>
              <Ic size={13} style={{ color: 'var(--fg3)' }} /> {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InboxPage() {
  const [selected, setSelected] = useState2(() => AppData.conversations[0]);
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <ConvList convs={AppData.conversations} selected={selected} onSelect={setSelected} />
      <Thread conv={selected} />
      <ContactPanel conv={selected} />
    </div>
  );
}

Object.assign(window, { InboxPage });
