// =============================================================
// ReservationsTab v4 — AbracadaParc RH Tool
// Vraies formules site · Alertes gâteaux J-10/J-7 · Suivi Nacima
// Firebase : abracadaparc-rh-5dd09 · fbSave() fbListen()
// =============================================================

const ReservationsTab = (() => {

  const FB_KEY      = 'reservations';
  const FB_GATEAUX  = 'commandes_gateaux';
  const NACIMA_TEL  = '06 19 30 06 39';

  // ── FORMULES ANNIVERSAIRE (vraies formules site) ─────────────
  const FORMULES_ANNIV = [
    {
      id: 'abracadaniv_magique',
      label: "Abracada'Niv MAGIQUE",
      prix: 'À partir de 160 €',
      duree: '3h',
      horaires: '10h-13h ou 14h-17h',
      inclus: 'Table réservée · espace privé · Goûter et déco NON inclus',
      min: '8 enfants + 1 adulte offert',
      color: '#7C3AED', bg: '#F5F3FF',
    },
    {
      id: 'abracadaniv_fantastique',
      label: "Abracada'Niv FANTASTIQUE",
      prix: 'À partir de 176 €',
      duree: '3h',
      horaires: '10h-13h ou 14h-17h',
      inclus: 'Goûter gourmand · ambiance relax parents · Tente stretch et déco',
      min: '8 enfants + 2 adultes offerts',
      color: '#D97706', bg: '#FFFBEB',
    },
    {
      id: 'abracadaniv_gourmand',
      label: "Abracada'Niv GOURMAND",
      prix: 'À partir de 232 €',
      duree: '3h',
      horaires: '10h-13h',
      inclus: 'Repas + Goûter gourmand · ambiance relax parents · Tente stretch et déco',
      min: '8 enfants + 2 adultes offerts',
      color: '#059669', bg: '#ECFDF5',
    },
    {
      id: 'anniv_classique',
      label: 'Anniversaire CLASSIQUE',
      prix: 'À partir de 250 €',
      duree: '2h30',
      horaires: '10h30-13h ou 14h30-17h',
      inclus: '8 enfants + 2 adultes inclus · max 10 adultes (+18 ans)',
      min: '8 enfants minimum',
      color: '#1e293b', bg: '#F8FAFC',
    },
    {
      id: 'anniv_garden_party',
      label: 'Anniversaire GARDEN PARTY',
      prix: 'À partir de 350 €',
      duree: '3h',
      horaires: '10h-13h',
      inclus: '8 enfants + 6 adultes inclus · max 12 adultes (+18 ans) · +30€/enf · +30€/adu',
      min: '8 enfants minimum',
      color: '#10B981', bg: '#ECFDF5',
    },
    {
      id: 'anniv_abracadanight',
      label: "Anniversaire ABRACADA'NIGHT",
      prix: 'À partir de 490 €',
      duree: '3h',
      horaires: '18h-21h',
      inclus: '8 enfants + 6 adultes inclus · max 12 adultes · +45€/enf · +10€/adu · Filets nocturnes',
      min: '8 enfants minimum',
      color: '#4F46E5', bg: '#EEF2FF',
    },
    {
      id: 'sur_mesure',
      label: 'Sur mesure',
      prix: 'Sur devis',
      duree: 'Variable',
      horaires: 'À définir',
      inclus: 'Formule personnalisée',
      min: 'À définir',
      color: '#6B7280', bg: '#F9FAFB',
    },
  ];

  // Formules avec gâteau inclus (déclenchent alertes Nacima)
  const FORMULES_AVEC_GATEAU = [
    'abracadaniv_fantastique','abracadaniv_gourmand',
    'anniv_classique','anniv_garden_party','anniv_abracadanight'
  ];

  const GATEAUX_OPTIONS = [
    'Moelleux au chocolat','Tarte aux pommes','Fraisier',
    'Number cake','Layer cake personnalisé',
    'Apporté par la famille','Sans gâteau',
  ];

  const SEGMENTS = [
    { id: 'scolaire',      label: '🏫 Groupe scolaire',  color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'alsh',          label: '🏕️ ALSH / CDL',        color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'anniversaire',  label: '🎂 Anniversaire',      color: '#EC4899', bg: '#FDF2F8' },
    { id: 'privatisation', label: '🔒 Privatisation',     color: '#F97316', bg: '#FFF7ED' },
    { id: 'groupe_prive',  label: '👨‍👩‍👧 Groupe privé',     color: '#10B981', bg: '#ECFDF5' },
    { id: 'association',   label: '🤝 Association / IME', color: '#F59E0B', bg: '#FFFBEB' },
    { id: 'entreprise',    label: '🏢 Entreprise / CE',   color: '#6366F1', bg: '#EEF2FF' },
  ];

  const STATUTS = [
    { id: 1, label: '1 · Demande reçue',            color: '#3B82F6', bg: '#EFF6FF' },
    { id: 2, label: '2 · Devis envoyé',             color: '#F59E0B', bg: '#FFFBEB' },
    { id: 3, label: '3 · Devis signé · Attente BC', color: '#F97316', bg: '#FFF7ED' },
    { id: 4, label: '4 · Confirmé · BC reçu',       color: '#10B981', bg: '#ECFDF5' },
    { id: 5, label: '5 · Visite · Facturation',     color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 6, label: '6 · Clôturé ✓',               color: '#6B7280', bg: '#F9FAFB' },
  ];

  const FORMULES_GROUPE = {
    scolaire:      ['Matin (10h-12h30)', 'Après-midi (14h-17h)', 'Journée (10h-17h)'],
    alsh:          ['Matin (10h-12h30)', 'Après-midi (14h-17h)', 'Journée (10h-17h)'],
    privatisation: ['Petit jardin (14h-17h)', 'Grand jardin (10h-18h)', 'Sur mesure'],
    groupe_prive:  ['Matin (10h-12h30)', 'Après-midi (14h-17h)', 'Journée'],
    association:   ['Matin', 'Après-midi', 'Journée'],
    entreprise:    ['Team-building demi-journée', 'Team-building journée', 'Sur mesure'],
  };

  let reservations   = {};
  let commandesGat   = {};
  let editingId      = null;
  let filterStatut   = 'all';
  let filterSegment  = 'all';
  let isAdmin        = false;
  let viewMode       = 'cards';  // cards | calendar | gateaux
  let currentMonth   = new Date();

  // ── INIT ─────────────────────────────────────────────────────
  function init(adminMode = false) {
    isAdmin = adminMode;
    render();
    fbListen(FB_KEY, data => {
      reservations = data || {};
      checkAlertes();
      refreshView();
    });
    fbListen(FB_GATEAUX, data => {
      commandesGat = data || {};
      if (viewMode === 'gateaux') renderGateaux();
    });
  }

  function refreshView() {
    if (viewMode === 'calendar') renderCalendar();
    else if (viewMode === 'gateaux') renderGateaux();
    else renderList();
    renderStats();
  }

  // ── ALERTES GÂTEAUX ──────────────────────────────────────────
  function checkAlertes() {
    const alertes = [];
    const today   = new Date(); today.setHours(0,0,0,0);

    Object.entries(reservations).forEach(([id, r]) => {
      if (r.segment !== 'anniversaire') return;
      if (!r.date_visite) return;
      if (!FORMULES_AVEC_GATEAU.includes(r.formule_id)) return;
      if (r.gateau === 'Sans gâteau' || r.gateau === 'Apporté par la famille') return;
      if (r.gateau_commande_ok) return; // déjà commandé

      const dateVisite = new Date(r.date_visite); dateVisite.setHours(0,0,0,0);
      const j10 = new Date(dateVisite); j10.setDate(j10.getDate() - 10);
      const j7  = new Date(dateVisite); j7.setDate(j7.getDate() - 7);
      const diff = Math.round((dateVisite - today) / 86400000);

      if (diff >= 0 && diff <= 10) {
        alertes.push({ id, r, diff,
          urgence: diff <= 7 ? 'critique' : 'attention' });
      }
    });

    renderAlertes(alertes);
  }

  function renderAlertes(alertes) {
    let el = document.getElementById('rv-alertes');
    if (!el) return;
    if (!alertes.length) { el.innerHTML = ''; return; }

    el.innerHTML = alertes.map(a => {
      const f = FORMULES_ANNIV.find(x => x.id === a.r.formule_id);
      const couleur = a.urgence === 'critique' ? '#DC2626' : '#D97706';
      const bg      = a.urgence === 'critique' ? '#FEF2F2' : '#FFFBEB';
      const border  = a.urgence === 'critique' ? '#FECACA' : '#FCD34D';
      return `
      <div class="rv-alerte" style="background:${bg};border-color:${border}">
        <div class="rv-alerte-hd">
          <span style="color:${couleur};font-weight:700">
            ${a.urgence==='critique'?'🚨':'⚠️'}
            J-${a.diff} — Commander le gâteau
          </span>
          <button class="rv-btn-commande-ok" onclick="ReservationsTab.marquerGateauCommande('${a.id}')">
            ✓ Commandé
          </button>
        </div>
        <div class="rv-alerte-detail">
          <strong>${a.r.enfant_fete||a.r.structure||'—'}</strong>
          ${a.r.age_fete ? `· ${a.r.age_fete} ans` : ''}
          · ${new Date(a.r.date_visite).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long'})}
          · ${f ? f.label : a.r.formule_id||'—'}
        </div>
        <div class="rv-alerte-gateau">
          🎂 ${a.r.gateau||'Gâteau non précisé'}
          ${a.r.gateau_texte ? `— "${a.r.gateau_texte}"` : ''}
          ${a.r.gateau_notes ? `· ${a.r.gateau_notes}` : ''}
        </div>
        <div class="rv-alerte-nacima">
          📞 Nacima : <strong>${NACIMA_TEL}</strong>
          <button class="rv-btn-note-gateau" onclick="ReservationsTab.openGateauCommande('${a.id}')">
            + Ajouter note commande
          </button>
        </div>
      </div>`;
    }).join('');
  }

  function marquerGateauCommande(id) {
    fbSave(`${FB_KEY}/${id}/gateau_commande_ok`, true);
    fbSave(`${FB_KEY}/${id}/gateau_commande_date`, new Date().toISOString());
    // Ajouter dans suivi commandes
    const r = reservations[id];
    const cmdId = 'cmd_' + Date.now();
    fbSave(`${FB_GATEAUX}/${cmdId}`, {
      res_id:      id,
      structure:   r.structure || '',
      enfant_fete: r.enfant_fete || '',
      age_fete:    r.age_fete || '',
      date_visite: r.date_visite,
      formule:     r.formule_id || '',
      gateau:      r.gateau || '',
      gateau_texte: r.gateau_texte || '',
      gateau_notes: r.gateau_notes || '',
      commande_le:  new Date().toISOString(),
      statut_cmd:   'commandé',
      notes_cmd:    '',
    });
  }

  function openGateauCommande(resId) {
    const r = reservations[resId];
    if (!r) return;
    const notes = prompt(`Notes commande gâteau pour ${r.enfant_fete||r.structure||resId} :\n(ex: confirmation Nacima, heure de livraison...)`);
    if (notes !== null) {
      fbSave(`${FB_KEY}/${resId}/gateau_notes_cmd`, notes);
    }
  }

  // ── VUE GÂTEAUX / SUIVI NACIMA ──────────────────────────────
  function renderGateaux() {
    const el = document.getElementById('rv-content');
    if (!el) return;

    // Anniversaires à venir avec gâteau
    const upcoming = Object.entries(reservations)
      .filter(([,r]) => r.segment==='anniversaire' && r.date_visite)
      .filter(([,r]) => {
        const d = new Date(r.date_visite);
        return d >= new Date();
      })
      .sort(([,a],[,b]) => a.date_visite.localeCompare(b.date_visite))
      .map(([id,r]) => ({id,...r}));

    const cmds = Object.entries(commandesGat)
      .sort(([,a],[,b]) => (b.commande_le||'').localeCompare(a.commande_le||''))
      .map(([id,c]) => ({id,...c}));

    el.innerHTML = `
    <div class="rv-gat-root">

      <div class="rv-gat-header">
        <div>
          <div class="rv-gat-title">🎂 Suivi commandes gâteaux</div>
          <div class="rv-gat-subtitle">Nacima · ${NACIMA_TEL}</div>
        </div>
        <a href="tel:${NACIMA_TEL.replace(/\s/g,'')}" class="rv-btn-nacima">📞 Appeler Nacima</a>
      </div>

      <div class="rv-gat-section">📅 Anniversaires à venir — gâteaux à commander</div>
      ${upcoming.length ? `
      <div class="rv-gat-table-wrap">
        <table class="rv-gat-table">
          <thead>
            <tr>
              <th>Date</th><th>Enfant / Famille</th><th>Formule</th>
              <th>Gâteau</th><th>Inscription</th><th>Notes</th>
              <th>Commandé ?</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
          ${upcoming.map(r => {
            const f   = FORMULES_ANNIV.find(x=>x.id===r.formule_id);
            const dl  = r.date_visite ? new Date(r.date_visite).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'short'}) : '—';
            const diff = r.date_visite ? Math.round((new Date(r.date_visite)-new Date())/86400000) : null;
            const urgcl = diff!==null&&diff<=7?'rv-gat-urgent':diff!==null&&diff<=10?'rv-gat-attention':'';
            const avecGat = FORMULES_AVEC_GATEAU.includes(r.formule_id);
            return `<tr class="${urgcl}">
              <td><strong>${dl}</strong>${diff!==null?`<br><small>J-${diff}</small>`:''}</td>
              <td>${r.enfant_fete||'—'} ${r.age_fete?`<br><small>${r.age_fete} ans</small>`:''}<br><small>${r.structure||''}</small></td>
              <td><small>${f?f.label:r.formule_id||'—'}</small></td>
              <td>${avecGat ? (r.gateau||'<span class="rv-gat-manquant">À préciser</span>') : '<small class="rv-gat-na">Non inclus</small>'}</td>
              <td><small>${r.gateau_texte||'—'}</small></td>
              <td><small>${r.gateau_notes||r.gateau_notes_cmd||'—'}</small></td>
              <td>${r.gateau_commande_ok
                ? `<span class="rv-gat-ok">✓ ${r.gateau_commande_date?new Date(r.gateau_commande_date).toLocaleDateString('fr-FR'):'Oui'}</span>`
                : avecGat ? `<span class="rv-gat-todo">À commander</span>` : '—'
              }</td>
              <td>
                ${avecGat&&!r.gateau_commande_ok?`<button class="rv-btn-sm-ok" onclick="ReservationsTab.marquerGateauCommande('${r.id}')">✓ Commandé</button>`:''}
                <button class="rv-btn-sm" onclick="ReservationsTab.openForm('${r.id}')">✏️ Éditer</button>
              </td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>` : '<div class="rv-gat-empty">Aucun anniversaire à venir.</div>'}

      <div class="rv-gat-section">📋 Historique commandes passées</div>
      ${cmds.length ? `
      <div class="rv-gat-table-wrap">
        <table class="rv-gat-table">
          <thead>
            <tr><th>Commandé le</th><th>Enfant / Famille</th><th>Date visite</th><th>Gâteau</th><th>Inscription</th><th>Statut</th><th>Notes</th></tr>
          </thead>
          <tbody>
          ${cmds.map(c => `<tr>
            <td>${c.commande_le?new Date(c.commande_le).toLocaleDateString('fr-FR'):'—'}</td>
            <td>${c.enfant_fete||c.structure||'—'} ${c.age_fete?`· ${c.age_fete} ans`:''}</td>
            <td>${c.date_visite?new Date(c.date_visite).toLocaleDateString('fr-FR'):'—'}</td>
            <td>${c.gateau||'—'}</td>
            <td>${c.gateau_texte||'—'}</td>
            <td><span class="rv-gat-ok">${c.statut_cmd||'commandé'}</span></td>
            <td><small>${c.notes_cmd||'—'}</small></td>
          </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<div class="rv-gat-empty">Aucune commande enregistrée.</div>'}

    </div>`;
  }

  // ── RENDER PRINCIPAL ─────────────────────────────────────────
  function render() {
    const c = document.getElementById('tab-reservations');
    if (!c) return;
    c.innerHTML = `
    <div class="rv-root">
      <div class="rv-header">
        <div class="rv-title-block">
          <span class="rv-icon">📅</span>
          <h2 class="rv-title">Réservations 2026</h2>
        </div>
        <div class="rv-header-right">
          <div class="rv-view-toggle">
            <button class="rv-view-btn active" id="btn-view-cards" onclick="ReservationsTab.setView('cards')">📋 Liste</button>
            <button class="rv-view-btn" id="btn-view-cal" onclick="ReservationsTab.setView('calendar')">📆 Calendrier</button>
            <button class="rv-view-btn" id="btn-view-gat" onclick="ReservationsTab.setView('gateaux')">🎂 Gâteaux</button>
          </div>
          <button class="rv-btn-add" onclick="ReservationsTab.openForm()">+ Nouvelle</button>
        </div>
      </div>

      <!-- ALERTES GÂTEAUX -->
      <div id="rv-alertes"></div>

      <!-- STATS -->
      <div class="rv-stats" id="rv-stats"></div>

      <!-- FILTRES -->
      <div class="rv-filter-row" id="rv-filtres-segment">
        <span class="rv-filter-lbl">Segment</span>
        <div class="rv-filters">
          <button class="rv-f-btn active" data-fkey="seg-all" onclick="ReservationsTab.setSegment('all',this)">Tous</button>
          ${SEGMENTS.map(s=>`<button class="rv-f-btn" data-fkey="seg-${s.id}" style="--sc:${s.color};--sb:${s.bg}" onclick="ReservationsTab.setSegment('${s.id}',this)">${s.label}</button>`).join('')}
        </div>
      </div>
      <div class="rv-filter-row" id="rv-filtres-statut">
        <span class="rv-filter-lbl">Statut</span>
        <div class="rv-filters">
          <button class="rv-f-btn active" data-fkey="st-all" onclick="ReservationsTab.setFilter('all',this)">Tous</button>
          ${STATUTS.map(s=>`<button class="rv-f-btn" data-fkey="st-${s.id}" style="--sc:${s.color};--sb:${s.bg}" onclick="ReservationsTab.setFilter(${s.id},this)">${s.label}</button>`).join('')}
        </div>
      </div>

      <div id="rv-content"></div>

      <!-- MODAL -->
      <div class="rv-overlay" id="rv-overlay" onclick="ReservationsTab.closeForm()"></div>
      <div class="rv-modal" id="rv-modal">
        <div class="rv-modal-hd">
          <h3 id="rv-modal-title">Nouvelle réservation</h3>
          <button class="rv-modal-close" onclick="ReservationsTab.closeForm()">✕</button>
        </div>
        <div class="rv-modal-body" id="rv-modal-body"></div>
        <div class="rv-modal-ft">
          <button class="rv-btn-sec" onclick="ReservationsTab.closeForm()">Annuler</button>
          <button class="rv-btn-pri" onclick="ReservationsTab.saveForm()">Enregistrer</button>
        </div>
      </div>
    </div>
    ${styles()}`;
    renderList();
    renderStats();
  }

  // ── FORMULAIRE ANNIVERSAIRE ──────────────────────────────────
  function formAnniv(r) {
    return `
    <input type="hidden" id="f-seg" value="anniversaire"/>
    <div class="rv-section">🎂 Segment</div>
    <div class="rv-seg-grid">${SEGMENTS.map(s=>`<button type="button" class="rv-seg-btn${s.id==='anniversaire'?' rv-seg-active':''}" data-seg="${s.id}" style="--sc:${s.color};--sb:${s.bg}" onclick="ReservationsTab.selectSeg('${s.id}')">${s.label}</button>`).join('')}</div>

    <div class="rv-section">📋 Identification</div>
    <div class="rv-row">
      <div class="rv-field"><label>Référence *</label><input id="f-ref" placeholder="ANN2026..." value="${v(r,'ref')}"/></div>
      <div class="rv-field"><label>Statut *</label><select id="f-statut">${STATUTS.map(s=>`<option value="${s.id}"${r&&r.statut==s.id?' selected':''}>${s.label}</option>`).join('')}</select></div>
    </div>
    <div class="rv-row">
      <div class="rv-field rv-wide">
        <label>Nom de famille / Référence dossier *</label>
        <input id="f-structure" placeholder="Famille MARTIN" value="${v(r,'structure')}"/>
        <div class="rv-hint">ℹ️ RGPD : nom de famille uniquement, pas d'email ni de téléphone</div>
      </div>
    </div>

    <div class="rv-section">🎈 Enfant fêté</div>
    <div class="rv-row">
      <div class="rv-field"><label>Prénom</label><input id="f-enfant-fete" placeholder="Léa" value="${v(r,'enfant_fete')}"/></div>
      <div class="rv-field"><label>Âge fêté</label><input id="f-age-fete" type="number" min="2" max="18" placeholder="5" value="${v(r,'age_fete')}"/></div>
      <div class="rv-field"><label>Thème / Déco</label><input id="f-theme" placeholder="Licorne, Spiderman..." value="${v(r,'theme')}"/></div>
    </div>
    <div class="rv-row">
      <div class="rv-field rv-wide"><label>Allergies / Régime alimentaire</label><input id="f-allergies" placeholder="Allergie fruits à coque, sans gluten..." value="${v(r,'allergies')}"/></div>
    </div>

    <div class="rv-section">📦 Formule choisie *</div>
    <div class="rv-formule-grid" id="f-formule-grid">
      ${FORMULES_ANNIV.map(f=>`
      <div class="rv-formule-card ${r&&r.formule_id===f.id?'rv-formule-active':''}" data-fid="${f.id}" style="--fc:${f.color};--fb:${f.bg}" onclick="ReservationsTab.selectFormule('${f.id}')">
        <div class="rv-f-nom">${f.label}</div>
        <div class="rv-f-prix">${f.prix} · ${f.duree}</div>
        <div class="rv-f-hr">🕐 ${f.horaires}</div>
        <div class="rv-f-min">👥 ${f.min}</div>
        <div class="rv-f-inc">${f.inclus}</div>
      </div>`).join('')}
    </div>
    <input type="hidden" id="f-formule" value="${v(r,'formule_id')}"/>

    <div class="rv-section">📅 Date & Horaires</div>
    <div class="rv-row">
      <div class="rv-field"><label>Date *</label><input id="f-date" type="date" value="${v(r,'date_visite')}"/></div>
      <div class="rv-field"><label>Heure début</label><input id="f-heure-debut" type="time" value="${v(r,'heure_debut','14:00')}"/></div>
      <div class="rv-field"><label>Heure fin</label><input id="f-heure-fin" type="time" value="${v(r,'heure_fin','17:00')}"/></div>
    </div>

    <div class="rv-section">👶 Effectifs</div>
    <div class="rv-row">
      <div class="rv-field"><label>Nb enfants</label><input id="f-enfants" type="number" min="0" placeholder="0" value="${v(r,'nb_enfants')}"/></div>
      <div class="rv-field"><label>Nb adultes</label><input id="f-adultes" type="number" min="0" placeholder="0" value="${v(r,'nb_adultes')}"/></div>
      <div class="rv-field"><label>Total</label><input id="f-total" type="number" min="0" placeholder="0" value="${v(r,'nb_total')}"/></div>
    </div>

    <div class="rv-section rv-section-gateau">🎂 Commande gâteau (Nacima · ${NACIMA_TEL})</div>
    <div class="rv-gateau-bloc">
      <div class="rv-row">
        <div class="rv-field"><label>Type de gâteau</label>
          <select id="f-gateau"><option value="">Choisir...</option>
            ${GATEAUX_OPTIONS.map(g=>`<option value="${g}"${r&&r.gateau===g?' selected':''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="rv-field"><label>Inscription sur le gâteau</label><input id="f-gateau-texte" placeholder="Joyeux anniversaire Léa !" value="${v(r,'gateau_texte')}"/></div>
      </div>
      <div class="rv-row">
        <div class="rv-field rv-wide"><label>Détails gâteau (nb bougies, décoration, couleurs...)</label>
          <textarea id="f-gateau-notes" rows="2" placeholder="8 bougies roses, déco licorne...">${v(r,'gateau_notes')}</textarea>
        </div>
      </div>
      <div class="rv-row rv-checks">
        <label class="rv-chk-label"><input id="f-gateau-ok" type="checkbox" ${r&&r.gateau_commande_ok?'checked':''}/> ✓ Gâteau commandé chez Nacima</label>
      </div>
    </div>

    <div class="rv-section rv-section-paiement">💶 Paiement</div>
    <div class="rv-pay-bloc">
      <div class="rv-row">
        <div class="rv-field"><label>Montant total € <span class="rv-admin-tag">admin</span></label><input id="f-montant" type="number" step="0.01" placeholder="0.00" value="${v(r,'montant')}"/></div>
        <div class="rv-field"><label>Acompte payé €</label><input id="f-acompte-mt" type="number" step="0.01" placeholder="0.00" value="${v(r,'acompte_montant')}"/></div>
        <div class="rv-field"><label>Solde restant sur place €</label><input id="f-solde" type="number" step="0.01" placeholder="0.00" value="${v(r,'solde')}"/></div>
      </div>
      <div class="rv-row">
        <div class="rv-field"><label>Mode paiement acompte</label>
          <select id="f-mode-paiement"><option value="">Non précisé</option>
            <option value="cb_en_ligne" ${r&&r.mode_paiement==='cb_en_ligne'?'selected':''}>CB en ligne</option>
            <option value="virement" ${r&&r.mode_paiement==='virement'?'selected':''}>Virement</option>
            <option value="cheque" ${r&&r.mode_paiement==='cheque'?'selected':''}>Chèque</option>
            <option value="especes" ${r&&r.mode_paiement==='especes'?'selected':''}>Espèces</option>
          </select>
        </div>
        <div class="rv-field"><label>Mode paiement solde</label>
          <select id="f-mode-solde"><option value="">Non précisé</option>
            <option value="cb_sur_place" ${r&&r.mode_solde==='cb_sur_place'?'selected':''}>CB sur place</option>
            <option value="virement" ${r&&r.mode_solde==='virement'?'selected':''}>Virement</option>
            <option value="cheque" ${r&&r.mode_solde==='cheque'?'selected':''}>Chèque</option>
            <option value="especes" ${r&&r.mode_solde==='especes'?'selected':''}>Espèces</option>
          </select>
        </div>
      </div>
      <div class="rv-row rv-checks">
        <label class="rv-chk-label"><input id="f-acompte-recu" type="checkbox" ${r&&r.acompte_recu?'checked':''}/> Acompte reçu ✓</label>
        <label class="rv-chk-label"><input id="f-paye-total" type="checkbox" ${r&&r.paye_total?'checked':''}/> Tout payé ✓</label>
        <label class="rv-chk-label"><input id="f-solde-recu" type="checkbox" ${r&&r.solde_recu?'checked':''}/> Solde encaissé ✓</label>
        <label class="rv-chk-label"><input id="f-facture" type="checkbox" ${r&&r.facture_emise?'checked':''}/> Facture émise ✓</label>
      </div>
    </div>

    <div class="rv-section">📝 Notes internes</div>
    <div class="rv-row"><div class="rv-field rv-wide"><textarea id="f-notes" rows="3" placeholder="Demandes particulières, accessibilité...">${v(r,'notes')}</textarea></div></div>`;
  }

  // ── FORMULAIRE GROUPE ────────────────────────────────────────
  function formGroupe(segId, r) {
    const avecChorus = ['scolaire','alsh','association'].includes(segId);
    const formules = FORMULES_GROUPE[segId] || ['Matin','Après-midi','Journée'];
    return `
    <input type="hidden" id="f-seg" value="${segId}"/>
    <div class="rv-section">📋 Segment</div>
    <div class="rv-seg-grid">${SEGMENTS.map(s=>`<button type="button" class="rv-seg-btn${s.id===segId?' rv-seg-active':''}" data-seg="${s.id}" style="--sc:${s.color};--sb:${s.bg}" onclick="ReservationsTab.selectSeg('${s.id}')">${s.label}</button>`).join('')}</div>

    <div class="rv-section">📋 Identification</div>
    <div class="rv-row">
      <div class="rv-field"><label>Référence devis *</label><input id="f-ref" placeholder="DEV2026..." value="${v(r,'ref')}"/></div>
      <div class="rv-field"><label>Statut *</label><select id="f-statut">${STATUTS.map(s=>`<option value="${s.id}"${r&&r.statut==s.id?' selected':''}>${s.label}</option>`).join('')}</select></div>
    </div>
    <div class="rv-row">
      <div class="rv-field rv-wide"><label>Nom de la structure *</label><input id="f-structure" placeholder="École, ALSH, association..." value="${v(r,'structure')}"/></div>
    </div>

    <div class="rv-section">📅 Date & Formule</div>
    <div class="rv-row">
      <div class="rv-field"><label>Date *</label><input id="f-date" type="date" value="${v(r,'date_visite')}"/></div>
      <div class="rv-field"><label>Formule</label>
        <select id="f-formule"><option value="">Choisir...</option>
          ${formules.map(f=>`<option value="${f}"${r&&r.formule===f?' selected':''}>${f}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="rv-section">👥 Effectifs</div>
    <div class="rv-row">
      <div class="rv-field"><label>Nb enfants</label><input id="f-enfants" type="number" min="0" placeholder="0" value="${v(r,'nb_enfants')}"/></div>
      <div class="rv-field"><label>Nb adultes</label><input id="f-adultes" type="number" min="0" placeholder="0" value="${v(r,'nb_adultes')}"/></div>
      <div class="rv-field"><label>Total</label><input id="f-total" type="number" min="0" placeholder="0" value="${v(r,'nb_total')}"/></div>
    </div>

    <div class="rv-section rv-section-paiement">💶 Paiement</div>
    <div class="rv-pay-bloc">
      <div class="rv-row">
        <div class="rv-field"><label>Montant total € <span class="rv-admin-tag">admin</span></label><input id="f-montant" type="number" step="0.01" placeholder="0.00" value="${v(r,'montant')}"/></div>
        <div class="rv-field"><label>Acompte payé €</label><input id="f-acompte-mt" type="number" step="0.01" placeholder="0.00" value="${v(r,'acompte_montant')}"/></div>
        <div class="rv-field"><label>Solde restant €</label><input id="f-solde" type="number" step="0.01" placeholder="0.00" value="${v(r,'solde')}"/></div>
      </div>
      <div class="rv-row rv-checks">
        <label class="rv-chk-label"><input id="f-bc" type="checkbox" ${r&&r.bc_recu?'checked':''}/> BC reçu ✓</label>
        <label class="rv-chk-label"><input id="f-acompte-recu" type="checkbox" ${r&&r.acompte_recu?'checked':''}/> Acompte reçu ✓</label>
        <label class="rv-chk-label"><input id="f-paye-total" type="checkbox" ${r&&r.paye_total?'checked':''}/> Tout payé ✓</label>
        <label class="rv-chk-label"><input id="f-solde-recu" type="checkbox" ${r&&r.solde_recu?'checked':''}/> Solde encaissé ✓</label>
        ${avecChorus?`<label class="rv-chk-label"><input id="f-chorus" type="checkbox" ${r&&r.chorus_pro?'checked':''}/> Chorus Pro ✓</label>`:''}
        <label class="rv-chk-label"><input id="f-facture" type="checkbox" ${r&&r.facture_emise?'checked':''}/> Facture émise ✓</label>
      </div>
    </div>

    <div class="rv-section">📝 Notes internes</div>
    <div class="rv-row"><div class="rv-field rv-wide"><textarea id="f-notes" rows="3" placeholder="Informations utiles, points d'attention...">${v(r,'notes')}</textarea></div></div>`;
  }

  // Helper valeur
  function v(r, key, def='') { return r ? (r[key] !== undefined && r[key] !== null ? r[key] : def) : def; }

  // ── OPEN / CLOSE / SAVE ──────────────────────────────────────
  function openForm(id = null) {
    editingId = id;
    document.getElementById('rv-modal-title').textContent = id ? 'Modifier' : 'Nouvelle réservation';
    const r   = id ? reservations[id] : null;
    const seg = r ? (r.segment || 'scolaire') : 'scolaire';
    const body = document.getElementById('rv-modal-body');
    body.innerHTML = seg === 'anniversaire' ? formAnniv(r) : formGroupe(seg, r);
    document.getElementById('rv-modal').classList.add('rv-modal-open');
    document.getElementById('rv-overlay').classList.add('rv-overlay-open');
    setupAutoCalc();
  }

  function selectSeg(segId) {
    document.getElementById('f-seg').value = segId;
    document.querySelectorAll('.rv-seg-btn').forEach(b=>b.classList.toggle('rv-seg-active', b.dataset.seg===segId));
    const r = editingId ? reservations[editingId] : null;
    document.getElementById('rv-modal-body').innerHTML = segId==='anniversaire' ? formAnniv(r) : formGroupe(segId,r);
    setupAutoCalc();
  }

  function selectFormule(fId) {
    const el = document.getElementById('f-formule');
    if (el) el.value = fId;
    document.querySelectorAll('.rv-formule-card').forEach(c=>{
      c.classList.toggle('rv-formule-active', c.dataset.fid===fId);
    });
  }

  function setupAutoCalc() {
    const mt=document.getElementById('f-montant');
    const ac=document.getElementById('f-acompte-mt');
    const sl=document.getElementById('f-solde');
    if (mt&&ac&&sl) {
      const calc=()=>{ const m=parseFloat(mt.value)||0, a=parseFloat(ac.value)||0; if(m>0) sl.value=Math.max(0,m-a).toFixed(2); };
      mt.addEventListener('input',calc); ac.addEventListener('input',calc);
    }
  }

  function closeForm() {
    document.getElementById('rv-modal').classList.remove('rv-modal-open');
    document.getElementById('rv-overlay').classList.remove('rv-overlay-open');
    editingId = null;
  }

  function saveForm() {
    const g  = id => { const e=document.getElementById(id); return e?e.value.trim():''; };
    const ch = id => { const e=document.getElementById(id); return e?e.checked:false; };
    const seg=g('f-seg'), ref=g('f-ref'), structure=g('f-structure'), date=g('f-date'), statut=g('f-statut');
    if (!seg||!ref||!structure||!date||!statut) { alert('Champs obligatoires : Type, Référence, Structure, Date, Statut.'); return; }

    const id = editingId||'res_'+Date.now();
    const base = {
      segment:seg, ref, structure, date_visite:date, statut:parseInt(statut),
      nb_enfants:g('f-enfants'), nb_adultes:g('f-adultes'), nb_total:g('f-total'),
      montant:g('f-montant'), acompte_montant:g('f-acompte-mt'), solde:g('f-solde'),
      acompte_recu:ch('f-acompte-recu'), paye_total:ch('f-paye-total'),
      solde_recu:ch('f-solde-recu'), facture_emise:ch('f-facture'),
      notes:g('f-notes'), updated_at:new Date().toISOString(),
    };
    if (seg==='anniversaire') {
      Object.assign(base,{
        enfant_fete:g('f-enfant-fete'), age_fete:g('f-age-fete'),
        theme:g('f-theme'), allergies:g('f-allergies'),
        formule_id:g('f-formule'),
        heure_debut:g('f-heure-debut'), heure_fin:g('f-heure-fin'),
        gateau:g('f-gateau'), gateau_texte:g('f-gateau-texte'), gateau_notes:g('f-gateau-notes'),
        gateau_commande_ok:ch('f-gateau-ok'),
        mode_paiement:g('f-mode-paiement'), mode_solde:g('f-mode-solde'),
      });
    } else {
      Object.assign(base,{
        formule:g('f-formule'), bc_recu:ch('f-bc'), chorus_pro:ch('f-chorus'),
      });
    }
    if (!editingId) base.created_at=new Date().toISOString();
    fbSave(`${FB_KEY}/${id}`, base);
    closeForm();
  }

  // ── STATS ─────────────────────────────────────────────────────
  function renderStats() {
    const el=document.getElementById('rv-stats'); if(!el) return;
    const all=Object.values(reservations);
    const ca=all.reduce((s,r)=>s+parseFloat(r.montant||0),0);
    const solde=all.filter(r=>!r.paye_total&&r.solde).reduce((s,r)=>s+parseFloat(r.solde||0),0);
    const gateauxAlerte=all.filter(r=>{
      if(r.segment!=='anniversaire'||!r.date_visite||r.gateau_commande_ok) return false;
      if(!FORMULES_AVEC_GATEAU.includes(r.formule_id)) return false;
      const diff=(new Date(r.date_visite)-new Date())/86400000;
      return diff>=0&&diff<=10;
    }).length;
    el.innerHTML=`
      <div class="rv-stat"><div class="rv-sv">${all.length}</div><div class="rv-sl">Total</div></div>
      <div class="rv-stat"><div class="rv-sv" style="color:#3B82F6">${all.filter(r=>['scolaire','alsh','association','groupe_prive','entreprise'].includes(r.segment)).length}</div><div class="rv-sl">Groupes</div></div>
      <div class="rv-stat"><div class="rv-sv" style="color:#EC4899">${all.filter(r=>r.segment==='anniversaire').length}</div><div class="rv-sl">Anniv.</div></div>
      <div class="rv-stat"><div class="rv-sv" style="color:#10B981">${all.filter(r=>r.statut>=4).length}</div><div class="rv-sl">Confirmées</div></div>
      ${gateauxAlerte?`<div class="rv-stat rv-stat-alert"><div class="rv-sv" style="color:#DC2626">🎂 ${gateauxAlerte}</div><div class="rv-sl">Gâteau à commander</div></div>`:''}
      ${isAdmin?`
      <div class="rv-stat"><div class="rv-sv" style="color:#6366F1">${ca.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</div><div class="rv-sl">CA total</div></div>
      <div class="rv-stat"><div class="rv-sv" style="color:#F59E0B">${solde.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</div><div class="rv-sl">Soldes dus</div></div>
      `:''}`;
  }

  // ── LISTE ─────────────────────────────────────────────────────
  function filtered() {
    return Object.entries(reservations)
      .filter(([,r])=>filterStatut==='all'||r.statut==filterStatut)
      .filter(([,r])=>filterSegment==='all'||r.segment===filterSegment)
      .map(([id,r])=>({id,...r}))
      .sort((a,b)=>(a.date_visite||'').localeCompare(b.date_visite||''));
  }

  function renderList() {
    const el=document.getElementById('rv-content'); if(!el) return;
    const items=filtered();
    if(!items.length){el.innerHTML=`<div class="rv-empty">Aucune réservation.<br><button class="rv-btn-add-inline" onclick="ReservationsTab.openForm()">+ Ajouter</button></div>`;return;}
    const grp={};
    items.forEach(r=>{const d=r.date_visite||'sans-date';if(!grp[d])grp[d]=[];grp[d].push(r);});
    let html='';
    Object.entries(grp).sort().forEach(([d,g])=>{
      const dl=d==='sans-date'?'Sans date':new Date(d).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
      html+=`<div class="rv-date-grp">
        <div class="rv-date-hd">${dl}<span class="rv-date-cnt">${g.length} résa</span></div>
        <div class="rv-grid">${g.map(r=>card(r)).join('')}</div>
      </div>`;
    });
    el.innerHTML=html;
  }

  function card(r) {
    const seg=SEGMENTS.find(s=>s.id===r.segment)||{color:'#6B7280',bg:'#F9FAFB',label:'—'};
    const st=STATUTS.find(s=>s.id==r.statut)||STATUTS[0];
    const urg=isUrgent(r.date_visite);
    const dl=r.date_visite?new Date(r.date_visite).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}):'—';
    const f=r.segment==='anniversaire'?FORMULES_ANNIV.find(x=>x.id===r.formule_id):null;

    let paiement='';
    if(r.paye_total) paiement=`<span class="rv-pay rv-pay-ok">✓ Tout payé</span>`;
    else if(r.acompte_recu&&r.solde) paiement=`<span class="rv-pay rv-pay-partial">Acompte ✓ · Solde ${parseFloat(r.solde).toFixed(2)} €</span>`;
    else if(r.acompte_recu) paiement=`<span class="rv-pay rv-pay-partial">Acompte ✓</span>`;
    else paiement=`<span class="rv-pay rv-pay-none">⏳ Paiement en attente</span>`;

    const gateauAlerte = r.segment==='anniversaire' && FORMULES_AVEC_GATEAU.includes(r.formule_id)
      && !r.gateau_commande_ok && r.date_visite
      && (new Date(r.date_visite)-new Date())/86400000 <= 10;

    return `<div class="rv-card${urg?' rv-urgent':''}" onclick="ReservationsTab.openForm('${r.id}')">
      <div class="rv-card-top">
        <span class="rv-seg-tag" style="background:${seg.bg};color:${seg.color}">${seg.label}</span>
        <span class="rv-st-tag" style="background:${st.bg};color:${st.color}">${st.label}</span>
      </div>
      <div class="rv-card-name">${r.structure||'—'}</div>
      <div class="rv-card-ref">${r.ref||''} · ${dl}</div>
      ${r.segment==='anniversaire'?`
        <div class="rv-anniv-detail">
          ${r.enfant_fete?`🎈 <strong>${r.enfant_fete}</strong>${r.age_fete?` · ${r.age_fete} ans`:''}`:''} 
          ${r.theme?`· 🎨 ${r.theme}`:''}
          ${f?`<br><small>${f.label} · ${f.horaires}</small>`:''}
          ${r.gateau?`<br>🎂 ${r.gateau}${r.gateau_texte?` — <em>"${r.gateau_texte}"</em>`:''}${r.gateau_commande_ok?` <span class="rv-gat-ok-sm">✓ commandé</span>`:''}`:''} 
        </div>`:
        `<div class="rv-meta">
          ${r.formule?`<span class="rv-chip">⏱ ${r.formule}</span>`:''}
          ${r.nb_enfants?`<span class="rv-chip">👶 ${r.nb_enfants}</span>`:''}
          ${r.nb_adultes?`<span class="rv-chip">👤 ${r.nb_adultes}</span>`:''}
        </div>`
      }
      <div class="rv-card-pay">${paiement}${isAdmin&&r.montant?` · <span class="rv-montant">${parseFloat(r.montant).toLocaleString('fr-FR',{minimumFractionDigits:2})} €</span>`:''}</div>
      ${urg?`<div class="rv-urg-tag">⚠️ Visite dans moins de 7 jours</div>`:''}
      ${gateauAlerte?`<div class="rv-urg-tag" style="background:#FDF2F8;color:#BE185D;border-color:#FBCFE8">🎂 Commander le gâteau !</div>`:''}
      ${r.notes?`<div class="rv-notes">${r.notes}</div>`:''}
      <div class="rv-card-actions" onclick="event.stopPropagation()">
        ${r.statut<6?`<button class="rv-btn-next" onclick="ReservationsTab.nextStatut('${r.id}')">Avancer →</button>`:'<span class="rv-done">✓ Clôturé</span>'}
        <button class="rv-btn-del" onclick="ReservationsTab.deleteRes('${r.id}')">🗑</button>
      </div>
    </div>`;
  }

  function isUrgent(d) {
    if(!d) return false;
    const diff=(new Date(d)-new Date())/86400000;
    return diff>=0&&diff<=7;
  }

  // ── CALENDRIER ───────────────────────────────────────────────
  function renderCalendar() {
    const el=document.getElementById('rv-content'); if(!el) return;
    const y=currentMonth.getFullYear(),m=currentMonth.getMonth();
    const first=new Date(y,m,1),last=new Date(y,m+1,0);
    const startDow=(first.getDay()+6)%7;
    const byDate={};
    filtered().forEach(r=>{
      if(!r.date_visite) return;
      const d=r.date_visite.slice(0,10);
      if(!byDate[d]) byDate[d]=[];
      byDate[d].push(r);
    });
    const mn=first.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    const days=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    let cells='',weeks=Math.ceil((startDow+last.getDate())/7);
    for(let w=0;w<weeks;w++){
      cells+='<div class="rv-cal-week">';
      for(let d=0;d<7;d++){
        const n=w*7+d-startDow+1;
        if(n<1||n>last.getDate()){cells+='<div class="rv-cal-cell rv-cal-empty"></div>';continue;}
        const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
        const evts=byDate[ds]||[];
        const today=ds===new Date().toISOString().slice(0,10);
        cells+=`<div class="rv-cal-cell${today?' rv-cal-today':''}${evts.length?' rv-cal-busy':''}">
          <div class="rv-cal-n${today?' rv-cal-n-today':''}">${n}</div>
          ${evts.map(r=>{const s=SEGMENTS.find(x=>x.id===r.segment)||{color:'#6B7280',bg:'#F9FAFB'};
            return `<div class="rv-cal-evt" style="background:${s.bg};color:${s.color};border-left:3px solid ${s.color}" onclick="ReservationsTab.openForm('${r.id}')">${(r.structure||r.ref||'?').slice(0,22)}</div>`;
          }).join('')}
        </div>`;
      }
      cells+='</div>';
    }
    el.innerHTML=`<div class="rv-cal">
      <div class="rv-cal-nav">
        <button class="rv-btn-sec rv-cal-arrow" onclick="ReservationsTab.prevMonth()">‹</button>
        <span class="rv-cal-month">${mn}</span>
        <button class="rv-btn-sec rv-cal-arrow" onclick="ReservationsTab.nextMonth()">›</button>
      </div>
      <div class="rv-cal-hd">${days.map(d=>`<div class="rv-cal-dlbl">${d}</div>`).join('')}</div>
      ${cells}
    </div>`;
  }

  function prevMonth(){currentMonth.setMonth(currentMonth.getMonth()-1);renderCalendar();}
  function nextMonth(){currentMonth.setMonth(currentMonth.getMonth()+1);renderCalendar();}

  // ── ACTIONS ──────────────────────────────────────────────────
  function nextStatut(id) {
    if(!reservations[id]||reservations[id].statut>=6) return;
    fbSave(`${FB_KEY}/${id}/statut`,reservations[id].statut+1);
    fbSave(`${FB_KEY}/${id}/updated_at`,new Date().toISOString());
  }
  function deleteRes(id) {
    if(!confirm(`Supprimer ${reservations[id]?.ref||id} ?`)) return;
    fbSave(`${FB_KEY}/${id}`,null);
  }
  function setFilter(v,btn){filterStatut=v;document.querySelectorAll('[data-fkey^="st-"]').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');refreshView();}
  function setSegment(v,btn){filterSegment=v;document.querySelectorAll('[data-fkey^="seg-"]').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');refreshView();}
  function setView(mode) {
    viewMode=mode;
    ['cards','cal','gat'].forEach(m=>document.getElementById(`btn-view-${m}`)?.classList.remove('active'));
    document.getElementById(`btn-view-${mode==='calendar'?'cal':mode==='gateaux'?'gat':'cards'}`)?.classList.add('active');
    // Masquer/montrer filtres selon vue
    const showFiltres = mode !== 'gateaux';
    ['rv-filtres-segment','rv-filtres-statut'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.style.display = showFiltres?'':'none';
    });
    refreshView();
  }

  // ── STYLES ───────────────────────────────────────────────────
  function styles(){return `<style>
  .rv-root{font-family:'Segoe UI',system-ui,sans-serif;padding:1.25rem;max-width:1200px}
  .rv-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.6rem}
  .rv-title-block{display:flex;align-items:center;gap:.55rem}
  .rv-icon{font-size:1.4rem}.rv-title{font-size:1.3rem;font-weight:700;margin:0;color:#1e293b}
  .rv-header-right{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .rv-view-toggle{display:flex;background:#f1f5f9;border-radius:8px;padding:3px;gap:2px}
  .rv-view-btn{border:none;background:transparent;padding:.32rem .8rem;border-radius:5px;font-size:.8rem;cursor:pointer;color:#64748b;font-weight:500}
  .rv-view-btn.active{background:#fff;color:#1e293b;box-shadow:0 1px 3px rgba(0,0,0,.1)}
  .rv-btn-add{background:#1e293b;color:#fff;border:none;padding:.46rem 1rem;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer}
  .rv-btn-add:hover{background:#334155}
  .rv-btn-add-inline{margin-top:.6rem;background:transparent;color:#3B82F6;border:1.5px solid #3B82F6;padding:.38rem .85rem;border-radius:8px;font-size:.8rem;cursor:pointer}
  .rv-btn-pri{background:#1e293b;color:#fff;border:none;padding:.48rem 1.15rem;border-radius:8px;font-size:.86rem;font-weight:600;cursor:pointer}
  .rv-btn-sec{background:transparent;color:#64748b;border:1.5px solid #e2e8f0;padding:.42rem .95rem;border-radius:8px;font-size:.83rem;cursor:pointer}
  .rv-btn-next{background:#EFF6FF;color:#3B82F6;border:1.5px solid #BFDBFE;padding:.25rem .6rem;border-radius:6px;font-size:.76rem;cursor:pointer;font-weight:600}
  .rv-btn-del{background:#FEF2F2;color:#EF4444;border:1.5px solid #FECACA;padding:.25rem .55rem;border-radius:6px;font-size:.76rem;cursor:pointer}
  .rv-done{font-size:.73rem;color:#94a3b8}
  /* Alertes */
  .rv-alerte{border:1.5px solid;border-radius:10px;padding:.8rem 1rem;margin-bottom:.75rem}
  .rv-alerte-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:.35rem;flex-wrap:wrap;gap:.4rem}
  .rv-alerte-detail,.rv-alerte-gateau,.rv-alerte-nacima{font-size:.82rem;color:#475569;margin-top:.22rem}
  .rv-alerte-nacima{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .rv-btn-commande-ok{background:#ECFDF5;color:#059669;border:1.5px solid #A7F3D0;padding:.28rem .7rem;border-radius:6px;font-size:.78rem;cursor:pointer;font-weight:600}
  .rv-btn-note-gateau{background:#FDF2F8;color:#BE185D;border:1.5px solid #FBCFE8;padding:.22rem .6rem;border-radius:6px;font-size:.73rem;cursor:pointer}
  /* Stats */
  .rv-stats{display:flex;gap:.65rem;margin-bottom:1rem;flex-wrap:wrap}
  .rv-stat{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:.6rem 1rem;min-width:85px}
  .rv-stat-alert{border-color:#FECACA;background:#FEF2F2}
  .rv-sv{font-size:1.35rem;font-weight:700;color:#1e293b;line-height:1.2}
  .rv-sl{font-size:.7rem;color:#94a3b8;margin-top:.1rem}
  /* Filtres */
  .rv-filter-row{display:flex;align-items:flex-start;gap:.55rem;margin-bottom:.65rem;flex-wrap:wrap}
  .rv-filter-lbl{font-size:.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;padding-top:.38rem;min-width:48px}
  .rv-filters{display:flex;gap:.38rem;flex-wrap:wrap}
  .rv-f-btn{border:1.5px solid #e2e8f0;background:#fff;padding:.3rem .75rem;border-radius:20px;font-size:.76rem;cursor:pointer;transition:all .12s}
  .rv-f-btn.active{background:#1e293b;color:#fff;border-color:#1e293b}
  .rv-f-btn:not([data-fkey$="-all"]):hover{background:var(--sb);color:var(--sc);border-color:var(--sc)}
  /* Liste */
  .rv-empty{text-align:center;padding:2.5rem 1rem;color:#94a3b8;font-size:.9rem}
  .rv-date-grp{margin-bottom:1.35rem}
  .rv-date-hd{font-size:.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;padding:.35rem 0 .55rem;border-bottom:1.5px solid #f1f5f9;margin-bottom:.7rem;display:flex;align-items:center;gap:.45rem}
  .rv-date-cnt{font-size:.7rem;background:#f1f5f9;color:#94a3b8;border-radius:20px;padding:.12rem .5rem;font-weight:500;text-transform:none}
  .rv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:.8rem}
  /* Cartes */
  .rv-card{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:.85rem .95rem;cursor:pointer;transition:box-shadow .12s,border-color .12s}
  .rv-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.07);border-color:#cbd5e1}
  .rv-urgent{border-color:#FCA5A5;background:#FFF5F5}
  .rv-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:.45rem;gap:.35rem;flex-wrap:wrap}
  .rv-seg-tag{font-size:.7rem;font-weight:600;padding:.2rem .55rem;border-radius:20px;white-space:nowrap}
  .rv-st-tag{font-size:.66rem;font-weight:600;padding:.18rem .5rem;border-radius:20px;white-space:nowrap}
  .rv-card-name{font-size:.95rem;font-weight:700;color:#1e293b;margin-bottom:.15rem;line-height:1.3}
  .rv-card-ref{font-size:.72rem;color:#94a3b8;font-family:monospace;margin-bottom:.45rem}
  .rv-anniv-detail{font-size:.78rem;color:#475569;background:#FDF2F8;border-radius:6px;padding:.4rem .55rem;margin-bottom:.45rem;line-height:1.7}
  .rv-gat-ok-sm{font-size:.68rem;background:#ECFDF5;color:#059669;border-radius:4px;padding:.08rem .3rem;margin-left:.2rem}
  .rv-meta{display:flex;flex-wrap:wrap;gap:.32rem;margin-bottom:.45rem}
  .rv-chip{font-size:.73rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:.16rem .46rem;color:#475569}
  .rv-card-pay{font-size:.75rem;margin-bottom:.38rem;display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}
  .rv-pay{font-size:.73rem;padding:.18rem .5rem;border-radius:6px}
  .rv-pay-ok{background:#ECFDF5;color:#059669;font-weight:600}
  .rv-pay-partial{background:#FFFBEB;color:#92400E;font-weight:500}
  .rv-pay-none{background:#FEF2F2;color:#DC2626}
  .rv-montant{color:#1D4ED8;font-weight:600;font-size:.73rem}
  .rv-urg-tag{font-size:.7rem;border:1px solid;border-color:#FECACA;background:#FEF2F2;color:#DC2626;border-radius:6px;padding:.2rem .52rem;margin-bottom:.38rem;display:inline-block}
  .rv-notes{font-size:.73rem;color:#64748b;background:#f8fafc;border-radius:6px;padding:.33rem .52rem;margin-bottom:.42rem;border-left:3px solid #e2e8f0;white-space:pre-wrap}
  .rv-card-actions{display:flex;gap:.38rem;margin-top:.45rem;padding-top:.45rem;border-top:1px solid #f1f5f9}
  /* Calendrier */
  .rv-cal{background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden}
  .rv-cal-nav{display:flex;align-items:center;justify-content:space-between;padding:.75rem 1.1rem;border-bottom:1px solid #f1f5f9}
  .rv-cal-month{font-size:.97rem;font-weight:700;color:#1e293b;text-transform:capitalize}
  .rv-cal-arrow{padding:.3rem .7rem;font-size:.9rem}
  .rv-cal-hd{display:grid;grid-template-columns:repeat(7,1fr);background:#f8fafc;border-bottom:1px solid #f1f5f9}
  .rv-cal-dlbl{padding:.45rem 0;text-align:center;font-size:.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase}
  .rv-cal-week{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid #f8fafc}
  .rv-cal-cell{min-height:76px;padding:.38rem .42rem;border-right:1px solid #f8fafc;overflow:hidden}
  .rv-cal-cell:last-child{border-right:none}
  .rv-cal-empty{background:#fafafa}
  .rv-cal-today{background:#FFFBEB}
  .rv-cal-busy{background:#f8fafc}
  .rv-cal-n{font-size:.75rem;font-weight:600;color:#94a3b8;margin-bottom:.22rem;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:50%}
  .rv-cal-n-today{background:#1e293b;color:#fff}
  .rv-cal-evt{font-size:.66rem;font-weight:500;padding:.15rem .38rem;border-radius:4px;margin-bottom:.15rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  /* Gâteaux */
  .rv-gat-root{padding:.25rem 0}
  .rv-gat-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.6rem}
  .rv-gat-title{font-size:1.1rem;font-weight:700;color:#1e293b}
  .rv-gat-subtitle{font-size:.82rem;color:#6B7280;margin-top:.2rem}
  .rv-btn-nacima{background:#EC4899;color:#fff;border:none;padding:.5rem 1rem;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;text-decoration:none}
  .rv-gat-section{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;padding:.5rem 0 .4rem;border-bottom:1.5px solid #f1f5f9;margin-bottom:.75rem;margin-top:.5rem}
  .rv-gat-empty{color:#94a3b8;font-size:.87rem;padding:.75rem 0}
  .rv-gat-table-wrap{overflow-x:auto;margin-bottom:1rem}
  .rv-gat-table{width:100%;border-collapse:collapse;font-size:.8rem}
  .rv-gat-table th{background:#f8fafc;padding:.5rem .7rem;text-align:left;font-size:.72rem;font-weight:700;color:#64748b;border-bottom:1.5px solid #e2e8f0;white-space:nowrap}
  .rv-gat-table td{padding:.5rem .7rem;border-bottom:1px solid #f1f5f9;vertical-align:top;color:#1e293b}
  .rv-gat-table tr:hover td{background:#fafafa}
  .rv-gat-urgent td{background:#FFF5F5}
  .rv-gat-attention td{background:#FFFBEB}
  .rv-gat-ok{color:#059669;font-weight:600;font-size:.75rem}
  .rv-gat-todo{color:#DC2626;font-weight:600;font-size:.75rem}
  .rv-gat-na{color:#94a3b8}
  .rv-gat-manquant{color:#DC2626;font-style:italic}
  .rv-btn-sm-ok{background:#ECFDF5;color:#059669;border:1.5px solid #A7F3D0;padding:.22rem .55rem;border-radius:6px;font-size:.73rem;cursor:pointer;font-weight:600;margin-right:.3rem}
  .rv-btn-sm{background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;padding:.22rem .55rem;border-radius:6px;font-size:.73rem;cursor:pointer}
  /* Modal */
  .rv-overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,.4);z-index:900}
  .rv-overlay-open{display:block}
  .rv-modal{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(720px,96vw);max-height:92vh;overflow-y:auto;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.18);z-index:901;flex-direction:column}
  .rv-modal-open{display:flex}
  .rv-modal-hd{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.35rem;border-bottom:1px solid #e2e8f0;position:sticky;top:0;background:#fff;z-index:1;border-radius:16px 16px 0 0}
  .rv-modal-hd h3{margin:0;font-size:1rem;font-weight:700;color:#1e293b}
  .rv-modal-close{background:none;border:none;font-size:.95rem;cursor:pointer;color:#94a3b8;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center}
  .rv-modal-close:hover{background:#f1f5f9}
  .rv-modal-body{padding:1.2rem 1.35rem;flex:1}
  .rv-modal-ft{display:flex;justify-content:flex-end;gap:.6rem;padding:.85rem 1.35rem;border-top:1px solid #e2e8f0;position:sticky;bottom:0;background:#fff;border-radius:0 0 16px 16px}
  /* Formulaire */
  .rv-section{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;padding:.42rem 0 .18rem;border-bottom:1px solid #f1f5f9;margin-top:.35rem}
  .rv-section-gateau{color:#BE185D;border-color:#FBCFE8}
  .rv-section-paiement{color:#059669;border-color:#A7F3D0}
  .rv-seg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:.38rem;margin-top:.38rem}
  .rv-seg-btn{border:1.5px solid #e2e8f0;background:#fff;padding:.42rem .65rem;border-radius:8px;font-size:.79rem;cursor:pointer;transition:all .12s;text-align:left;font-weight:500;color:#475569}
  .rv-seg-btn:hover,.rv-seg-active{border-color:var(--sc)!important;background:var(--sb)!important;color:var(--sc)!important;font-weight:700}
  /* Formules anniversaire */
  .rv-formule-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.5rem;margin-top:.45rem}
  .rv-formule-card{border:2px solid #e2e8f0;border-radius:10px;padding:.65rem .8rem;cursor:pointer;transition:all .12s}
  .rv-formule-card:hover,.rv-formule-active{border-color:var(--fc)!important;background:var(--fb)!important}
  .rv-f-nom{font-size:.82rem;font-weight:700;color:#1e293b;margin-bottom:.18rem}
  .rv-f-prix{font-size:.78rem;font-weight:600;color:#475569;margin-bottom:.15rem}
  .rv-f-hr,.rv-f-min{font-size:.72rem;color:#64748b;margin-bottom:.1rem}
  .rv-f-inc{font-size:.68rem;color:#94a3b8;margin-top:.15rem;line-height:1.4}
  /* Bloc gâteau */
  .rv-gateau-bloc{background:#FDF2F8;border:1.5px solid #FBCFE8;border-radius:10px;padding:.8rem .95rem;margin-top:.4rem}
  .rv-pay-bloc{background:#F0FDF4;border:1.5px solid #A7F3D0;border-radius:10px;padding:.8rem .95rem;margin-top:.4rem}
  /* Champs */
  .rv-row{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.5rem}
  .rv-field{display:flex;flex-direction:column;gap:.25rem;flex:1;min-width:125px}
  .rv-wide{flex:100%}
  .rv-field label{font-size:.75rem;font-weight:600;color:#475569}
  .rv-field input,.rv-field select,.rv-field textarea{border:1.5px solid #e2e8f0;border-radius:8px;padding:.42rem .68rem;font-size:.845rem;color:#1e293b;background:#fff;width:100%;box-sizing:border-box;transition:border-color .12s;font-family:inherit}
  .rv-field input:focus,.rv-field select:focus,.rv-field textarea:focus{outline:none;border-color:#EC4899;box-shadow:0 0 0 3px rgba(236,72,153,.08)}
  .rv-field textarea{resize:vertical}
  .rv-hint{font-size:.68rem;color:#94a3b8;margin-top:.12rem;line-height:1.4}
  .rv-admin-tag{font-size:.62rem;background:#FEF9C3;color:#854D0E;border-radius:4px;padding:.07rem .28rem;margin-left:.22rem;vertical-align:middle}
  .rv-checks{align-items:center;flex-wrap:wrap;gap:.55rem;padding:.3rem 0}
  .rv-chk-label{display:flex;align-items:center;gap:.3rem;font-size:.8rem;color:#475569;cursor:pointer}
  .rv-chk-label input{width:auto;cursor:pointer}
  @media(max-width:640px){.rv-root{padding:.85rem}.rv-grid{grid-template-columns:1fr}.rv-stats{gap:.45rem}.rv-sv{font-size:1.15rem}.rv-seg-grid{grid-template-columns:1fr 1fr}.rv-formule-grid{grid-template-columns:1fr 1fr}}
  </style>`;}

  return {
    init,openForm,closeForm,saveForm,
    selectSeg,selectFormule,
    nextStatut,deleteRes,
    setFilter,setSegment,setView,
    prevMonth,nextMonth,
    marquerGateauCommande,openGateauCommande
  };
})();

window.ReservationsTab = ReservationsTab;
