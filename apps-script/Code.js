/**
 * MUSCU — Backend Apps Script
 * Déployé en Web App (Exécuter en tant que : moi / Accès : tout le monde).
 * Le front-end (PWA) appelle cette URL en POST et envoie le token Google du pratiquant.
 * Les pratiquants n'ont JAMAIS accès au Google Sheet : tout passe par ce script.
 */

// ─────────────────────────────────────────────────────────────
// 1. CONFIGURATION — à remplir avant le premier déploiement
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  // Client ID OAuth créé dans Google Cloud Console (voir README étape 3)
  CLIENT_ID: '765877661024-r5p4dhadda0i9eb9996ctb8298f7m6h8.apps.googleusercontent.com',
  // Email Google du coach : accès à la vue coach
  COACH_EMAIL: 'grapinat.pwts@gmail.com',
  // Poids de la barre olympique, pour l'affichage des disques
  BAR_KG: 20
};

const TABS = {
  PRATIQUANTS: 'Pratiquants',
  EXERCICES: 'Exercices',
  PROGRAMMES: 'Programmes',
  SEANCES: 'Seances',
  SERIES: 'Series'
};

const SCHEMA = {
  Pratiquants: ['email', 'nom', 'actif', 'date_inscription', 'objectif'],
  Exercices: ['id', 'nom', 'groupe', 'equipement', 'consigne', 'video'],
  Programmes: ['id', 'email', 'jour', 'bloc', 'ordre', 'exercice_id', 'series', 'reps_cible', 'duree_s', 'charge_cible', 'cadence', 'pause_s', 'repos_s'],
  Seances: ['id', 'email', 'date', 'jour', 'duree_min', 'ressenti', 'notes'],
  Series: ['id', 'seance_id', 'email', 'exercice_id', 'serie_num', 'reps', 'duree_s', 'charge', 'horodatage']
};

// ─────────────────────────────────────────────────────────────
// 2. INSTALLATION — lancer une seule fois depuis l'éditeur
// ─────────────────────────────────────────────────────────────
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
      sh.getRange(1, 1, 1, SCHEMA[name].length)
        .setFontWeight('bold').setBackground('#1C2027').setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
    }
  });

  const ex = ss.getSheetByName(TABS.EXERCICES);
  if (ex.getLastRow() === 1) {
    ex.getRange(2, 1, 7, 4).setValues([
      ['EX001', 'Développé couché', 'Pectoraux', 'Omoplates serrées, barre au niveau des tétons'],
      ['EX002', 'Squat', 'Jambes', 'Descendre sous la parallèle, dos gainé'],
      ['EX003', 'Soulevé de terre', 'Dos', 'Barre contre les tibias, dos plat au départ'],
      ['EX004', 'Tractions', 'Dos', 'Amplitude complète, pas d\'élan'],
      ['EX005', 'Développé militaire', 'Épaules', 'Abdos gainés, pas de cambrure lombaire'],
      ['EX006', 'Curl barre', 'Biceps', 'Coudes fixes le long du corps'],
      ['EX007', 'Gainage', 'Abdominaux', 'Corps aligné, bassin en rétroversion, ne pas creuser le bas du dos']
    ]);
  }

  const pr = ss.getSheetByName(TABS.PRATIQUANTS);
  if (pr.getLastRow() === 1) {
    pr.getRange(2, 1, 1, 5).setValues([
      [CONFIG.COACH_EMAIL.toLowerCase(), 'Coach', true, new Date(), 'Suivi des athlètes']
    ]);
  }
  const msg = 'Installation terminée. Onglets créés et exercices d\'exemple ajoutés.';
  Logger.log(msg);
  // getUi() n'existe que si l'éditeur a été ouvert depuis le Sheet.
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

// ─────────────────────────────────────────────────────────────
// 3. POINTS D'ENTRÉE HTTP
// ─────────────────────────────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'muscu-api' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    const user = verifyToken_(req.token);
    const profil = findPratiquant_(user.email);
    const estCoach = user.email === CONFIG.COACH_EMAIL.toLowerCase();
    if (!profil && !estCoach) throw new Error('NON_INSCRIT');
    out = { ok: true, data: route_(req.action, req.payload || {}, user, profil, estCoach) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function route_(action, p, user, profil, estCoach) {
  switch (action) {
    case 'bootstrap':      return bootstrap_(user, profil, estCoach);
    case 'seance':         return getSeance_(user.email, p.jour);
    case 'demarrer':       return demarrerSeance_(user.email, p.jour);
    case 'serie':          return logSerie_(user.email, p);
    case 'terminer':       return terminerSeance_(user.email, p);
    case 'historique':     return historique_(user.email, p.exercice_id);
    case 'calendrier':     return calendrier_(cibleEmail_(user, p, estCoach), p);
    case 'catalogue':      return catalogue_();
    case 'coachAthletes':  return guardCoach_(estCoach, coachAthletes_);
    case 'coachDetail':    return guardCoach_(estCoach, function () { return coachDetail_(p.email); });
    case 'exerciceSave':   return guardCoach_(estCoach, function () { return exerciceSave_(p); });
    case 'exerciceSuppr':  return guardCoach_(estCoach, function () { return exerciceSuppr_(p.id); });
    case 'programme':      return guardCoach_(estCoach, function () { return programme_(p.email); });
    case 'programmeSave':  return guardCoach_(estCoach, function () { return programmeSave_(p); });
    case 'programmeJour':  return guardCoach_(estCoach, function () { return programmeJourSuppr_(p); });
    default: throw new Error('ACTION_INCONNUE');
  }
}

function guardCoach_(estCoach, fn) {
  if (!estCoach) throw new Error('ACCES_REFUSE');
  return fn();
}

// ─────────────────────────────────────────────────────────────
// 4. AUTHENTIFICATION — vérification du token Google
// ─────────────────────────────────────────────────────────────
function verifyToken_(idToken) {
  if (!idToken) throw new Error('TOKEN_MANQUANT');
  const cache = CacheService.getScriptCache();
  const key = 'tk_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)
  ).substring(0, 40);

  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  const res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );
  if (res.getResponseCode() !== 200) throw new Error('TOKEN_INVALIDE');

  const p = JSON.parse(res.getContentText());
  if (p.aud !== CONFIG.CLIENT_ID) throw new Error('TOKEN_ETRANGER');
  if (Number(p.exp) * 1000 < Date.now()) throw new Error('TOKEN_EXPIRE');
  if (String(p.email_verified) !== 'true') throw new Error('EMAIL_NON_VERIFIE');

  const user = { email: String(p.email).toLowerCase(), nom: p.name || '', photo: p.picture || '' };
  cache.put(key, JSON.stringify(user), 300);
  return user;
}

// ─────────────────────────────────────────────────────────────
// 5. ACCÈS AUX DONNÉES
// ─────────────────────────────────────────────────────────────
function lire_(tab) {
  const sh = SpreadsheetApp.getActive().getSheetByName(tab);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const head = values.shift();
  return values.map(function (row) {
    const o = {};
    head.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

function ajouter_(tab, obj) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(tab);
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    sh.appendRow(head.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; }));
  } finally {
    lock.releaseLock();
  }
}

/** Ajoute plusieurs lignes d'un coup : un seul verrou, une seule écriture. */
function ajouterPlusieurs_(tab, objs) {
  if (!objs || !objs.length) return 0;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(tab);
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const rangs = objs.map(function (o) {
      return head.map(function (h) { return o[h] !== undefined ? o[h] : ''; });
    });
    sh.getRange(sh.getLastRow() + 1, 1, rangs.length, head.length).setValues(rangs);
    return rangs.length;
  } finally {
    lock.releaseLock();
  }
}

function majLigne_(tab, cleCol, cleVal, patch) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(tab);
    const values = sh.getDataRange().getValues();
    const head = values[0];
    const ci = head.indexOf(cleCol);
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][ci]) === String(cleVal)) {
        head.forEach(function (h, c) {
          if (patch[h] !== undefined) sh.getRange(r + 1, c + 1).setValue(patch[h]);
        });
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Supprime les lignes d'un onglet qui satisfont un prédicat, en remontant pour
 * que les index restent valides. Renvoie le nombre de lignes supprimées.
 */
function supprimerLignes_(tab, predicat) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(tab);
    const vals = sh.getDataRange().getValues();
    const head = vals[0];
    let n = 0;
    for (let r = vals.length - 1; r >= 1; r--) {
      const o = {};
      head.forEach(function (h, i) { o[h] = vals[r][i]; });
      if (predicat(o)) { sh.deleteRow(r + 1); n++; }
    }
    return n;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Email sur lequel porte une lecture : le sien, ou celui d'un pratiquant si
 * c'est le coach qui demande. Jamais un paramètre client pour un non-coach.
 */
function cibleEmail_(user, p, estCoach) {
  if (estCoach && p.email) return String(p.email).toLowerCase();
  return user.email;
}

function findPratiquant_(email) {
  const list = lire_(TABS.PRATIQUANTS);
  for (let i = 0; i < list.length; i++) {
    if (String(list[i].email).toLowerCase() === email && list[i].actif !== false) return list[i];
  }
  return null;
}

function uid_(prefixe) {
  return prefixe + '-' + Utilities.getUuid().substring(0, 8).toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// 6. LOGIQUE MÉTIER — pratiquant
// ─────────────────────────────────────────────────────────────
function bootstrap_(user, profil, estCoach) {
  const prog = lire_(TABS.PROGRAMMES).filter(function (l) {
    return String(l.email).toLowerCase() === user.email;
  });
  const jours = [];
  prog.forEach(function (l) { if (jours.indexOf(l.jour) === -1) jours.push(l.jour); });

  const seances = lire_(TABS.SEANCES)
    .filter(function (s) { return String(s.email).toLowerCase() === user.email; });

  return {
    email: user.email,
    nom: profil ? profil.nom : user.nom,
    objectif: profil ? profil.objectif : '',
    estCoach: estCoach,
    jours: jours.sort(triJours_),
    nbSeances: seances.length,
    derniereSeance: seances.length ? seances[seances.length - 1].date : null,
    barKg: CONFIG.BAR_KG
  };
}

/**
 * Renvoie la séance sous forme de BLOCS.
 * Un bloc regroupe les exercices qui partagent un même nombre de séries et un
 * même repos : un bloc à plusieurs exercices est un superset ou un circuit —
 * on enchaîne les exercices, le repos vient à la fin du tour.
 * `series` et `repos_s` sont lus sur la première ligne du bloc et font foi
 * pour tout le bloc ; les lignes suivantes portent leurs propres reps/charge.
 */
const SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** Trie « Lundi — Haut » avant « Jeudi — Bas » : l'alphabétique donnait l'inverse. */
function triJours_(a, b) {
  const rang = function (j) {
    const t = String(j).toLowerCase();
    for (let i = 0; i < SEMAINE.length; i++) if (t.indexOf(SEMAINE[i]) !== -1) return i;
    return 99;
  };
  const d = rang(a) - rang(b);
  return d !== 0 ? d : String(a).localeCompare(String(b));
}

function getSeance_(email, jour) {
  const exercices = {};
  lire_(TABS.EXERCICES).forEach(function (e) { exercices[e.id] = e; });

  const lignes = lire_(TABS.PROGRAMMES)
    .filter(function (l) {
      return String(l.email).toLowerCase() === email && String(l.jour) === String(jour);
    })
    .sort(function (a, b) {
      const d = numBloc_(a) - numBloc_(b);
      return d !== 0 ? d : Number(a.ordre) - Number(b.ordre);
    });

  const series = lire_(TABS.SERIES)
    .filter(function (s) { return String(s.email).toLowerCase() === email; });

  const blocs = [];
  const parNum = {};
  lignes.forEach(function (l) {
    const num = numBloc_(l);
    if (!parNum[num]) {
      parNum[num] = {
        bloc: num,
        series: Number(l.series) || 3,
        repos_s: Number(l.repos_s) || 90,
        exercices: []
      };
      blocs.push(parNum[num]);
    }
    parNum[num].exercices.push(ligneExercice_(l, parNum[num], exercices, series));
  });
  return blocs;
}

/** Numéro de bloc. Sans colonne « bloc », chaque ligne forme son propre bloc. */
function numBloc_(ligne) {
  return Number(ligne.bloc || ligne.ordre) || 1;
}

/** Détail d'un exercice ; series et repos_s sont hérités du bloc. */
function ligneExercice_(l, bloc, exercices, series) {
  const passe = series
    .filter(function (s) { return String(s.exercice_id) === String(l.exercice_id); })
    .sort(function (a, b) { return new Date(b.horodatage) - new Date(a.horodatage); })
    .slice(0, 5);

  const ex = exercices[l.exercice_id] || {};
  return {
    exercice_id: l.exercice_id,
    nom: ex.nom || l.exercice_id,
    groupe: ex.groupe || '',
    consigne: ex.consigne || '',
    bloc: bloc.bloc,
    series: bloc.series,
    repos_s: bloc.repos_s,
    reps_cible: l.reps_cible,
    // duree_s renseigné => exercice au temps, reps_cible est ignoré.
    // Valeur numérique = durée à tenir ; 'max' = jusqu'à l'échec, chrono qui monte.
    duree_s: l.duree_s === '' || l.duree_s === undefined ? null : l.duree_s,
    cadence: l.cadence || '',
    // pause_s : temps mort APRÈS cet exercice, à l'intérieur du bloc.
    // À distinguer de repos_s, qui est le repos de fin de tour, porté par le bloc.
    pause_s: Number(l.pause_s) || 0,
    charge_cible: Number(l.charge_cible) || 0,
    dernier: passe.length ? { reps: passe[0].reps, charge: Number(passe[0].charge) } : null,
    record: passe.length ? Math.max.apply(null, passe.map(function (s) { return Number(s.charge) || 0; })) : 0
  };
}

function demarrerSeance_(email, jour) {
  const id = uid_('SE');
  ajouter_(TABS.SEANCES, {
    id: id, email: email, date: new Date(), jour: jour,
    duree_min: '', ressenti: '', notes: ''
  });
  return { seance_id: id };
}

function logSerie_(email, p) {
  if (!p.seance_id) throw new Error('SEANCE_MANQUANTE');
  const reps = Number(p.reps) || 0;
  const duree = Number(p.duree_s) || 0;
  const charge = Number(p.charge);
  // Une série est valide si elle a des répétitions OU une durée tenue.
  if (!(reps > 0) && !(duree > 0)) throw new Error('VALEURS_INVALIDES');
  if (!(charge >= 0)) throw new Error('VALEURS_INVALIDES');

  ajouter_(TABS.SERIES, {
    id: uid_('SR'),
    seance_id: p.seance_id,
    email: email,
    exercice_id: p.exercice_id,
    serie_num: Number(p.serie_num) || 1,
    reps: reps || '',
    duree_s: duree || '',
    charge: charge,
    horodatage: new Date()
  });
  return { enregistre: true };
}

function terminerSeance_(email, p) {
  majLigne_(TABS.SEANCES, 'id', p.seance_id, {
    duree_min: Number(p.duree_min) || '',
    ressenti: p.ressenti || '',
    notes: p.notes || ''
  });
  return { termine: true };
}

function historique_(email, exerciceId) {
  return lire_(TABS.SERIES)
    .filter(function (s) {
      return String(s.email).toLowerCase() === email && String(s.exercice_id) === String(exerciceId);
    })
    .sort(function (a, b) { return new Date(b.horodatage) - new Date(a.horodatage); })
    .slice(0, 30)
    .map(function (s) {
      return {
        date: s.horodatage, reps: Number(s.reps),
        charge: Number(s.charge), serie: Number(s.serie_num)
      };
    });
}

// ─────────────────────────────────────────────────────────────
// 7. LOGIQUE MÉTIER — coach
// ─────────────────────────────────────────────────────────────
function coachAthletes_() {
  const seances = lire_(TABS.SEANCES);
  return lire_(TABS.PRATIQUANTS)
    .filter(function (p) {
      return p.actif !== false && String(p.email).toLowerCase() !== CONFIG.COACH_EMAIL.toLowerCase();
    })
    .map(function (p) {
      const s = seances.filter(function (x) {
        return String(x.email).toLowerCase() === String(p.email).toLowerCase();
      });
      const derniere = s.length ? s[s.length - 1].date : null;
      return {
        email: p.email, nom: p.nom, objectif: p.objectif,
        nbSeances: s.length, derniere: derniere,
        joursDepuis: derniere ? Math.floor((Date.now() - new Date(derniere)) / 86400000) : null
      };
    })
    .sort(function (a, b) { return (b.joursDepuis === null ? 999 : b.joursDepuis) - (a.joursDepuis === null ? 999 : a.joursDepuis); });
}

function coachDetail_(email) {
  const cible = String(email).toLowerCase();
  const exercices = {};
  lire_(TABS.EXERCICES).forEach(function (e) { exercices[e.id] = e.nom; });

  const series = lire_(TABS.SERIES).filter(function (s) {
    return String(s.email).toLowerCase() === cible;
  });

  return lire_(TABS.SEANCES)
    .filter(function (s) { return String(s.email).toLowerCase() === cible; })
    .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })
    .slice(0, 15)
    .map(function (s) {
      return {
        date: s.date, jour: s.jour, ressenti: s.ressenti, notes: s.notes,
        series: series
          .filter(function (x) { return String(x.seance_id) === String(s.id); })
          .map(function (x) {
            return {
              exercice: exercices[x.exercice_id] || x.exercice_id,
              serie: Number(x.serie_num), reps: Number(x.reps), charge: Number(x.charge)
            };
          })
      };
    });
}

// ─────────────────────────────────────────────────────────────
// 7 bis. BIBLIOTHÈQUE D'EXERCICES — édition par le coach
// ─────────────────────────────────────────────────────────────

/** Catalogue complet, trié par groupe puis par nom. Lisible par tous. */
function catalogue_() {
  return lire_(TABS.EXERCICES)
    .filter(function (e) { return e.id !== '' && e.id !== null; })
    .map(function (e) {
      return {
        id: e.id, nom: e.nom, groupe: e.groupe || '',
        equipement: e.equipement || '', consigne: e.consigne || '', video: e.video || ''
      };
    })
    .sort(function (a, b) {
      const g = String(a.groupe).localeCompare(String(b.groupe), 'fr');
      return g !== 0 ? g : String(a.nom).localeCompare(String(b.nom), 'fr');
    });
}

/** Identifiant EXnnn suivant, en repartant du plus grand existant. */
function idExerciceSuivant_() {
  let max = 0;
  lire_(TABS.EXERCICES).forEach(function (e) {
    const m = /^EX(\d+)$/.exec(String(e.id));
    if (m && Number(m[1]) > max) max = Number(m[1]);
  });
  return 'EX' + String(max + 1).padStart(3, '0');
}

/** Crée ou met à jour un exercice. Sans `id`, c'est une création. */
function exerciceSave_(p) {
  const nom = String(p.nom || '').trim();
  if (!nom) throw new Error('NOM_REQUIS');

  const champs = {
    nom: nom,
    groupe: String(p.groupe || '').trim(),
    equipement: String(p.equipement || '').trim(),
    consigne: String(p.consigne || '').trim(),
    video: String(p.video || '').trim()
  };

  if (p.id) {
    if (!majLigne_(TABS.EXERCICES, 'id', p.id, champs)) throw new Error('EXERCICE_INTROUVABLE');
    return { id: p.id, cree: false };
  }
  const id = idExerciceSuivant_();
  champs.id = id;
  ajouter_(TABS.EXERCICES, champs);
  return { id: id, cree: true };
}

/** Refuse la suppression d'un exercice encore employé dans un programme. */
function exerciceSuppr_(id) {
  if (!id) throw new Error('ID_REQUIS');
  const usages = lire_(TABS.PROGRAMMES).filter(function (l) {
    return String(l.exercice_id) === String(id);
  }).length;
  if (usages) throw new Error('EXERCICE_UTILISE_' + usages);

  const n = supprimerLignes_(TABS.EXERCICES, function (e) { return String(e.id) === String(id); });
  if (!n) throw new Error('EXERCICE_INTROUVABLE');
  return { supprime: true };
}

// ─────────────────────────────────────────────────────────────
// 7 ter. PROGRAMMATION — le coach compose depuis l'app
// ─────────────────────────────────────────────────────────────

/**
 * Programme complet d'un pratiquant, groupé par jour puis par bloc.
 * Même forme que getSeance_ mais sans les perfs passées : c'est une vue d'édition.
 */
function programme_(email) {
  const cible = String(email || '').toLowerCase();
  if (!cible) throw new Error('EMAIL_REQUIS');

  const noms = {};
  lire_(TABS.EXERCICES).forEach(function (e) { noms[e.id] = e.nom; });

  const lignes = lire_(TABS.PROGRAMMES)
    .filter(function (l) { return String(l.email).toLowerCase() === cible; })
    .sort(function (a, b) {
      const j = triJours_(a.jour, b.jour);
      if (j !== 0) return j;
      const d = numBloc_(a) - numBloc_(b);
      return d !== 0 ? d : Number(a.ordre) - Number(b.ordre);
    });

  const jours = [];
  const parJour = {};
  lignes.forEach(function (l) {
    const j = String(l.jour);
    if (!parJour[j]) { parJour[j] = { jour: j, blocs: [], _n: {} }; jours.push(parJour[j]); }
    const num = numBloc_(l);
    if (!parJour[j]._n[num]) {
      parJour[j]._n[num] = {
        bloc: num, series: Number(l.series) || 3, repos_s: Number(l.repos_s) || 90, exercices: []
      };
      parJour[j].blocs.push(parJour[j]._n[num]);
    }
    parJour[j]._n[num].exercices.push({
      exercice_id: l.exercice_id,
      nom: noms[l.exercice_id] || l.exercice_id,
      reps_cible: l.reps_cible === undefined ? '' : String(l.reps_cible),
      duree_s: l.duree_s === '' || l.duree_s === undefined ? '' : l.duree_s,
      charge_cible: Number(l.charge_cible) || 0,
      cadence: l.cadence || '',
      pause_s: Number(l.pause_s) || 0
    });
  });
  jours.forEach(function (j) { delete j._n; });
  return { email: cible, jours: jours };
}

/**
 * Réécrit UN jour du programme d'un pratiquant : les lignes existantes de ce
 * couple (email, jour) sont supprimées puis remplacées. Les autres jours et les
 * autres pratiquants ne sont pas touchés.
 * p : {email, jour, blocs:[{series, repos_s, exercices:[{exercice_id, reps_cible,
 *      duree_s, charge_cible, cadence, pause_s}]}]}
 */
function programmeSave_(p) {
  const email = String(p.email || '').toLowerCase();
  const jour = String(p.jour || '').trim();
  if (!email) throw new Error('EMAIL_REQUIS');
  if (!jour) throw new Error('JOUR_REQUIS');
  if (!findPratiquant_(email)) throw new Error('PRATIQUANT_INCONNU');
  const blocs = p.blocs || [];
  if (!blocs.length) throw new Error('PROGRAMME_VIDE');

  const connus = {};
  lire_(TABS.EXERCICES).forEach(function (e) { connus[String(e.id)] = true; });

  const rangs = [];
  blocs.forEach(function (b, bi) {
    (b.exercices || []).forEach(function (e, ei) {
      if (!connus[String(e.exercice_id)]) throw new Error('EXERCICE_INCONNU_' + e.exercice_id);
      rangs.push({
        id: uid_('PR'), email: email, jour: jour,
        bloc: bi + 1, ordre: ei + 1,
        exercice_id: e.exercice_id,
        series: Number(b.series) || 3,
        reps_cible: e.reps_cible === undefined ? '' : e.reps_cible,
        duree_s: e.duree_s === undefined ? '' : e.duree_s,
        charge_cible: Number(e.charge_cible) || 0,
        cadence: e.cadence || '',
        pause_s: Number(e.pause_s) || 0,
        repos_s: Number(b.repos_s) || 90
      });
    });
  });
  if (!rangs.length) throw new Error('PROGRAMME_VIDE');

  supprimerLignes_(TABS.PROGRAMMES, function (l) {
    return String(l.email).toLowerCase() === email && String(l.jour) === jour;
  });
  ajouterPlusieurs_(TABS.PROGRAMMES, rangs);
  return { lignes: rangs.length };
}

/** Supprime un jour entier du programme d'un pratiquant. */
function programmeJourSuppr_(p) {
  const email = String(p.email || '').toLowerCase();
  const jour = String(p.jour || '').trim();
  if (!email || !jour) throw new Error('PARAMS_REQUIS');
  const n = supprimerLignes_(TABS.PROGRAMMES, function (l) {
    return String(l.email).toLowerCase() === email && String(l.jour) === jour;
  });
  return { supprimees: n };
}

// ─────────────────────────────────────────────────────────────
// 7 quater. CALENDRIER
// ─────────────────────────────────────────────────────────────

/**
 * Séances d'une période, avec leur volume. Le coach peut viser un pratiquant
 * via p.email ; un pratiquant ne voit que les siennes (cf. cibleEmail_).
 * p : {depuis, jusqua} en ISO ; par défaut les 120 derniers jours.
 */
function calendrier_(email, p) {
  const fin = p && p.jusqua ? new Date(p.jusqua) : new Date();
  const debut = p && p.depuis ? new Date(p.depuis) : new Date(fin.getTime() - 120 * 86400000);

  const series = lire_(TABS.SERIES).filter(function (s) {
    return String(s.email).toLowerCase() === email;
  });

  return lire_(TABS.SEANCES)
    .filter(function (s) {
      if (String(s.email).toLowerCase() !== email) return false;
      const d = new Date(s.date);
      return d >= debut && d <= fin;
    })
    .map(function (s) {
      const mien = series.filter(function (x) { return String(x.seance_id) === String(s.id); });
      let volume = 0;
      mien.forEach(function (x) { volume += (Number(x.reps) || 0) * (Number(x.charge) || 0); });
      return {
        id: s.id,
        date: s.date,
        jour: s.jour,
        duree_min: Number(s.duree_min) || 0,
        ressenti: s.ressenti || '',
        notes: s.notes || '',
        nbSeries: mien.length,
        volume: Math.round(volume)
      };
    })
    .sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
}

// ─────────────────────────────────────────────────────────────
// 8. AUTOMATISATIONS CÔTÉ COACH (menu dans le Sheet)
// ─────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Muscu')
    .addItem('Installer les onglets', 'setup')
    .addItem('Rapport hebdomadaire', 'rapportHebdo')
    .addSeparator()
    .addItem('Charger le programme de test', 'programmeTest')
    .addItem('Recharger le programme de test (remplace)', 'rechargerProgrammeTest')
    .addSeparator()
    .addItem('Migration : aligner les colonnes', 'migrerSchema')
    .addToUi();
}

/** Liste les pratiquants sans séance depuis 10 jours et envoie un mail au coach. */
function rapportHebdo() {
  const inactifs = coachAthletes_().filter(function (a) {
    return a.joursDepuis === null || a.joursDepuis >= 10;
  });
  if (!inactifs.length) return;

  const corps = inactifs.map(function (a) {
    return '• ' + a.nom + ' (' + a.email + ') — ' +
      (a.joursDepuis === null ? 'aucune séance enregistrée' : a.joursDepuis + ' jours sans séance');
  }).join('\n');

  MailApp.sendEmail(
    CONFIG.COACH_EMAIL,
    'Muscu — ' + inactifs.length + ' pratiquant(s) à relancer',
    'Pratiquants sans séance depuis au moins 10 jours :\n\n' + corps
  );
}

// ─────────────────────────────────────────────────────────────
// 9. MIGRATION — à lancer une fois sur un Sheet déjà installé
// ─────────────────────────────────────────────────────────────

/**
 * Aligne les onglets existants sur SCHEMA : toute colonne déclarée mais absente
 * est ajoutée à la fin de l'onglet. Les colonnes sont lues par leur nom, jamais
 * par leur position : ajouter en fin de tableau ne casse rien.
 * Cas particulier : « bloc » vide reprend la valeur de « ordre », ce qui donne à
 * chaque ligne existante son propre bloc — comportement identique à avant.
 * Relançable, ne supprime jamais rien.
 */
function migrerSchema() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const rapport = [];

    Object.keys(SCHEMA).forEach(function (nom) {
      const sh = ss.getSheetByName(nom);
      if (!sh) return;
      let head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

      const manquantes = SCHEMA[nom].filter(function (c) { return head.indexOf(c) === -1; });
      manquantes.forEach(function (col) {
        const c = head.length + 1;
        sh.getRange(1, c).setValue(col)
          .setFontWeight('bold').setBackground('#1C2027').setFontColor('#FFFFFF');
        head = head.concat([col]);
      });
      if (manquantes.length) rapport.push(nom + ' : + ' + manquantes.join(', '));

      // Reprise de « bloc » depuis « ordre »
      const n = sh.getLastRow() - 1;
      if (nom === TABS.PROGRAMMES && n >= 1) {
        const bi = head.indexOf('bloc'), oi = head.indexOf('ordre');
        if (bi !== -1 && oi !== -1) {
          const vals = sh.getRange(2, 1, n, head.length).getValues();
          let touchees = 0;
          for (let r = 0; r < n; r++) {
            if (vals[r][bi] === '' || vals[r][bi] === null) {
              vals[r][bi] = vals[r][oi] || 1;
              touchees++;
            }
          }
          if (touchees) {
            sh.getRange(2, 1, n, head.length).setValues(vals);
            rapport.push('Programmes : ' + touchees + ' ligne(s) ont reçu un bloc');
          }
        }
      }
    });

    return finMigration_(rapport.length ? rapport.join('\n') : 'Rien à migrer, tout est à jour.');
  } finally {
    lock.releaseLock();
  }
}

function finMigration_(msg) {
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Migration des blocs\n\n' + msg); } catch (e) {}
  return msg;
}

// ─────────────────────────────────────────────────────────────
// 10. JEU D'ESSAI — programme de test, à lancer depuis le menu
// ─────────────────────────────────────────────────────────────

/** Comptes qui reçoivent le programme de test (cf. utilisateurs tests OAuth). */
const TEST_EMAILS = ['grapinat.pwts@gmail.com', 'guillaume.rapinat@gmail.com'];

/**
 * Deux jours bâtis sur les exercices d'exemple. Le jeu d'essai couvre les quatre
 * notions : bloc simple, superset, cadence, et exercice au temps.
 *  - Lundi bloc 2 : superset développé militaire + tractions, 20 s de pause entre
 *    les deux, 90 s de repos une fois le tour terminé.
 *  - Jeudi bloc 2 : soulevé de terre puis gainage tenu 45 s.
 * Cadence en quatre temps : montée · position haute · descente · position basse.
 * « 1-0-3-1 » = montée en 1 s, pas d'arrêt en haut, descente en 3 s, 1 s en bas.
 * Charges choisies pour tomber juste en disques réglementaires sur une barre de
 * 20 kg : 60 → 20 par côté, 80 → 25+5, 100 → 25+15.
 * [jour, bloc, ordre, exercice_id, series, reps_cible, duree_s, charge_cible, cadence, pause_s, repos_s]
 */
const PROGRAMME_TEST = [
  ['Lundi — Haut', 1, 1, 'EX001', 4, '8-10', '',  60, '1-0-3-1',  0, 120],
  ['Lundi — Haut', 2, 1, 'EX005', 3, '10',   '',  30, '1-1-2-0', 20,  90],
  ['Lundi — Haut', 2, 2, 'EX004', 3, 'max',  '',   0, '1-1-2-0',  0,  90],
  ['Lundi — Haut', 3, 1, 'EX006', 3, '12',   '',  30, '1-0-2-0',  0,  60],
  ['Jeudi — Bas',  1, 1, 'EX002', 5, '5',    '',  80, '1-0-3-1',  0, 180],
  ['Jeudi — Bas',  2, 1, 'EX003', 3, '5',    '', 100, '1-0-2-0', 30, 180],
  ['Jeudi — Bas',  2, 2, 'EX007', 3, '',     45,   0, '',         0, 120]
];

/** Ajoute le gainage au catalogue s'il n'y est pas : setup() ne resème pas. */
function assurerGainage_() {
  const deja = lire_(TABS.EXERCICES).some(function (e) { return String(e.id) === 'EX007'; });
  if (deja) return false;
  ajouter_(TABS.EXERCICES, {
    id: 'EX007', nom: 'Gainage', groupe: 'Abdominaux',
    consigne: 'Corps aligné, bassin en rétroversion, ne pas creuser le bas du dos'
  });
  return true;
}

/**
 * Inscrit les comptes de test et leur pose le programme ci-dessus.
 * Relançable : un email qui a déjà des lignes dans Programmes est ignoré,
 * rien n'est jamais supprimé. Pour repartir de zéro : rechargerProgrammeTest().
 */
function programmeTest() {
  const existants = lire_(TABS.PROGRAMMES);
  const rapport = [];
  if (assurerGainage_()) rapport.push('EX007 Gainage ajouté au catalogue');

  TEST_EMAILS.forEach(function (raw) {
    const email = String(raw).toLowerCase();

    if (!findPratiquant_(email)) {
      ajouter_(TABS.PRATIQUANTS, {
        email: email, nom: email.split('@')[0], actif: true,
        date_inscription: new Date(), objectif: 'Compte de test'
      });
      rapport.push(email + ' : inscrit dans Pratiquants');
    }

    const dejaLa = existants.some(function (l) {
      return String(l.email).toLowerCase() === email;
    });
    if (dejaLa) {
      rapport.push(email + ' : programme déjà présent, ignoré');
      return;
    }

    PROGRAMME_TEST.forEach(function (p) {
      ajouter_(TABS.PROGRAMMES, {
        id: uid_('PR'), email: email, jour: p[0], bloc: p[1], ordre: p[2],
        exercice_id: p[3], series: p[4], reps_cible: p[5], duree_s: p[6],
        charge_cible: p[7], cadence: p[8], pause_s: p[9], repos_s: p[10]
      });
    });
    rapport.push(email + ' : ' + PROGRAMME_TEST.length + ' lignes ajoutées');
  });

  const msg = rapport.join('\n');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Jeu d\'essai\n\n' + msg); } catch (e) {}
  return msg;
}

/**
 * Efface les lignes de Programmes des SEULS comptes de test, puis les repose.
 * Ne touche à aucun autre pratiquant. Utile après une modification de
 * PROGRAMME_TEST — par exemple pour faire apparaître les blocs.
 */
function rechargerProgrammeTest() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cibles = TEST_EMAILS.map(function (e) { return String(e).toLowerCase(); });
    const sh = SpreadsheetApp.getActive().getSheetByName(TABS.PROGRAMMES);
    const vals = sh.getDataRange().getValues();
    const ei = vals[0].indexOf('email');
    let supprimees = 0;
    for (let r = vals.length - 1; r >= 1; r--) {
      if (cibles.indexOf(String(vals[r][ei]).toLowerCase()) !== -1) {
        sh.deleteRow(r + 1);
        supprimees++;
      }
    }
    Logger.log(supprimees + ' ligne(s) de test supprimée(s)');
  } finally {
    lock.releaseLock();
  }
  return programmeTest();
}
