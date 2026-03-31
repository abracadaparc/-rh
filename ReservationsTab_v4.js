/**
 * ReservationsTab v5 — AbracadaParc
 * Nouveautés v5 :
 *   - ⚡ Mode "Sur place" (walk-in) accessible à tous y compris salariés
 *   - 📝 Onglet Mémos / Leads avec brouillon Gmail pré-rempli
 *   - Convertir un mémo en réservation en 1 clic
 */

(function () {
  'use strict';

  // ─── CONSTANTES ──────────────────────────────────────────────────────────────

  const FORMULES = [
    { id: 'magique',     label: "Abracada'Niv Magique",      prix: 160, base: 8,  desc: "Entrées + décoration + bonbons" },
    { id: 'fantastique', label: "Abracada'Niv Fantastique",  prix: 176, base: 8,  desc: "Magique + gâteau Nacima inclus" },
    { id: 'gourmand',    label: "Abracada'Niv Gourmand",     prix: 232, base: 10, desc: "Fantastique + repas inclus" },
    { id: 'classique',   label: "Abracada'Niv Classique",    prix: 250, base: 10, desc: "Formule complète standard" },
    { id: 'garden',      label: "Garden Party",              prix: 350, base: 15, desc: "Espace extérieur privatisé" },
    { id: 'night',       label: "Abracada'Night",            prix: 490, base: 20, desc: "Soirée privatisation complète" },
    { id: 'mesure',      label: "Sur mesure",                prix: 0,   base: 0,  desc: "Tarif personnalisé" },
  ];

  const SEGMENTS = [
    { id: 'anniversaire', label: '🎂 Anniversaire',       color: '#AD1457' },
    { id: 'scolaire',     label: '🏫 Scolaire',           color: '#1565C0' },
    { id: 'alsh',         label: '🏕️ ALSH / CDL',         color: '#2E7D32' },
    { id: 'privatisation',label: '🏡 Privatisation',      color: '#6A1B9A' },
    { id: 'groupe',       label: '👨‍👩‍👧 Groupe privé',       color: '#E65100' },
    { id: 'association',  label: '🌟 Association / IME',  color: '#00695C' },
    { id: 'entreprise',   label: '🏢 Entreprise / CE',    color: '#37474F' },
  ];

  const STATUTS = [
    { id: '1', label: '1 — Demande reçue',          color: '#9E9E9E', bg: '#F5F5F5' },
    { id: '2', label: '2 — Devis envoyé',            color: '#1565C0', bg: '#E3F2FD' },
    { id: '3', label: '3 — Devis signé · Attente BC',color: '#E65100', bg: '#FFF3E0' },
    { id: '4', label: '4 — Confirmé · BC reçu',      color: '#2E7D32', bg: '#E8F5E9' },
    { id: '5', label: '5 — Visite · Facturation',    color: '#6A1B9A', bg: '#F3E5F5' },
    { id: '6', label: '6 — Chorus Pro déposé ✓',     color: '#1B5E20', bg: '#C8E6C9' },
  ];

  const NACIMA_TEL = '06 19 30 06 39';

  // ─── ÉTAT INTERNE ────────────────────────────────────────────────────────────

  let state = {
    reservations: {},
    memos: {},
    gateaux: {},
    view: 'liste',         // liste | calendrier | gateaux | memos
    segmentFilter: 'tous',
    statutFilter: 'tous',
    showForm: false,
    editId: null,
    walkin: false,         // ⚡ mode sur place
    showMemoForm: false,
    editMemoId: null,
    formData: {},
    memoData: {},
    alertsShown: false,
  };

  // ─── FIREBASE ────────────────────────────────────────────────────────────────

  function save(path, data) {
    try { if (typeof fbSave === 'function') fbSave(path, JSON.stringify(data)); } catch (e) {}
    try { localStorage.setItem('abr_' + path, JSON.stringify(data)); } catch (e) {}
  }

  function load(path, fallback) {
    try {
      const s = localStorage.getItem('abr_' + path);
      return s ? JSON.parse(s) : fallback;
    } catch (e) { return fallback; }
  }

  function listen(path, cb) {
    try {
      if (typeof fbListen === 'function') {
        fbListen(path, (raw) => {
          try { cb(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (e) {}
        });
      }
    } catch (e) {}
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function nowTime() {
    const d = new Date();
    const h = d.getHours();
    const hNext = h < 23 ? h + 1 : 23;
    return String(hNext).padStart(2, '0') + ':00';
  }
  function fmtDate(s) {
    if (!s) return '—';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  function fmtDateShort(s) {
    if (!s) return '—';
    const d = new Date(s + 'T12:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function getStatut(id) { return STATUTS.find(s => s.id === id) || STATUTS[0]; }
  function getSegment(id) { return SEGMENTS.find(s => s.id === id) || SEGMENTS[0]; }
  function getFormule(id) { return FORMULES.find(f => f.id === id); }

  function calcTotal(r) {
    if (r.segment !== 'anniversaire') return parseFloat(r.montant_total) || 0;
    const f = getFormule(r.formule_id);
    if (!f || f.prix === 0) return parseFloat(r.montant_total) || 0;
    const base = f.prix;
    const supEnf = Math.max(0, (parseInt(r.effectif_enfants) || 0) - f.base) * 26;
    const adultes = (parseInt(r.effectif_adultes) || 0) * 10;
    const animateur = r.option_animateur ? 100 : 0;
    const gateau = r.gateau_nacima ? (parseFloat(r.gateau_prix) || 25.90) : 0;
    return base + supEnf + adultes + animateur + gateau;
  }

  function sortedReservations() {
    return Object.values(state.reservations).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  function filteredReservations() {
    return sortedReservations().filter(r => {
      if (state.segmentFilter !== 'tous' && r.segment !== state.segmentFilter) return false;
      if (state.statutFilter !== 'tous' && r.statut !== state.statutFilter) return false;
      return true;
    });
  }

  // ─── GMAIL COMPOSE URL ───────────────────────────────────────────────────────

  function openGmailDraft(to, subject, body) {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  }

  function buildEmailInfos(memo) {
    const subject = `AbracadaParc — Votre demande de renseignements`;
    const body = `Bonjour ${memo.prenom || ''} ${memo.nom || ''},

Merci de l'intérêt que vous portez à AbracadaParc !

Suite à votre demande concernant : ${memo.type_event || 'votre événement'}
Date souhaitée : ${fmtDate(memo.date_souhaitee) || 'à définir'}
Nombre de personnes : ${memo.nb_personnes || 'à préciser'}

Nous serions ravis de vous accueillir à Goussainville pour cet événement.

${memo.type_event === 'anniversaire' ? `Nos formules anniversaire démarrent à 160 € pour 8 enfants et incluent décoration, bonbons et animation. Voici le lien de réservation en ligne : https://abracadaparc.fr/anniversaire` : `Pour toute privatisation ou réservation de groupe, nous vous invitons à nous contacter directement afin d'établir un devis personnalisé.`}

N'hésitez pas à nous appeler au 06 64 03 56 73 ou à répondre à cet email.

À très bientôt à AbracadaParc !

Vanessa Schweitzer
Fondatrice & Dirigeante — AbracadaParc
contact@abracadaparc.fr | 06 64 03 56 73
abracadaparc.fr`;
    return { subject, body };
  }

  function buildEmailDevis(memo) {
    const f = FORMULES[1]; // Fantastique par défaut
    const subject = `AbracadaParc — Devis ${memo.type_event || 'événement'} · ${memo.nom || ''}`;
    const body = `Bonjour ${memo.prenom || ''} ${memo.nom || ''},

Suite à votre passage au parc, veuillez trouver ci-après notre proposition pour votre ${memo.type_event || 'événement'}.

📅 Date souhaitée : ${fmtDate(memo.date_souhaitee) || 'à définir'}
👥 Nombre de personnes : ${memo.nb_personnes || 'à préciser'}
📌 Type d'événement : ${memo.type_event || ''}

--- DEVIS ---
[À compléter selon la formule choisie]

Pour valider votre réservation, un acompte de 100 € est demandé.

Je reste disponible pour toute question au 06 64 03 56 73.

À très bientôt,

Vanessa Schweitzer
AbracadaParc · Goussainville (95)
contact@abracadaparc.fr`;
    return { subject, body };
  }

  // ─── ALERTES GÂTEAUX ─────────────────────────────────────────────────────────

  function getGateauxAlertes() {
    const alertes = [];
    const todayStr = today();
    Object.values(state.reservations).forEach(r => {
      if (!r.gateau_nacima || !r.date) return;
      const dateVisite = new Date(r.date + 'T12:00');
      const diffJ = Math.round((dateVisite - new Date(todayStr + 'T12:00')) / 86400000);
      if (diffJ <= 10 && diffJ >= 0) {
        alertes.push({ r, diffJ, urgent: diffJ <= 7 });
      }
    });
    return alertes.sort((a, b) => a.diffJ - b.diffJ);
  }

  // ─── RENDU PRINCIPAL ─────────────────────────────────────────────────────────

  function render() {
    const el = document.getElementById('tab-reservations');
    if (!el) return;
    el.innerHTML = buildHTML();
    bindEvents();
  }

  function buildHTML() {
    const alertes = getGateauxAlertes();
    const memos = Object.values(state.memos).filter(m => !m.converted);
    return `
<div id="res-root" style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#212121;">

  ${/* ALERTES GÂTEAUX */ alertes.length ? `
  <div style="background:#FBE9E7;border:2px solid #FFAB91;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;gap:10px;align-items:flex-start;">
    <span style="font-size:22px;flex-shrink:0;">🎂</span>
    <div style="flex:1;">
      <div style="font-size:13px;font-weight:800;color:#BF360C;margin-bottom:6px;">Commandes gâteaux à passer — ${NACIMA_TEL}</div>
      ${alertes.map(a => `
      <div style="font-size:12px;color:${a.urgent ? '#C62828' : '#E65100'};margin-bottom:2px;">
        ${a.urgent ? '🔴' : '🟡'} <strong>${a.r.prenom_enfant || a.r.nom_contact || 'Réservation'}</strong> · ${fmtDate(a.r.date)} · J-${a.diffJ}
        · ${a.r.gateau_type || 'gâteau'} ${a.r.gateau_inscription ? `"${esc(a.r.gateau_inscription)}"` : ''}
      </div>`).join('')}
    </div>
    <a href="tel:${NACIMA_TEL.replace(/ /g,'')}" style="background:#C62828;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;text-decoration:none;flex-shrink:0;cursor:pointer;">
      📞 Nacima
    </a>
  </div>` : ''}

  ${/* ONGLETS DE VUE */`
  <div style="display:flex;gap:0;border-bottom:2px solid #E8F5E9;margin-bottom:16px;overflow-x:auto;">
    ${[
      ['liste','📋 Liste'],
      ['calendrier','📅 Calendrier'],
      ['gateaux','🎂 Gâteaux'],
      ['memos',`📝 Mémos${memos.length ? ` <span style="background:#E53935;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;">${memos.length}</span>` : ''}`],
    ].map(([v, l]) => `
    <button data-view="${v}" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:12px;white-space:nowrap;font-weight:${state.view===v?700:400};color:${state.view===v?'#2E7D32':'#9E9E9E'};border-bottom:${state.view===v?'2.5px solid #2E7D32':'2.5px solid transparent'};margin-bottom:-2px;">${l}</button>
    `).join('')}
    <div style="flex:1;"></div>
    <button id="btn-new-res" style="margin:4px 8px;padding:7px 14px;background:#2E7D32;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">+ Réservation</button>
    <button id="btn-walkin" style="margin:4px 8px;padding:7px 14px;background:#E65100;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">⚡ Sur place</button>
    <button id="btn-new-memo" style="margin:4px 8px;padding:7px 14px;background:#1565C0;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">📝 Mémo</button>
  </div>`}

  ${/* CONTENU SELON VUE */
    state.view === 'liste'      ? buildListeView() :
    state.view === 'calendrier' ? buildCalView() :
    state.view === 'gateaux'    ? buildGateauxView() :
    state.view === 'memos'      ? buildMemosView() : ''}

  ${/* MODAL RÉSERVATION */ state.showForm ? buildFormModal() : ''}
  ${/* MODAL MÉMO */ state.showMemoForm ? buildMemoModal() : ''}

</div>`;
  }

  // ─── VUE LISTE ────────────────────────────────────────────────────────────────

  function buildListeView() {
    const list = filteredReservations();
    return `
<div>
  <!-- Filtres -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
    <select id="flt-segment" style="padding:6px 10px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:12px;font-family:inherit;color:#2E7D32;background:#fff;">
      <option value="tous">Tous segments</option>
      ${SEGMENTS.map(s => `<option value="${s.id}" ${state.segmentFilter===s.id?'selected':''}>${s.label}</option>`).join('')}
    </select>
    <select id="flt-statut" style="padding:6px 10px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:12px;font-family:inherit;color:#2E7D32;background:#fff;">
      <option value="tous">Tous statuts</option>
      ${STATUTS.map(s => `<option value="${s.id}" ${state.statutFilter===s.id?'selected':''}>${s.label}</option>`).join('')}
    </select>
    <div style="margin-left:auto;font-size:11px;color:#9E9E9E;align-self:center;">${list.length} réservation${list.length>1?'s':''}</div>
  </div>

  <!-- Stats rapides -->
  ${buildStats()}

  <!-- Liste -->
  <div style="display:flex;flex-direction:column;gap:8px;">
    ${list.length === 0 ? '<div style="text-align:center;padding:40px;color:#9E9E9E;font-size:13px;">Aucune réservation — cliquez sur + Réservation ou ⚡ Sur place</div>' :
      list.map(r => buildReservationCard(r)).join('')}
  </div>
</div>`;
  }

  function buildStats() {
    const all = Object.values(state.reservations);
    const ca = all.reduce((s, r) => s + calcTotal(r), 0);
    const soldes = all.filter(r => r.statut !== '6').reduce((s, r) => {
      const t = calcTotal(r); const a = parseFloat(r.acompte_paye) || 0;
      return s + Math.max(0, t - a);
    }, 0);
    const walkins = all.filter(r => r.walkin).length;
    return `
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:14px;">
  ${[
    ['Total réservations', all.length, '#2E7D32', '#E8F5E9'],
    ['CA total estimé', ca.toLocaleString('fr') + ' €', '#1565C0', '#E3F2FD'],
    ['Soldes dus', soldes.toLocaleString('fr') + ' €', soldes > 0 ? '#C62828' : '#2E7D32', soldes > 0 ? '#FFEBEE' : '#E8F5E9'],
    ['Walk-ins sur place', walkins, '#E65100', '#FFF3E0'],
  ].map(([l, v, c, bg]) => `
  <div style="background:${bg};border-radius:10px;padding:10px 12px;text-align:center;">
    <div style="font-size:18px;font-weight:800;color:${c};">${v}</div>
    <div style="font-size:10px;color:${c};opacity:0.8;margin-top:2px;">${l}</div>
  </div>`).join('')}
</div>`;
  }

  function buildReservationCard(r) {
    const st = getStatut(r.statut || '1');
    const seg = getSegment(r.segment);
    const total = calcTotal(r);
    const acompte = parseFloat(r.acompte_paye) || 0;
    const solde = Math.max(0, total - acompte);
    return `
<div style="background:#fff;border:1px solid #E8F5E9;border-radius:12px;padding:14px 16px;border-left:4px solid ${seg.color};">
  <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
    <div style="flex:1;min-width:200px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
        <span style="font-size:13px;font-weight:800;color:#212121;">
          ${esc(r.prenom_enfant || r.nom_contact || r.ref || '—')}
          ${r.nom_contact && r.prenom_enfant ? `<span style="font-weight:400;color:#9E9E9E;">· ${esc(r.nom_contact)}</span>` : ''}
        </span>
        <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${seg.color}18;color:${seg.color};">${seg.label}</span>
        ${r.walkin ? '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:#FFF3E0;color:#E65100;">⚡ Sur place</span>' : ''}
      </div>
      <div style="font-size:12px;color:#616161;">
        📅 ${fmtDate(r.date)} ${r.heure_debut ? `· ${r.heure_debut}–${r.heure_fin || ''}` : ''}
        ${r.effectif_total ? `· 👥 ${r.effectif_total} pers.` : ''}
        ${r.formule_id ? `· ${getFormule(r.formule_id)?.label || ''}` : ''}
      </div>
      ${r.notes ? `<div style="font-size:11px;color:#9E9E9E;margin-top:4px;font-style:italic;">💬 ${esc(r.notes.slice(0,80))}${r.notes.length>80?'…':''}</div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
      <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:${st.bg};color:${st.color};">${st.label}</span>
      ${total > 0 ? `
      <div style="text-align:right;">
        <div style="font-size:13px;font-weight:800;color:#1B5E20;">${total.toLocaleString('fr')} €</div>
        ${acompte > 0 ? `<div style="font-size:10px;color:#9E9E9E;">Acompte : ${acompte.toLocaleString('fr')} €</div>` : ''}
        ${solde > 0 ? `<div style="font-size:11px;font-weight:700;color:#C62828;">Solde : ${solde.toLocaleString('fr')} €</div>` : `<div style="font-size:10px;color:#2E7D32;">✅ Réglé</div>`}
      </div>` : ''}
      <div style="display:flex;gap:4px;">
        ${r.statut !== '6' ? `
        <button data-advance="${r.id}" style="padding:4px 8px;background:#E8F5E9;color:#2E7D32;border:1px solid #C8E6C9;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;">Avancer →</button>` : ''}
        <button data-edit="${r.id}" style="padding:4px 8px;background:#F5F5F5;color:#424242;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-family:inherit;">✏️</button>
        <button data-delete="${r.id}" style="padding:4px 8px;background:#FFEBEE;color:#C62828;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-family:inherit;">🗑</button>
      </div>
    </div>
  </div>
</div>`;
  }

  // ─── VUE CALENDRIER ──────────────────────────────────────────────────────────

  function buildCalView() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nomsMois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const byDay = {};
    Object.values(state.reservations).forEach(r => {
      if (r.date) { if (!byDay[r.date]) byDay[r.date] = []; byDay[r.date].push(r); }
    });
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    let cells = '';
    for (let i = 0; i < offset; i++) cells += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const items = byDay[ds] || [];
      const isToday = ds === today();
      cells += `
<div style="min-height:70px;border:1px solid #E8F5E9;border-radius:8px;padding:4px;background:${isToday?'#F1F8E9':'#fff'};">
  <div style="font-size:11px;font-weight:${isToday?800:400};color:${isToday?'#2E7D32':'#757575'};margin-bottom:3px;">${d}</div>
  ${items.slice(0,3).map(r => {
    const seg = getSegment(r.segment);
    return `<div style="font-size:9px;background:${seg.color}22;color:${seg.color};border-radius:3px;padding:1px 4px;margin-bottom:1px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:600;">${esc(r.prenom_enfant || r.nom_contact || '?')}</div>`;
  }).join('')}
  ${items.length > 3 ? `<div style="font-size:9px;color:#9E9E9E;">+${items.length-3}</div>` : ''}
</div>`;
    }
    return `
<div>
  <div style="text-align:center;font-size:15px;font-weight:700;color:#2E7D32;margin-bottom:12px;">${nomsMois[month]} ${year}</div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:6px;">
    ${['Lu','Ma','Me','Je','Ve','Sa','Di'].map(j => `<div style="text-align:center;font-size:10px;font-weight:700;color:#9E9E9E;">${j}</div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">${cells}</div>
</div>`;
  }

  // ─── VUE GÂTEAUX ─────────────────────────────────────────────────────────────

  function buildGateauxView() {
    const list = Object.values(state.reservations)
      .filter(r => r.gateau_nacima && r.date >= today())
      .sort((a, b) => a.date.localeCompare(b.date));
    return `
<div>
  <div style="background:#FFF3E0;border:1px solid #FFD54F;border-radius:12px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-size:13px;font-weight:700;color:#E65100;">🎂 Commandes gâteaux — Nacima</div>
      <div style="font-size:11px;color:#E65100;margin-top:2px;">J-10 orange · J-7 rouge · Commander dès J-10</div>
    </div>
    <a href="tel:${NACIMA_TEL.replace(/ /g,'')}" style="background:#E65100;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">📞 ${NACIMA_TEL}</a>
  </div>
  ${list.length === 0 ? '<div style="text-align:center;padding:40px;color:#9E9E9E;font-size:13px;">Aucune commande gâteau à venir</div>' : `
  <table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:#F1F8E9;border-bottom:2px solid #C8E6C9;">
      ${['Date visite','Enfant','Gâteau','Inscription','Allergies','J-?','Statut'].map(h => `<th style="padding:8px 10px;font-size:11px;text-align:left;color:#558B2F;font-weight:700;">${h}</th>`).join('')}
    </tr></thead>
    <tbody>
    ${list.map(r => {
      const dateVisite = new Date(r.date + 'T12:00');
      const diffJ = Math.round((dateVisite - new Date(today() + 'T12:00')) / 86400000);
      const urgColor = diffJ <= 7 ? '#C62828' : diffJ <= 10 ? '#E65100' : '#2E7D32';
      return `
<tr style="border-bottom:1px solid #F5F5F5;">
  <td style="padding:8px 10px;font-size:12px;font-weight:700;">${fmtDate(r.date)}</td>
  <td style="padding:8px 10px;font-size:12px;">${esc(r.prenom_enfant || r.nom_contact || '—')}</td>
  <td style="padding:8px 10px;font-size:12px;">${esc(r.gateau_type || '—')}</td>
  <td style="padding:8px 10px;font-size:12px;">${esc(r.gateau_inscription || '—')}</td>
  <td style="padding:8px 10px;font-size:11px;color:#C62828;">${esc(r.gateau_allergies || '✅ aucune')}</td>
  <td style="padding:8px 10px;"><span style="font-weight:800;color:${urgColor};">J-${diffJ}</span></td>
  <td style="padding:8px 10px;">
    <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${r.gateau_commande ? '#E8F5E9' : '#FFF3E0'};color:${r.gateau_commande ? '#1B5E20' : '#E65100'};font-weight:700;">
      ${r.gateau_commande ? '✅ Commandé' : '⏳ À commander'}
    </span>
  </td>
</tr>`;
    }).join('')}
    </tbody>
  </table>`}
</div>`;
  }

  // ─── VUE MÉMOS ───────────────────────────────────────────────────────────────

  function buildMemosView() {
    const list = Object.values(state.memos).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const actifs = list.filter(m => !m.converted);
    const convertis = list.filter(m => m.converted);
    return `
<div>
  <div style="background:#E3F2FD;border:1px solid #90CAF9;border-radius:12px;padding:12px 16px;margin-bottom:14px;font-size:12px;color:#1565C0;line-height:1.7;">
    📝 <strong>Mémos leads</strong> — Notez rapidement les coordonnées d'une personne intéressée au parc.<br/>
    Envoyez un brouillon Gmail en 1 clic · Convertissez en réservation dès que confirmé.
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <span style="font-size:14px;font-weight:700;color:#1565C0;">${actifs.length} mémo${actifs.length>1?'s':''} actif${actifs.length>1?'s':''}</span>
    <button id="btn-new-memo-2" style="padding:7px 14px;background:#1565C0;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">+ Nouveau mémo</button>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
    ${actifs.length === 0 ? '<div style="text-align:center;padding:30px;color:#9E9E9E;font-size:13px;">Aucun mémo actif — cliquez sur 📝 Mémo pour noter un contact</div>' :
      actifs.map(m => buildMemoCard(m)).join('')}
  </div>

  ${convertis.length > 0 ? `
  <div style="font-size:11px;font-weight:700;color:#9E9E9E;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">✅ Convertis en réservation (${convertis.length})</div>
  <div style="display:flex;flex-direction:column;gap:4px;opacity:0.6;">
    ${convertis.map(m => `
    <div style="background:#F5F5F5;border-radius:8px;padding:8px 12px;font-size:12px;color:#9E9E9E;text-decoration:line-through;">
      ${esc(m.prenom || '')} ${esc(m.nom || '')} · ${m.type_event || ''} · ${fmtDate(m.date_souhaitee)}
    </div>`).join('')}
  </div>` : ''}
</div>`;
  }

  function buildMemoCard(m) {
    return `
<div style="background:#fff;border:1.5px solid #90CAF9;border-radius:12px;padding:14px 16px;">
  <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
    <div style="flex:1;min-width:180px;">
      <div style="font-size:14px;font-weight:800;color:#1565C0;margin-bottom:4px;">
        ${esc(m.prenom || '')} ${esc(m.nom || '')}
        ${m.walkin ? '<span style="font-size:10px;background:#FFF3E0;color:#E65100;padding:2px 7px;border-radius:20px;font-weight:700;margin-left:6px;">⚡ Sur place</span>' : ''}
      </div>
      <div style="font-size:12px;color:#424242;line-height:1.8;">
        ${m.tel ? `📞 <a href="tel:${m.tel.replace(/ /g,'')}" style="color:#1565C0;text-decoration:none;">${esc(m.tel)}</a> · ` : ''}
        ${m.email ? `📧 ${esc(m.email)}<br/>` : ''}
        ${m.type_event ? `🎯 ${esc(m.type_event)}` : ''} ${m.date_souhaitee ? `· 📅 ${fmtDate(m.date_souhaitee)}` : ''} ${m.nb_personnes ? `· 👥 ${m.nb_personnes} pers.` : ''}
      </div>
      ${m.note ? `<div style="font-size:11px;color:#757575;margin-top:6px;background:#F5F5F5;padding:5px 8px;border-radius:6px;font-style:italic;">💬 ${esc(m.note)}</div>` : ''}
      <div style="font-size:10px;color:#BDBDBD;margin-top:4px;">Noté le ${m.created_at ? fmtDate(m.created_at.slice(0,10)) : '—'}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
      ${m.email ? `
      <button data-gmail-infos="${m.id}" style="padding:6px 10px;background:#E3F2FD;color:#1565C0;border:1px solid #90CAF9;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;white-space:nowrap;">📧 Infos par Gmail</button>
      <button data-gmail-devis="${m.id}" style="padding:6px 10px;background:#E8F5E9;color:#2E7D32;border:1px solid #C8E6C9;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;white-space:nowrap;">📋 Devis par Gmail</button>` : `
      <div style="font-size:10px;color:#9E9E9E;padding:4px;">Email non renseigné</div>`}
      <button data-convert-memo="${m.id}" style="padding:6px 10px;background:#2E7D32;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;white-space:nowrap;">➕ Créer réservation</button>
      <button data-edit-memo="${m.id}" style="padding:4px 8px;background:#F5F5F5;color:#424242;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-family:inherit;">✏️ Modifier</button>
      <button data-delete-memo="${m.id}" style="padding:4px 8px;background:#FFEBEE;color:#C62828;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-family:inherit;">🗑 Supprimer</button>
    </div>
  </div>
</div>`;
  }

  // ─── MODAL RÉSERVATION ───────────────────────────────────────────────────────

  function buildFormModal() {
    const d = state.formData;
    const isEdit = !!state.editId;
    const isWalkin = state.walkin && !isEdit;
    const seg = d.segment || 'anniversaire';
    const isAnniv = seg === 'anniversaire';
    const formule = d.formule_id ? getFormule(d.formule_id) : null;
    const total = isAnniv && formule ? calcTotal(d) : (parseFloat(d.montant_total) || 0);

    return `
<div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px 16px;overflow-y:auto;">
<div style="background:#fff;border-radius:16px;padding:24px 28px;width:100%;max-width:640px;box-shadow:0 20px 60px rgba(0,0,0,0.25);">

  <!-- En-tête -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
    <div>
      <div style="font-size:16px;font-weight:800;color:#1B5E20;">
        ${isWalkin ? '⚡ Réservation sur place' : isEdit ? '✏️ Modifier la réservation' : '+ Nouvelle réservation'}
      </div>
      ${isWalkin ? '<div style="font-size:11px;color:#E65100;margin-top:2px;">Mode walk-in · Date et heure pré-remplies</div>' : ''}
    </div>
    <button id="close-form" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9E9E9E;line-height:1;padding:0;">×</button>
  </div>

  <!-- Segment -->
  <div style="margin-bottom:14px;">
    <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Type d'événement</label>
    <div style="display:flex;flex-wrap:wrap;gap:5px;">
      ${SEGMENTS.map(s => `
      <button data-seg="${s.id}" style="padding:5px 10px;border-radius:20px;border:1.5px solid ${d.segment===s.id?s.color:'#E0E0E0'};background:${d.segment===s.id?s.color+'18':'#fff'};color:${d.segment===s.id?s.color:'#757575'};font-size:11px;font-weight:${d.segment===s.id?700:400};cursor:pointer;font-family:inherit;">${s.label}</button>
      `).join('')}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <!-- Contact -->
    <div>
      <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Nom contact *</label>
      <input id="f-nom" value="${esc(d.nom_contact||'')}" placeholder="Dupont Marie" style="width:100%;padding:8px 10px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <div>
      <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Téléphone</label>
      <input id="f-tel" type="tel" value="${esc(d.tel||'')}" placeholder="06 XX XX XX XX" style="width:100%;padding:8px 10px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <!-- Date / heure -->
    <div>
      <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Date *</label>
      <input id="f-date" type="date" value="${d.date||''}" style="width:100%;padding:8px 10px;border:1.5px solid ${isWalkin?'#E65100':'#C8E6C9'};border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div>
        <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Début</label>
        <input id="f-hdeb" type="time" value="${d.heure_debut||''}" style="width:100%;padding:8px 6px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
      </div>
      <div>
        <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Fin</label>
        <input id="f-hfin" type="time" value="${d.heure_fin||''}" style="width:100%;padding:8px 6px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
      </div>
    </div>
  </div>

  ${isAnniv ? buildAnnivFields(d) : buildGroupeFields(d)}

  <!-- Paiement -->
  <div style="background:#F1F8E9;border-radius:10px;padding:12px 14px;margin-bottom:14px;">
    <div style="font-size:12px;font-weight:700;color:#2E7D32;margin-bottom:10px;">💶 Paiement</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
      <div>
        <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:3px;">Total (€)</label>
        <input id="f-total" type="number" value="${total||''}" placeholder="${total||'0'}" style="width:100%;padding:6px 8px;border:1.5px solid #C8E6C9;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;font-weight:700;color:#1B5E20;" />
      </div>
      <div>
        <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:3px;">Acompte payé (€)</label>
        <input id="f-acompte" type="number" value="${d.acompte_paye||''}" placeholder="100" style="width:100%;padding:6px 8px;border:1.5px solid #C8E6C9;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
      </div>
      <div>
        <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:3px;">Mode acompte</label>
        <select id="f-mode" style="width:100%;padding:6px 8px;border:1.5px solid #C8E6C9;border-radius:6px;font-size:12px;font-family:inherit;outline:none;">
          ${['Carte','Virement','Chèque','Espèces','En ligne'].map(m => `<option ${d.mode_paiement===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>
    ${isWalkin ? `
    <div style="margin-top:10px;padding:8px 10px;background:#FFF3E0;border-radius:8px;font-size:11px;color:#E65100;font-weight:600;">
      ⚡ Paiement sur place — vérifier que le règlement est bien encaissé avant validation
    </div>` : ''}
  </div>

  <!-- Statut -->
  <div style="margin-bottom:14px;">
    <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Statut pipeline</label>
    <select id="f-statut" style="width:100%;padding:8px 10px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:13px;font-family:inherit;outline:none;">
      ${STATUTS.map(s => `<option value="${s.id}" ${(d.statut||'1')===s.id?'selected':''}>${s.label}</option>`).join('')}
    </select>
  </div>

  <!-- Notes -->
  <div style="margin-bottom:18px;">
    <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Notes</label>
    <textarea id="f-notes" placeholder="Informations complémentaires, demandes spéciales…" style="width:100%;padding:8px 10px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;resize:vertical;height:60px;">${esc(d.notes||'')}</textarea>
  </div>

  <div style="display:flex;gap:8px;">
    <button id="save-form" style="flex:1;padding:12px;background:#2E7D32;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;">
      ${isWalkin ? '⚡ Valider sur place' : isEdit ? '✅ Enregistrer' : '+ Créer la réservation'}
    </button>
    <button id="close-form-2" style="padding:12px 18px;background:#F1F8E9;color:#2E7D32;border:1px solid #C8E6C9;border-radius:10px;cursor:pointer;font-size:13px;font-family:inherit;">Annuler</button>
  </div>

</div>
</div>`;
  }

  function buildAnnivFields(d) {
    return `
<div style="background:#F9F9F9;border-radius:10px;padding:12px 14px;margin-bottom:12px;">
  <div style="font-size:12px;font-weight:700;color:#AD1457;margin-bottom:10px;">🎂 Infos anniversaire</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
    <div>
      <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:3px;">Prénom enfant</label>
      <input id="f-prenom" value="${esc(d.prenom_enfant||'')}" style="width:100%;padding:6px 8px;border:1.5px solid #C8E6C9;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <div>
      <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:3px;">Âge</label>
      <input id="f-age" type="number" value="${d.age_enfant||''}" style="width:100%;padding:6px 8px;border:1.5px solid #C8E6C9;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <div>
      <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:3px;">Nb enfants</label>
      <input id="f-enf" type="number" value="${d.effectif_enfants||''}" style="width:100%;padding:6px 8px;border:1.5px solid #C8E6C9;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
  </div>
  <div style="margin-bottom:10px;">
    <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:5px;">Formule</label>
    <div style="display:flex;flex-wrap:wrap;gap:5px;">
      ${FORMULES.map(f => `
      <button data-formule="${f.id}" style="padding:5px 10px;border-radius:8px;border:1.5px solid ${d.formule_id===f.id?'#AD1457':'#E0E0E0'};background:${d.formule_id===f.id?'#FCE4EC':'#fff'};color:${d.formule_id===f.id?'#AD1457':'#757575'};font-size:11px;font-weight:${d.formule_id===f.id?700:400};cursor:pointer;font-family:inherit;">
        ${f.label}${f.prix ? ` · ${f.prix}€` : ''}
      </button>`).join('')}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
    <div>
      <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:3px;">Gâteau Nacima</label>
      <select id="f-gateau" style="width:100%;padding:6px 8px;border:1.5px solid #C8E6C9;border-radius:6px;font-size:12px;font-family:inherit;outline:none;">
        <option value="0" ${!d.gateau_nacima?'selected':''}>Famille apporte</option>
        <option value="1" ${d.gateau_nacima?'selected':''}>Commande Nacima</option>
      </select>
    </div>
    <div>
      <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:3px;">Type gâteau</label>
      <input id="f-gateau-type" value="${esc(d.gateau_type||'')}" placeholder="Moelleux chocolat" style="width:100%;padding:6px 8px;border:1.5px solid #C8E6C9;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <div>
      <label style="display:block;font-size:10px;font-weight:700;color:#558B2F;text-transform:uppercase;margin-bottom:3px;">Inscription</label>
      <input id="f-gateau-insc" value="${esc(d.gateau_inscription||'')}" placeholder="Joyeux anniversaire…" style="width:100%;padding:6px 8px;border:1.5px solid #C8E6C9;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
  </div>
  <div style="margin-top:8px;">
    <label style="display:block;font-size:10px;font-weight:700;color:#C62828;text-transform:uppercase;margin-bottom:3px;">Allergies ⚠️</label>
    <input id="f-allergies" value="${esc(d.gateau_allergies||'')}" placeholder="Aucune / gluten / fruits à coque…" style="width:100%;padding:6px 8px;border:1.5px solid #FFCDD2;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
  </div>
</div>`;
  }

  function buildGroupeFields(d) {
    return `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
  <div>
    <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Établissement / Organisation</label>
    <input id="f-org" value="${esc(d.organisation||'')}" placeholder="École Jean Moulin, ALSH…" style="width:100%;padding:8px 10px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
  </div>
  <div>
    <label style="display:block;font-size:11px;font-weight:700;color:#558B2F;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Effectif total</label>
    <input id="f-eff" type="number" value="${d.effectif_total||''}" placeholder="25" style="width:100%;padding:8px 10px;border:1.5px solid #C8E6C9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
  </div>
</div>`;
  }

  // ─── MODAL MÉMO ──────────────────────────────────────────────────────────────

  function buildMemoModal() {
    const d = state.memoData;
    const isEdit = !!state.editMemoId;
    return `
<div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;">
<div style="background:#fff;border-radius:16px;padding:24px 28px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;">

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
    <div>
      <div style="font-size:16px;font-weight:800;color:#1565C0;">📝 ${isEdit ? 'Modifier le mémo' : 'Nouveau mémo lead'}</div>
      <div style="font-size:11px;color:#9E9E9E;margin-top:2px;">Notez les coordonnées d'un visiteur intéressé</div>
    </div>
    <button id="close-memo" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9E9E9E;line-height:1;padding:0;">×</button>
  </div>

  ${d.walkin ? '<div style="background:#FFF3E0;border:1px solid #FFD54F;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#E65100;font-weight:600;">⚡ Mémo sur place — contact rencontré au parc aujourd\'hui</div>' : ''}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div>
      <label style="display:block;font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Prénom</label>
      <input id="m-prenom" value="${esc(d.prenom||'')}" placeholder="Marie" style="width:100%;padding:8px 10px;border:1.5px solid #90CAF9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <div>
      <label style="display:block;font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Nom *</label>
      <input id="m-nom" value="${esc(d.nom||'')}" placeholder="Dupont" style="width:100%;padding:8px 10px;border:1.5px solid #90CAF9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <div>
      <label style="display:block;font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Téléphone</label>
      <input id="m-tel" type="tel" value="${esc(d.tel||'')}" placeholder="06 XX XX XX XX" style="width:100%;padding:8px 10px;border:1.5px solid #90CAF9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <div>
      <label style="display:block;font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Email</label>
      <input id="m-email" type="email" value="${esc(d.email||'')}" placeholder="marie@email.fr" style="width:100%;padding:8px 10px;border:1.5px solid #90CAF9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
  </div>

  <div style="margin-bottom:12px;">
    <label style="display:block;font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Type d'événement</label>
    <div style="display:flex;flex-wrap:wrap;gap:5px;">
      ${['anniversaire','sortie scolaire','ALSH / CDL','privatisation','groupe','entreprise','autre'].map(t => `
      <button data-memo-type="${t}" style="padding:5px 10px;border-radius:20px;border:1.5px solid ${d.type_event===t?'#1565C0':'#E0E0E0'};background:${d.type_event===t?'#E3F2FD':'#fff'};color:${d.type_event===t?'#1565C0':'#757575'};font-size:11px;font-weight:${d.type_event===t?700:400};cursor:pointer;font-family:inherit;">${t}</button>
      `).join('')}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div>
      <label style="display:block;font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Date souhaitée</label>
      <input id="m-date" type="date" value="${d.date_souhaitee||''}" style="width:100%;padding:8px 10px;border:1.5px solid #90CAF9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
    <div>
      <label style="display:block;font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Nombre de personnes</label>
      <input id="m-nb" type="number" value="${d.nb_personnes||''}" placeholder="15" style="width:100%;padding:8px 10px;border:1.5px solid #90CAF9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;" />
    </div>
  </div>

  <div style="margin-bottom:18px;">
    <label style="display:block;font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Note équipe</label>
    <textarea id="m-note" placeholder="Contexte, budget évoqué, demandes particulières…" style="width:100%;padding:8px 10px;border:1.5px solid #90CAF9;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;resize:vertical;height:70px;">${esc(d.note||'')}</textarea>
  </div>

  <div style="display:flex;gap:8px;">
    <button id="save-memo" style="flex:1;padding:12px;background:#1565C0;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;">
      ${isEdit ? '✅ Enregistrer' : '📝 Créer le mémo'}
    </button>
    <button id="close-memo-2" style="padding:12px 18px;background:#E3F2FD;color:#1565C0;border:1px solid #90CAF9;border-radius:10px;cursor:pointer;font-size:13px;font-family:inherit;">Annuler</button>
  </div>

</div>
</div>`;
  }

  // ─── GESTION DES ÉVÉNEMENTS ──────────────────────────────────────────────────

  function bindEvents() {
    const el = document.getElementById('res-root');
    if (!el) return;

    el.addEventListener('click', function (e) {
      const t = e.target.closest('[data-view]');
      if (t) { state.view = t.dataset.view; render(); return; }

      if (e.target.closest('#btn-new-res')) {
        state.showForm = true; state.editId = null; state.walkin = false;
        state.formData = { segment: 'anniversaire', statut: '1', date: '' };
        render(); return;
      }
      if (e.target.closest('#btn-walkin')) {
        state.showForm = true; state.editId = null; state.walkin = true;
        state.formData = { segment: 'anniversaire', statut: '4', date: today(), heure_debut: nowTime(), walkin: true };
        render(); return;
      }
      if (e.target.closest('#btn-new-memo') || e.target.closest('#btn-new-memo-2')) {
        state.showMemoForm = true; state.editMemoId = null;
        state.memoData = {};
        render(); return;
      }

      // Walk-in memo
      const wm = e.target.closest('[data-walkin-memo]');
      if (wm) {
        state.showMemoForm = true; state.editMemoId = null;
        state.memoData = { walkin: true, created_at: new Date().toISOString() };
        render(); return;
      }

      // Segment picker in form
      const seg = e.target.closest('[data-seg]');
      if (seg) { state.formData.segment = seg.dataset.seg; state.formData.formule_id = null; render(); return; }

      // Formule picker
      const form = e.target.closest('[data-formule]');
      if (form) { state.formData.formule_id = form.dataset.formule; render(); return; }

      // Memo type picker
      const mtype = e.target.closest('[data-memo-type]');
      if (mtype) { state.memoData.type_event = mtype.dataset.memoType; render(); return; }

      // Advance statut
      const adv = e.target.closest('[data-advance]');
      if (adv) {
        const r = state.reservations[adv.dataset.advance];
        if (r) { const idx = STATUTS.findIndex(s => s.id === r.statut); if (idx < STATUTS.length - 1) r.statut = STATUTS[idx + 1].id; saveAll(); render(); } return;
      }

      // Edit reservation
      const edit = e.target.closest('[data-edit]');
      if (edit) {
        const r = state.reservations[edit.dataset.edit];
        if (r) { state.editId = r.id; state.walkin = false; state.showForm = true; state.formData = { ...r }; render(); } return;
      }

      // Delete reservation
      const del = e.target.closest('[data-delete]');
      if (del) {
        if (confirm('Supprimer cette réservation ?')) { delete state.reservations[del.dataset.delete]; saveAll(); render(); } return;
      }

      // Close form
      if (e.target.closest('#close-form') || e.target.closest('#close-form-2')) {
        state.showForm = false; render(); return;
      }

      // Save form
      if (e.target.closest('#save-form')) { saveReservation(); return; }

      // Memo actions
      const gmailI = e.target.closest('[data-gmail-infos]');
      if (gmailI) {
        const m = state.memos[gmailI.dataset.gmailInfos];
        if (m) { const {subject, body} = buildEmailInfos(m); openGmailDraft(m.email, subject, body); } return;
      }
      const gmailD = e.target.closest('[data-gmail-devis]');
      if (gmailD) {
        const m = state.memos[gmailD.dataset.gmailDevis];
        if (m) { const {subject, body} = buildEmailDevis(m); openGmailDraft(m.email, subject, body); } return;
      }
      const convMemo = e.target.closest('[data-convert-memo]');
      if (convMemo) {
        const m = state.memos[convMemo.dataset.convertMemo];
        if (m) {
          m.converted = true;
          state.formData = {
            segment: m.type_event === 'anniversaire' ? 'anniversaire' :
                     m.type_event === 'sortie scolaire' ? 'scolaire' :
                     m.type_event === 'ALSH / CDL' ? 'alsh' :
                     m.type_event === 'privatisation' ? 'privatisation' :
                     m.type_event === 'entreprise' ? 'entreprise' : 'groupe',
            statut: '1', date: m.date_souhaitee || '',
            nom_contact: (m.prenom || '') + ' ' + (m.nom || ''),
            tel: m.tel || '', effectif_total: m.nb_personnes || '',
            notes: m.note || '', organisation: '',
          };
          state.showForm = true; state.editId = null; state.walkin = false;
          saveAll(); render();
        } return;
      }
      const editMemo = e.target.closest('[data-edit-memo]');
      if (editMemo) {
        const m = state.memos[editMemo.dataset.editMemo];
        if (m) { state.editMemoId = m.id; state.showMemoForm = true; state.memoData = {...m}; render(); } return;
      }
      const delMemo = e.target.closest('[data-delete-memo]');
      if (delMemo) {
        if (confirm('Supprimer ce mémo ?')) { delete state.memos[delMemo.dataset.deleteMemo]; saveAll(); render(); } return;
      }

      // Close memo
      if (e.target.closest('#close-memo') || e.target.closest('#close-memo-2')) {
        state.showMemoForm = false; render(); return;
      }

      // Save memo
      if (e.target.closest('#save-memo')) { saveMemo(); return; }
    });

    // Filtres
    const fltSeg = el.querySelector('#flt-segment');
    if (fltSeg) fltSeg.addEventListener('change', e => { state.segmentFilter = e.target.value; render(); });
    const fltSt = el.querySelector('#flt-statut');
    if (fltSt) fltSt.addEventListener('change', e => { state.statutFilter = e.target.value; render(); });
  }

  // ─── SAUVEGARDE RÉSERVATION ──────────────────────────────────────────────────

  function saveReservation() {
    const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const d = state.formData;

    const nom = get('f-nom');
    if (!nom) { alert('Le nom du contact est requis.'); return; }

    const r = {
      id: state.editId || uid(),
      segment: d.segment || 'anniversaire',
      statut: get('f-statut') || d.statut || '1',
      nom_contact: nom,
      tel: get('f-tel'),
      date: get('f-date'),
      heure_debut: get('f-hdeb'),
      heure_fin: get('f-hfin'),
      montant_total: get('f-total'),
      acompte_paye: get('f-acompte'),
      mode_paiement: get('f-mode'),
      notes: get('f-notes'),
      walkin: d.walkin || false,
      created_at: state.editId ? (state.reservations[state.editId]?.created_at || new Date().toISOString()) : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (d.segment === 'anniversaire') {
      r.prenom_enfant = get('f-prenom');
      r.age_enfant = get('f-age');
      r.effectif_enfants = get('f-enf');
      r.formule_id = d.formule_id || '';
      r.gateau_nacima = document.getElementById('f-gateau')?.value === '1';
      r.gateau_type = get('f-gateau-type');
      r.gateau_inscription = get('f-gateau-insc');
      r.gateau_allergies = get('f-allergies');
    } else {
      r.organisation = get('f-org');
      r.effectif_total = get('f-eff');
    }

    state.reservations[r.id] = r;
    state.showForm = false;
    state.walkin = false;
    saveAll();
    render();
  }

  // ─── SAUVEGARDE MÉMO ─────────────────────────────────────────────────────────

  function saveMemo() {
    const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const d = state.memoData;

    const nom = get('m-nom');
    if (!nom) { alert('Le nom est requis.'); return; }

    const m = {
      id: state.editMemoId || uid(),
      prenom: get('m-prenom'),
      nom,
      tel: get('m-tel'),
      email: get('m-email'),
      type_event: d.type_event || '',
      date_souhaitee: get('m-date'),
      nb_personnes: get('m-nb'),
      note: get('m-note'),
      walkin: d.walkin || false,
      converted: false,
      created_at: state.editMemoId ? (state.memos[state.editMemoId]?.created_at || new Date().toISOString()) : new Date().toISOString(),
    };

    state.memos[m.id] = m;
    state.showMemoForm = false;
    saveAll();
    render();
  }

  // ─── PERSISTANCE ─────────────────────────────────────────────────────────────

  function saveAll() {
    save('reservations', state.reservations);
    save('memos', state.memos);
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────────

  function init(autoRender) {
    state.reservations = load('reservations', {});
    state.memos = load('memos', {});

    listen('reservations', data => { if (data) { state.reservations = data; render(); } });
    listen('memos', data => { if (data) { state.memos = data; render(); } });

    if (autoRender) {
      // Attendre que le DOM soit prêt
      const tryRender = () => {
        const el = document.getElementById('tab-reservations');
        if (el) { render(); } else { setTimeout(tryRender, 100); }
      };
      tryRender();
    }
  }

  // ─── EXPORT ──────────────────────────────────────────────────────────────────

  window.ReservationsTab = { init, render, state };

})();
