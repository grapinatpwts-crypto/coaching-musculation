/**
 * COACHING FITNESS — Backend Apps Script
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
  // Nom affiché du coach, signature des messages envoyés aux pratiquants
  COACH_NOM: 'Jérémy',
  // Adresse publique de l'app, glissée dans les messages de notification
  APP_URL: 'https://grapinatpwts-crypto.github.io/coaching-musculation/',
  // Poids de la barre olympique, pour l'affichage des disques
  BAR_KG: 20
};

const TABS = {
  PRATIQUANTS: 'Pratiquants',
  EXERCICES: 'Exercices',
  MODELES: 'Modeles',
  MODELE_LIGNES: 'ModeleLignes',
  ATTRIBUTIONS: 'Attributions',
  MAXIS: 'Maxis',
  AJUSTEMENTS: 'Ajustements',
  IMPORT: 'Import',
  PROGRAMMES: 'Programmes',
  SEANCES: 'Seances',
  SERIES: 'Series'
};

/** Statuts d'une attribution. Un seul « En cours » par pratiquant à la fois. */
const STATUTS = { COURS: 'En cours', TERMINE: 'Terminé', ARCHIVE: 'Archivé' };

/** Statuts d'un pratiquant, du plus ouvert au plus fermé. */
const ETATS = { NOUVEAU: 'Nouveau', ACTIF: 'Actif', INACTIF: 'Inactif', ARCHIVE: 'Archivé' };

/** Actions qui écrivent pour le compte d'un pratiquant : refusées si Inactif. */
const ECRITURES_PRATIQUANT = ['demarrer', 'serie', 'terminer', 'finirExercice',
                              'reprendreExercice', 'ajuster'];

const SCHEMA = {
  // statut : Nouveau (inscrit, pas encore de programme démarré), Actif,
  // Inactif (accès en lecture seule), Archivé (plus d'accès, données conservées).
  Pratiquants: ['email', 'nom', 'statut', 'telephone', 'date_inscription', 'objectif', 'notes', 'actif'],
  Exercices: ['id', 'nom', 'nom_en', 'groupe', 'equipement', 'consigne', 'photo', 'video'],
  // Modèles : programmes génériques, sans pratiquant. Le coach les compose une fois.
  Modeles: ['id', 'nom', 'categorie', 'difficulte', 'description', 'duree_semaines', 'statut', 'source', 'video', 'cree_le'],
  ModeleLignes: ['id', 'modele_id', 'jour', 'bloc', 'ordre', 'exercice_id', 'series', 'reps_cible', 'duree_s', 'charge_cible', 'pct_rm', 'cadence', 'pause_s', 'repos_s'],
  // Maxis : le 1RM connu d'un pratiquant sur un exercice. Sert à traduire un
  // pourcentage en kilos. Sans entrée ici, le 1RM est estimé depuis l'historique.
  Maxis: ['id', 'email', 'exercice_id', 'rm_kg', 'date', 'source'],
  // Attribution : un modèle donné à un pratiquant à une date. Le même modèle peut
  // être attribué plusieurs fois au même pratiquant au fil du temps.
  Attributions: ['id', 'email', 'modele_id', 'nom', 'date_debut', 'date_fin', 'statut', 'paye', 'notes', 'cree_le'],
  // Ajustements : la charge que le pratiquant se fixe lui-même, exercice par
  // exercice. Elle prime sur la charge du coach et sur le calcul en % du max.
  Ajustements: ['id', 'email', 'attribution_id', 'exercice_id', 'charge', 'note', 'maj_le'],
  // Import : zone de dépôt. On y colle un programme composé dans le tableur, les
  // exercices désignés par leur NOM. Rien n'y est conservé, c'est un sas.
  Import: ['jour', 'bloc', 'ordre', 'exercice', 'series', 'reps_cible', 'duree_s',
           'charge_cible', 'pct_rm', 'cadence', 'pause_s', 'repos_s'],
  // Programmes : les lignes RÉELLES d'une attribution, personnalisables sans
  // toucher au modèle dont elles sont issues.
  Programmes: ['id', 'attribution_id', 'email', 'jour', 'bloc', 'ordre', 'exercice_id', 'series', 'reps_cible', 'duree_s', 'charge_cible', 'pct_rm', 'cadence', 'pause_s', 'repos_s'],
  Seances: ['id', 'email', 'date', 'jour', 'duree_min', 'ressenti', 'notes', 'exercices_finis'],
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
  return msg;
}

// ─────────────────────────────────────────────────────────────
// 3. POINTS D'ENTRÉE HTTP
// ─────────────────────────────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'coaching-fitness-api' }))
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

    // Un compte archivé n'accède plus à rien ; un compte inactif garde la lecture.
    if (!estCoach && profil) {
      const etat = String(profil.statut || ETATS.ACTIF);
      if (etat === ETATS.ARCHIVE) throw new Error('COMPTE_ARCHIVE');
      if (etat === ETATS.INACTIF && ECRITURES_PRATIQUANT.indexOf(req.action) !== -1) {
        throw new Error('COMPTE_INACTIF');
      }
    }
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
    case 'finirExercice':  return finirExercice_(user.email, p);
    case 'reprendreExercice': return reprendreExercice_(user.email, p);
    case 'historique':     return historique_(user.email, p.exercice_id);
    case 'ajuster':        return ajuster_(user.email, p);
    case 'calendrier':     return calendrier_(cibleEmail_(user, p, estCoach), p);
    case 'catalogue':      return catalogue_();
    case 'coachAthletes':  return guardCoach_(estCoach, coachAthletes_);
    case 'pratiquant':     return guardCoach_(estCoach, function () { return pratiquant_(p.email); });
    case 'pratiquantSave': return guardCoach_(estCoach, function () { return pratiquantSave_(p); });
    case 'pratiquantCreer':return guardCoach_(estCoach, function () { return pratiquantCreer_(p); });
    case 'messageType':    return guardCoach_(estCoach, function () { return messageType_(p); });
    case 'notifierMail':   return guardCoach_(estCoach, function () { return notifierMail_(p); });
    case 'coachDetail':    return guardCoach_(estCoach, function () { return coachDetail_(p.email); });
    case 'exerciceSave':   return guardCoach_(estCoach, function () { return exerciceSave_(p); });
    case 'exerciceSuppr':  return guardCoach_(estCoach, function () { return exerciceSuppr_(p.id); });
    case 'programme':      return guardCoach_(estCoach, function () { return programme_(p); });
    case 'programmeSave':  return guardCoach_(estCoach, function () { return programmeSave_(p); });
    case 'programmeJour':  return guardCoach_(estCoach, function () { return programmeJourSuppr_(p); });
    case 'modeles':        return guardCoach_(estCoach, modeles_);
    case 'modele':         return guardCoach_(estCoach, function () { return modele_(p.id); });
    case 'modeleSave':     return guardCoach_(estCoach, function () { return modeleSave_(p); });
    case 'modeleJourSave': return guardCoach_(estCoach, function () { return modeleJourSave_(p); });
    case 'modeleJour':     return guardCoach_(estCoach, function () { return modeleJourSuppr_(p); });
    case 'modeleSuppr':    return guardCoach_(estCoach, function () { return modeleSuppr_(p.id); });
    case 'attributions':   return guardCoach_(estCoach, function () { return attributions_(p.email); });
    case 'attribuer':      return guardCoach_(estCoach, function () { return attribuer_(p); });
    case 'attributionMaj': return guardCoach_(estCoach, function () { return attributionMaj_(p); });
    case 'attributionSuppr': return guardCoach_(estCoach, function () { return attributionSuppr_(p.id); });
    // Maintenance : les mêmes fonctions que le menu du Sheet, joignables depuis l'app.
    // Le menu n'existe pas dans Sheets mobile, le coach doit pouvoir s'en passer.
    case 'maxis':          return maxis_(cibleEmail_(user, p, estCoach));
    case 'maxiSave':       return guardCoach_(estCoach, function () { return maxiSave_(p); });
    case 'maxiSuppr':      return guardCoach_(estCoach, function () { return maxiSuppr_(p); });
    case 'maintenance':    return guardCoach_(estCoach, function () { return maintenance_(p.op, p.fiche); });
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
/**
 * Feuille d'un onglet, créée à la volée depuis SCHEMA si elle manque.
 * L'app ne doit jamais dépendre d'une migration pour démarrer : un onglet
 * déclaré mais absent est créé vide, pas une erreur.
 */
/**
 * Colonnes que le Sheet ne doit surtout pas interpréter : « 8-10 » deviendrait
 * le 8 octobre, « 1-0-3-1 » une date elle aussi. On les force en texte brut.
 */
const COLONNES_TEXTE = ['reps_cible', 'cadence', 'duree_s', 'pct_rm'];

function forcerTexte_(sh, head) {
  const n = Math.max(sh.getMaxRows() - 1, 1);
  COLONNES_TEXTE.forEach(function (c) {
    const i = head.indexOf(c);
    if (i !== -1) sh.getRange(2, i + 1, n, 1).setNumberFormat('@');
  });
}

function feuille_(tab) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(tab);
  if (!sh && SCHEMA[tab]) {
    sh = ss.insertSheet(tab);
    sh.getRange(1, 1, 1, SCHEMA[tab].length).setValues([SCHEMA[tab]])
      .setFontWeight('bold').setBackground('#1C2027').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    forcerTexte_(sh, SCHEMA[tab]);
    return sh;
  }
  if (sh && SCHEMA[tab]) {
    if (ajouterColonnesManquantes_(sh, SCHEMA[tab])) {
      forcerTexte_(sh, sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]);
    }
  }
  return sh;
}

/**
 * Répare une valeur que le Sheet a transformée en date malgré tout.
 * « 8-10 » relu en Date du 8 octobre redevient « 8-10 ».
 */
function repsTexte_(v) {
  if (v instanceof Date) return v.getDate() + '-' + (v.getMonth() + 1);
  return v === undefined || v === null ? '' : String(v);
}

/**
 * Complète l'en-tête d'un onglet avec les colonnes déclarées mais absentes.
 * Sans ça, une valeur écrite dans une colonne non créée serait silencieusement
 * perdue : `ajouter_` et `majLigne_` travaillent par nom de colonne.
 */
function ajouterColonnesManquantes_(sh, colonnes) {
  const largeur = sh.getLastColumn();
  const head = largeur ? sh.getRange(1, 1, 1, largeur).getValues()[0] : [];
  const manquantes = colonnes.filter(function (c) { return head.indexOf(c) === -1; });
  if (!manquantes.length) return 0;
  sh.getRange(1, head.length + 1, 1, manquantes.length).setValues([manquantes])
    .setFontWeight('bold').setBackground('#1C2027').setFontColor('#FFFFFF');
  return manquantes.length;
}

function lire_(tab) {
  const sh = SpreadsheetApp.getActive().getSheetByName(tab);
  if (!sh) return [];                       // onglet pas encore créé : rien à lire
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
    const sh = feuille_(tab);
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
    const sh = feuille_(tab);
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
    const sh = feuille_(tab);
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
    if (!sh) return 0;
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
    if (String(list[i].email).toLowerCase() === email) return list[i];
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
  const prog = lignesProgramme_(user.email);
  const jours = [];
  prog.forEach(function (l) { if (jours.indexOf(l.jour) === -1) jours.push(l.jour); });

  const seances = lire_(TABS.SEANCES)
    .filter(function (s) { return String(s.email).toLowerCase() === user.email; });

  return {
    email: user.email,
    nom: profil ? profil.nom : user.nom,
    objectif: profil ? profil.objectif : '',
    estCoach: estCoach,
    coach: CONFIG.COACH_NOM,
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

/** Attribution « En cours » d'un pratiquant ; la plus récente s'il y en a plusieurs. */
function attributionActive_(email) {
  const list = lire_(TABS.ATTRIBUTIONS).filter(function (a) {
    return String(a.email).toLowerCase() === email && String(a.statut) === STATUTS.COURS;
  });
  if (!list.length) return null;
  return list.sort(function (a, b) { return new Date(b.date_debut) - new Date(a.date_debut); })[0];
}

/**
 * Lignes du programme en vigueur pour un pratiquant. Sans attribution active,
 * on retombe sur les lignes non rattachées : un Sheet non migré continue de marcher.
 */
function lignesProgramme_(email) {
  const toutes = lire_(TABS.PROGRAMMES).filter(function (l) {
    return String(l.email).toLowerCase() === email;
  });
  const att = attributionActive_(email);
  if (!att) return toutes.filter(function (l) { return !l.attribution_id; });
  return toutes.filter(function (l) { return String(l.attribution_id) === String(att.id); });
}

/** Arrondi au plus proche multiple de 2,5 kg : le plus petit saut réel sur une barre. */
function arrondiCharge_(kg) {
  return Math.round(Number(kg) / 2.5) * 2.5;
}

/**
 * 1RM connu ou estimé, par exercice, pour un pratiquant.
 * Une entrée dans `Maxis` fait foi. Sinon on estime depuis les séries réalisées,
 * par la formule d'Epley : 1RM ≈ charge × (1 + reps / 30). On retient la meilleure
 * estimation, pas la plus récente : un maxi ne se perd pas d'une séance à l'autre.
 */
function maxisPour_(email) {
  const out = {};

  lire_(TABS.SERIES)
    .filter(function (s) { return String(s.email).toLowerCase() === email; })
    .forEach(function (s) {
      const charge = Number(s.charge) || 0;
      const reps = Number(s.reps) || 0;
      if (charge <= 0 || reps <= 0 || reps > 15) return;   // au-delà, Epley dérive
      const est = charge * (1 + reps / 30);
      const cle = String(s.exercice_id);
      if (!out[cle] || est > out[cle].kg) {
        out[cle] = { kg: Math.round(est * 10) / 10, source: 'estimé', date: s.horodatage };
      }
    });

  // Un maxi saisi par le coach prime sur toute estimation.
  lire_(TABS.MAXIS)
    .filter(function (m) { return String(m.email).toLowerCase() === email; })
    .forEach(function (m) {
      const kg = Number(m.rm_kg) || 0;
      if (kg > 0) out[String(m.exercice_id)] = { kg: kg, source: m.source || 'mesuré', date: m.date };
    });

  return out;
}

/** Séance du jour non terminée, s'il y en a une. Sert à reprendre après un rechargement. */
function seanceOuverte_(email, jour) {
  const minuit = new Date(); minuit.setHours(0, 0, 0, 0);
  const list = lire_(TABS.SEANCES).filter(function (s) {
    return String(s.email).toLowerCase() === email &&
           String(s.jour) === String(jour) &&
           new Date(s.date) >= minuit &&
           (s.duree_min === '' || s.duree_min === null || s.duree_min === undefined);
  });
  return list.length ? list[list.length - 1] : null;
}

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

  const lignes = lignesProgramme_(email)
    .filter(function (l) { return String(l.jour) === String(jour); })
    .sort(function (a, b) {
      const d = numBloc_(a) - numBloc_(b);
      return d !== 0 ? d : Number(a.ordre) - Number(b.ordre);
    });

  const series = lire_(TABS.SERIES)
    .filter(function (s) { return String(s.email).toLowerCase() === email; });
  const maxis = maxisPour_(email);

  const attCourante = attributionActive_(email);
  const ajustes = ajustements_(email, attCourante ? attCourante.id : '');

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
    parNum[num].exercices.push(ligneExercice_(l, parNum[num], exercices, series, maxis, ajustes));
  });

  // Reprise : si une séance du jour est ouverte, on renvoie son identifiant et
  // les séries déjà saisies. Sans ça, un rechargement remettait les compteurs à zéro
  // alors que les données étaient bien enregistrées.
  const ouverte = seanceOuverte_(email, jour);
  const faits = {};
  const finis = ouverte ? listeFinis_(ouverte) : [];
  if (ouverte) {
    series.filter(function (s) { return String(s.seance_id) === String(ouverte.id); })
      .sort(function (a, b) { return Number(a.serie_num) - Number(b.serie_num); })
      .forEach(function (s) {
        (faits[s.exercice_id] = faits[s.exercice_id] || []).push({
          reps: Number(s.reps) || 0,
          charge: Number(s.charge) || 0,
          duree_s: Number(s.duree_s) || 0
        });
      });
  }
  return {
    seance_id: ouverte ? ouverte.id : null,
    debut: ouverte ? ouverte.date : null,
    faits: faits,
    finis: finis,
    blocs: blocs
  };
}

/** Exercices déjà clos dans une séance, colonne `exercices_finis` (liste séparée par des virgules). */
function listeFinis_(seance) {
  return String(seance.exercices_finis || '')
    .split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}

function seanceParId_(email, id) {
  const s = lire_(TABS.SEANCES).filter(function (x) {
    return String(x.id) === String(id) && String(x.email).toLowerCase() === email;
  })[0];
  if (!s) throw new Error('SEANCE_INTROUVABLE');
  return s;
}

/**
 * Clôt un exercice sans exiger que toutes les séries soient faites : le pratiquant
 * décide qu'il en a terminé. Les séries déjà saisies sont conservées.
 */
function finirExercice_(email, p) {
  if (!p.seance_id || !p.exercice_id) throw new Error('PARAMS_REQUIS');
  const s = seanceParId_(email, p.seance_id);
  const finis = listeFinis_(s);
  if (finis.indexOf(String(p.exercice_id)) === -1) finis.push(String(p.exercice_id));
  majLigne_(TABS.SEANCES, 'id', p.seance_id, { exercices_finis: finis.join(',') });
  return { finis: finis };
}

/** Rouvre un exercice clos par erreur. */
function reprendreExercice_(email, p) {
  if (!p.seance_id || !p.exercice_id) throw new Error('PARAMS_REQUIS');
  const s = seanceParId_(email, p.seance_id);
  const finis = listeFinis_(s).filter(function (x) { return x !== String(p.exercice_id); });
  majLigne_(TABS.SEANCES, 'id', p.seance_id, { exercices_finis: finis.join(',') });
  return { finis: finis };
}

/** Numéro de bloc. Sans colonne « bloc », chaque ligne forme son propre bloc. */
function numBloc_(ligne) {
  return Number(ligne.bloc || ligne.ordre) || 1;
}

/** Détail d'un exercice ; series et repos_s sont hérités du bloc. */
/** Ajustements de charge du pratiquant, indexés par exercice, pour une attribution. */
function ajustements_(email, attributionId) {
  const out = {};
  lire_(TABS.AJUSTEMENTS).forEach(function (a) {
    if (String(a.email).toLowerCase() !== email) return;
    if (attributionId && a.attribution_id && String(a.attribution_id) !== String(attributionId)) return;
    out[String(a.exercice_id)] = Number(a.charge) || 0;
  });
  return out;
}

/**
 * Le pratiquant fixe sa propre charge sur un exercice. Elle prime sur celle du
 * coach et sur le calcul en pourcentage du max : c'est lui qui est sous la barre.
 * Une charge nulle ou vide efface l'ajustement et rend la main au programme.
 */
function ajuster_(email, p) {
  if (!p.exercice_id) throw new Error('EXERCICE_REQUIS');
  const att = attributionActive_(email);
  const aid = att ? att.id : '';
  const charge = Number(p.charge) || 0;

  const deja = lire_(TABS.AJUSTEMENTS).filter(function (a) {
    return String(a.email).toLowerCase() === email &&
           String(a.exercice_id) === String(p.exercice_id) &&
           String(a.attribution_id || '') === String(aid);
  })[0];

  if (!charge) {
    if (deja) supprimerLignes_(TABS.AJUSTEMENTS, function (a) { return String(a.id) === String(deja.id); });
    return { charge: 0, efface: true };
  }
  if (deja) {
    majLigne_(TABS.AJUSTEMENTS, 'id', deja.id, { charge: charge, note: String(p.note || ''), maj_le: new Date() });
  } else {
    ajouter_(TABS.AJUSTEMENTS, {
      id: uid_('AJ'), email: email, attribution_id: aid, exercice_id: p.exercice_id,
      charge: charge, note: String(p.note || ''), maj_le: new Date()
    });
  }
  return { charge: charge };
}

function ligneExercice_(l, bloc, exercices, series, maxis, ajustes) {
  const passe = series
    .filter(function (s) { return String(s.exercice_id) === String(l.exercice_id); })
    .sort(function (a, b) { return new Date(b.horodatage) - new Date(a.horodatage); })
    .slice(0, 5);

  const ex = exercices[l.exercice_id] || {};
  const pct = Number(String(l.pct_rm).replace('%', '')) || 0;
  const rm = (maxis || {})[String(l.exercice_id)];
  let charge = Number(l.charge_cible) || 0;
  if (pct > 0 && rm && rm.kg > 0) charge = arrondiCharge_(rm.kg * pct / 100);

  // L'ajustement du pratiquant passe en dernier : il a le dernier mot.
  const perso = (ajustes || {})[String(l.exercice_id)];
  const ajuste = perso > 0;
  const chargeCoach = charge;
  if (ajuste) charge = perso;

  return {
    exercice_id: l.exercice_id,
    nom: ex.nom || l.exercice_id,
    groupe: ex.groupe || '',
    consigne: ex.consigne || '',
    photo: ex.photo || '',
    bloc: bloc.bloc,
    series: bloc.series,
    repos_s: bloc.repos_s,
    reps_cible: repsTexte_(l.reps_cible),
    // duree_s renseigné => exercice au temps, reps_cible est ignoré.
    // Valeur numérique = durée à tenir ; 'max' = jusqu'à l'échec, chrono qui monte.
    duree_s: l.duree_s === '' || l.duree_s === undefined ? null : l.duree_s,
    cadence: l.cadence || '',
    // pause_s : temps mort APRÈS cet exercice, à l'intérieur du bloc.
    // À distinguer de repos_s, qui est le repos de fin de tour, porté par le bloc.
    pause_s: Number(l.pause_s) || 0,
    pct_rm: pct,
    rm: rm ? rm.kg : 0,
    rm_source: rm ? rm.source : '',
    // Une charge en pourcentage prime sur la charge fixe : c'est elle qui suit
    // la progression du pratiquant.
    charge_cible: charge,
    charge_calculee: !!(pct && rm) && !ajuste,
    charge_coach: chargeCoach,
    charge_ajustee: ajuste,
    dernier: passe.length ? { reps: passe[0].reps, charge: Number(passe[0].charge) } : null,
    record: passe.length ? Math.max.apply(null, passe.map(function (s) { return Number(s.charge) || 0; })) : 0
  };
}

function demarrerSeance_(email, jour) {
  const ouverte = seanceOuverte_(email, jour);
  if (ouverte) return { seance_id: ouverte.id, reprise: true };   // pas de doublon

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

/**
 * Clôt la séance. Une séance peut être terminée à tout moment, y compris avec des
 * exercices jamais commencés : c'est le pratiquant qui décide quand il s'arrête.
 * Sans `duree_min`, la durée est déduite de l'heure de début.
 */
function terminerSeance_(email, p) {
  if (!p.seance_id) throw new Error('SEANCE_MANQUANTE');
  const s = seanceParId_(email, p.seance_id);

  let duree = Number(p.duree_min) || 0;
  if (!duree && s.date) {
    duree = Math.max(1, Math.round((Date.now() - new Date(s.date).getTime()) / 60000));
    if (duree > 300) duree = 0;   // séance oubliée ouverte : mieux vaut vide qu'absurde
  }

  majLigne_(TABS.SEANCES, 'id', p.seance_id, {
    duree_min: duree || '',
    ressenti: p.ressenti || '',
    notes: p.notes || ''
  });
  return { termine: true, duree_min: duree };
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
        id: e.id, nom: e.nom, nom_en: e.nom_en || '', groupe: e.groupe || '',
        equipement: e.equipement || '', consigne: e.consigne || '',
        photo: e.photo || '', video: e.video || ''
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
    nom_en: String(p.nom_en || '').trim(),
    groupe: String(p.groupe || '').trim(),
    equipement: String(p.equipement || '').trim(),
    consigne: String(p.consigne || '').trim(),
    photo: String(p.photo || '').trim(),
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
 * Regroupe des lignes plates en jours puis en blocs. Sert aussi bien aux modèles
 * qu'aux programmes attribués : la structure est la même, seule la clé de
 * rattachement change.
 */
function grouperEnJours_(lignes, noms) {
  const jours = [];
  const parJour = {};
  lignes.slice().sort(function (a, b) {
    const j = triJours_(a.jour, b.jour);
    if (j !== 0) return j;
    const d = numBloc_(a) - numBloc_(b);
    return d !== 0 ? d : Number(a.ordre) - Number(b.ordre);
  }).forEach(function (l) {
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
      reps_cible: repsTexte_(l.reps_cible),
      duree_s: l.duree_s === '' || l.duree_s === undefined ? '' : l.duree_s,
      charge_cible: Number(l.charge_cible) || 0,
      pct_rm: Number(String(l.pct_rm).replace('%', '')) || 0,
      cadence: l.cadence || '',
      pause_s: Number(l.pause_s) || 0
    });
  });
  jours.forEach(function (j) { delete j._n; });
  return jours;
}

/** Transforme des blocs d'édition en lignes plates, prêtes à écrire. */
function aplatirBlocs_(blocs, jour, base) {
  const connus = {};
  lire_(TABS.EXERCICES).forEach(function (e) { connus[String(e.id)] = true; });

  const rangs = [];
  (blocs || []).forEach(function (b, bi) {
    (b.exercices || []).forEach(function (e, ei) {
      if (!connus[String(e.exercice_id)]) throw new Error('EXERCICE_INCONNU_' + e.exercice_id);
      const r = {
        id: uid_(base.prefixe), jour: jour, bloc: bi + 1, ordre: ei + 1,
        exercice_id: e.exercice_id,
        series: Number(b.series) || 3,
        reps_cible: e.reps_cible === undefined ? '' : e.reps_cible,
        duree_s: e.duree_s === undefined ? '' : e.duree_s,
        charge_cible: Number(e.charge_cible) || 0,
        pct_rm: Number(String(e.pct_rm).replace('%', '')) || 0,
        cadence: e.cadence || '',
        pause_s: Number(e.pause_s) || 0,
        repos_s: Number(b.repos_s) || 90
      };
      Object.keys(base.champs).forEach(function (k) { r[k] = base.champs[k]; });
      rangs.push(r);
    });
  });
  if (!rangs.length) throw new Error('PROGRAMME_VIDE');
  return rangs;
}

// ── Modèles génériques ───────────────────────────────────────

/** Liste des modèles, avec le nombre de jours et d'exercices de chacun. */
function modeles_() {
  const lignes = lire_(TABS.MODELE_LIGNES);
  return lire_(TABS.MODELES)
    .filter(function (m) { return m.id !== '' && m.id !== null; })
    .map(function (m) {
      const mien = lignes.filter(function (l) { return String(l.modele_id) === String(m.id); });
      const jours = {};
      mien.forEach(function (l) { jours[l.jour] = true; });
      return {
        id: m.id, nom: m.nom, categorie: m.categorie || '', difficulte: m.difficulte || '',
        description: m.description || '', duree_semaines: Number(m.duree_semaines) || 0,
        statut: m.statut || 'Brouillon', source: m.source || '', video: m.video || '',
        nbJours: Object.keys(jours).length, nbExercices: mien.length
      };
    })
    .sort(function (a, b) { return String(a.nom).localeCompare(String(b.nom), 'fr'); });
}

/** Un modèle avec son contenu, groupé par jour puis par bloc. */
function modele_(id) {
  const m = lire_(TABS.MODELES).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!m) throw new Error('MODELE_INTROUVABLE');
  const noms = {};
  lire_(TABS.EXERCICES).forEach(function (e) { noms[e.id] = e.nom; });
  const lignes = lire_(TABS.MODELE_LIGNES).filter(function (l) {
    return String(l.modele_id) === String(id);
  });
  return {
    id: m.id, nom: m.nom, categorie: m.categorie || '', difficulte: m.difficulte || '',
    description: m.description || '', duree_semaines: Number(m.duree_semaines) || 0,
    statut: m.statut || 'Brouillon', source: m.source || '', video: m.video || '',
    jours: grouperEnJours_(lignes, noms)
  };
}

function modeleSave_(p) {
  const nom = String(p.nom || '').trim();
  if (!nom) throw new Error('NOM_REQUIS');
  const champs = {
    nom: nom,
    categorie: String(p.categorie || '').trim(),
    difficulte: String(p.difficulte || '').trim(),
    description: String(p.description || '').trim(),
    source: String(p.source || '').trim(),
    video: String(p.video || '').trim(),
    duree_semaines: Number(p.duree_semaines) || 0,
    statut: String(p.statut || 'Brouillon').trim()
  };
  if (p.id) {
    if (!majLigne_(TABS.MODELES, 'id', p.id, champs)) throw new Error('MODELE_INTROUVABLE');
    return { id: p.id, cree: false };
  }
  champs.id = uid_('MD');
  champs.cree_le = new Date();
  ajouter_(TABS.MODELES, champs);
  return { id: champs.id, cree: true };
}

/** Réécrit un jour du modèle. Les attributions déjà faites ne sont pas touchées. */
function modeleJourSave_(p) {
  const mid = String(p.modele_id || '');
  const jour = String(p.jour || '').trim();
  if (!mid || !jour) throw new Error('PARAMS_REQUIS');

  const rangs = aplatirBlocs_(p.blocs, jour, { prefixe: 'ML', champs: { modele_id: mid } });
  supprimerLignes_(TABS.MODELE_LIGNES, function (l) {
    return String(l.modele_id) === mid && String(l.jour) === jour;
  });
  ajouterPlusieurs_(TABS.MODELE_LIGNES, rangs);
  return { lignes: rangs.length };
}

function modeleJourSuppr_(p) {
  const mid = String(p.modele_id || ''), jour = String(p.jour || '').trim();
  if (!mid || !jour) throw new Error('PARAMS_REQUIS');
  return { supprimees: supprimerLignes_(TABS.MODELE_LIGNES, function (l) {
    return String(l.modele_id) === mid && String(l.jour) === jour;
  }) };
}

/**
 * Supprime un modèle et son contenu. Les programmes déjà attribués survivent :
 * ce sont des copies, seul le lien d'origine devient orphelin.
 */
function modeleSuppr_(id) {
  if (!id) throw new Error('ID_REQUIS');
  supprimerLignes_(TABS.MODELE_LIGNES, function (l) { return String(l.modele_id) === String(id); });
  const n = supprimerLignes_(TABS.MODELES, function (m) { return String(m.id) === String(id); });
  if (!n) throw new Error('MODELE_INTROUVABLE');
  return { supprime: true };
}

// ── Attributions ─────────────────────────────────────────────

/** Historique des programmes d'un pratiquant, du plus récent au plus ancien. */
function attributions_(email) {
  const cible = String(email || '').toLowerCase();
  if (!cible) throw new Error('EMAIL_REQUIS');
  const lignes = lire_(TABS.PROGRAMMES);
  return lire_(TABS.ATTRIBUTIONS)
    .filter(function (a) { return String(a.email).toLowerCase() === cible; })
    .map(function (a) {
      const mien = lignes.filter(function (l) { return String(l.attribution_id) === String(a.id); });
      const jours = {};
      mien.forEach(function (l) { jours[l.jour] = true; });
      return {
        id: a.id, email: a.email, modele_id: a.modele_id || '', nom: a.nom,
        date_debut: a.date_debut, date_fin: a.date_fin || '',
        statut: a.statut || STATUTS.COURS, notes: a.notes || '',
        paye: a.paye === true || a.paye === 'VRAI',
        nbJours: Object.keys(jours).length, nbExercices: mien.length
      };
    })
    .sort(function (a, b) { return new Date(b.date_debut) - new Date(a.date_debut); });
}

/**
 * Donne un programme à un pratiquant. Avec `modele_id`, le contenu du modèle est
 * COPIÉ : le personnaliser ensuite ne touche pas le modèle, et le même modèle peut
 * être redonné plus tard sans conflit. Sans `modele_id`, l'attribution démarre vide,
 * pour un programme sur mesure.
 * L'attribution « En cours » précédente passe à « Terminé ».
 */
function attribuer_(p) {
  const email = String(p.email || '').toLowerCase();
  if (!email) throw new Error('EMAIL_REQUIS');
  if (!findPratiquant_(email)) throw new Error('PRATIQUANT_INCONNU');

  let nom = String(p.nom || '').trim();
  const mid = String(p.modele_id || '');
  let source = null;
  if (mid) {
    source = lire_(TABS.MODELES).filter(function (m) { return String(m.id) === mid; })[0];
    if (!source) throw new Error('MODELE_INTROUVABLE');
    if (!nom) nom = source.nom;
  }
  if (!nom) nom = 'Programme sur mesure';

  // Clore le programme en cours, s'il y en a un.
  const active = attributionActive_(email);
  if (active) {
    majLigne_(TABS.ATTRIBUTIONS, 'id', active.id, { statut: STATUTS.TERMINE, date_fin: new Date() });
  }

  const id = uid_('AT');
  ajouter_(TABS.ATTRIBUTIONS, {
    id: id, email: email, modele_id: mid, nom: nom,
    date_debut: p.date_debut ? new Date(p.date_debut) : new Date(),
    date_fin: '', statut: STATUTS.COURS, notes: String(p.notes || ''), cree_le: new Date()
  });

  let copiees = 0;
  if (mid) {
    const lignes = lire_(TABS.MODELE_LIGNES).filter(function (l) {
      return String(l.modele_id) === mid;
    });
    const rangs = lignes.map(function (l) {
      return {
        id: uid_('PR'), attribution_id: id, email: email, jour: l.jour,
        bloc: l.bloc, ordre: l.ordre, exercice_id: l.exercice_id,
        series: l.series, reps_cible: l.reps_cible, duree_s: l.duree_s,
        charge_cible: l.charge_cible, pct_rm: l.pct_rm, cadence: l.cadence,
        pause_s: l.pause_s, repos_s: l.repos_s
      };
    });
    copiees = ajouterPlusieurs_(TABS.PROGRAMMES, rangs);
  }
  return { id: id, nom: nom, lignes: copiees };
}

function attributionMaj_(p) {
  if (!p.id) throw new Error('ID_REQUIS');
  const patch = {};
  ['nom', 'statut', 'notes'].forEach(function (k) {
    if (p[k] !== undefined) patch[k] = String(p[k]);
  });
  if (p.paye !== undefined) patch.paye = (p.paye === true || p.paye === 'true');
  if (p.date_fin !== undefined) patch.date_fin = p.date_fin ? new Date(p.date_fin) : '';
  if (p.date_debut !== undefined) patch.date_debut = new Date(p.date_debut);
  if (!majLigne_(TABS.ATTRIBUTIONS, 'id', p.id, patch)) throw new Error('ATTRIBUTION_INTROUVABLE');
  return { maj: true };
}

/** Supprime une attribution ET ses lignes de programme. L'historique des séances reste. */
function attributionSuppr_(id) {
  if (!id) throw new Error('ID_REQUIS');
  supprimerLignes_(TABS.PROGRAMMES, function (l) { return String(l.attribution_id) === String(id); });
  const n = supprimerLignes_(TABS.ATTRIBUTIONS, function (a) { return String(a.id) === String(id); });
  if (!n) throw new Error('ATTRIBUTION_INTROUVABLE');
  return { supprime: true };
}

// ── Programme attribué : lecture et édition ──────────────────

/** Contenu d'une attribution. Sans `attribution_id`, celle en cours. */
function programme_(p) {
  const email = String(p.email || '').toLowerCase();
  if (!email) throw new Error('EMAIL_REQUIS');

  let att = null;
  if (p.attribution_id) {
    att = lire_(TABS.ATTRIBUTIONS).filter(function (a) {
      return String(a.id) === String(p.attribution_id);
    })[0];
    if (!att) throw new Error('ATTRIBUTION_INTROUVABLE');
    if (String(att.email).toLowerCase() !== email) throw new Error('ATTRIBUTION_ETRANGERE');
  } else {
    att = attributionActive_(email);
  }

  const noms = {};
  lire_(TABS.EXERCICES).forEach(function (e) { noms[e.id] = e.nom; });

  const lignes = att
    ? lire_(TABS.PROGRAMMES).filter(function (l) { return String(l.attribution_id) === String(att.id); })
    : lire_(TABS.PROGRAMMES).filter(function (l) {
        return String(l.email).toLowerCase() === email && !l.attribution_id;
      });

  return {
    email: email,
    attribution: att ? {
      id: att.id, nom: att.nom, modele_id: att.modele_id || '',
      date_debut: att.date_debut, date_fin: att.date_fin || '', statut: att.statut
    } : null,
    jours: grouperEnJours_(lignes, noms)
  };
}

/** Réécrit un jour d'une attribution. Les autres jours ne bougent pas. */
function programmeSave_(p) {
  const email = String(p.email || '').toLowerCase();
  const jour = String(p.jour || '').trim();
  const aid = String(p.attribution_id || '');
  if (!email || !jour || !aid) throw new Error('PARAMS_REQUIS');
  if (!findPratiquant_(email)) throw new Error('PRATIQUANT_INCONNU');

  const rangs = aplatirBlocs_(p.blocs, jour, {
    prefixe: 'PR', champs: { attribution_id: aid, email: email }
  });
  supprimerLignes_(TABS.PROGRAMMES, function (l) {
    return String(l.attribution_id) === aid && String(l.jour) === jour;
  });
  ajouterPlusieurs_(TABS.PROGRAMMES, rangs);
  return { lignes: rangs.length };
}

function programmeJourSuppr_(p) {
  const aid = String(p.attribution_id || ''), jour = String(p.jour || '').trim();
  if (!aid || !jour) throw new Error('PARAMS_REQUIS');
  return { supprimees: supprimerLignes_(TABS.PROGRAMMES, function (l) {
    return String(l.attribution_id) === aid && String(l.jour) === jour;
  }) };
}

// ── Maxis (1RM) ──────────────────────────────────────────────

/**
 * 1RM par exercice pour un pratiquant : ceux saisis par le coach et ceux estimés
 * depuis l'historique. Seuls les exercices présents au catalogue sont renvoyés.
 */
function maxis_(email) {
  const calcules = maxisPour_(email);
  const utilises = {};
  lire_(TABS.PROGRAMMES).forEach(function (l) {
    if (String(l.email).toLowerCase() === email) utilises[String(l.exercice_id)] = true;
  });

  return lire_(TABS.EXERCICES)
    .filter(function (e) { return e.id !== '' && e.id !== null; })
    .map(function (e) {
      const m = calcules[String(e.id)];
      return {
        exercice_id: e.id, nom: e.nom, groupe: e.groupe || '',
        rm_kg: m ? m.kg : 0,
        source: m ? m.source : '',
        date: m ? m.date : '',
        auProgramme: !!utilises[String(e.id)]
      };
    })
    .sort(function (a, b) {
      if (a.auProgramme !== b.auProgramme) return a.auProgramme ? -1 : 1;
      return String(a.nom).localeCompare(String(b.nom), 'fr');
    });
}

/** Fixe le 1RM mesuré d'un pratiquant sur un exercice. Remplace l'estimation. */
function maxiSave_(p) {
  const email = String(p.email || '').toLowerCase();
  const ex = String(p.exercice_id || '');
  const kg = Number(p.rm_kg) || 0;
  if (!email || !ex) throw new Error('PARAMS_REQUIS');
  if (!(kg > 0)) throw new Error('VALEUR_INVALIDE');

  const deja = lire_(TABS.MAXIS).filter(function (m) {
    return String(m.email).toLowerCase() === email && String(m.exercice_id) === ex;
  })[0];

  if (deja) {
    majLigne_(TABS.MAXIS, 'id', deja.id, { rm_kg: kg, date: new Date(), source: 'mesuré' });
    return { id: deja.id, rm_kg: kg };
  }
  const id = uid_('MX');
  ajouter_(TABS.MAXIS, {
    id: id, email: email, exercice_id: ex, rm_kg: kg, date: new Date(), source: 'mesuré'
  });
  return { id: id, rm_kg: kg };
}

/** Efface le maxi saisi : on retombe sur l'estimation issue de l'historique. */
function maxiSuppr_(p) {
  const email = String(p.email || '').toLowerCase();
  const ex = String(p.exercice_id || '');
  if (!email || !ex) throw new Error('PARAMS_REQUIS');
  const n = supprimerLignes_(TABS.MAXIS, function (m) {
    return String(m.email).toLowerCase() === email && String(m.exercice_id) === ex;
  });
  return { supprimes: n };
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
// 7 quinquies. LE POSTE DU COACH — fiches, suivi, administratif
// ─────────────────────────────────────────────────────────────

/**
 * Avancement d'un pratiquant dans son programme.
 * Deux mesures, qui ne disent pas la même chose :
 *  - le temps écoulé, semaine N sur la durée prévue du modèle ;
 *  - l'assiduité, séances faites sur séances attendues.
 * C'est la seconde qui alimente la barre : un programme peut être à sa moitié
 * dans le calendrier et n'avoir vu personne.
 */
function progression_(att, lignes, seances) {
  if (!att) return null;

  const jours = {};
  lignes.forEach(function (l) { if (l.jour) jours[l.jour] = true; });
  const parSemaine = Object.keys(jours).length;

  const debut = att.date_debut ? new Date(att.date_debut) : null;
  const fin = att.date_fin ? new Date(att.date_fin) : new Date();
  const joursEcoules = debut ? Math.max(0, Math.floor((fin - debut) / 86400000)) : 0;
  const semaineCourante = debut ? Math.floor(joursEcoules / 7) + 1 : 0;

  const duree = Number(att.duree_semaines) || 0;
  const faites = seances.filter(function (s) {
    return !debut || new Date(s.date) >= debut;
  }).length;

  // Sans durée déclarée au modèle, on compare à ce qui aurait dû être fait
  // depuis le début plutôt qu'à un objectif inconnu.
  const semainesRef = duree || Math.max(1, semaineCourante);
  const attendues = parSemaine * semainesRef;

  return {
    parSemaine: parSemaine,
    semaine: semaineCourante,
    duree_semaines: duree,
    faites: faites,
    attendues: attendues,
    part: attendues ? Math.min(1, faites / attendues) : 0
  };
}

/** Liste d'accueil du coach : un athlète, son programme, son avancement. */
function coachAthletes_() {
  const seances = lire_(TABS.SEANCES);
  const lignes = lire_(TABS.PROGRAMMES);
  const atts = lire_(TABS.ATTRIBUTIONS);
  const modeles = {};
  lire_(TABS.MODELES).forEach(function (m) { modeles[String(m.id)] = m; });

  return lire_(TABS.PRATIQUANTS)
    .filter(function (p) {
      return p.email && String(p.email).toLowerCase() !== CONFIG.COACH_EMAIL.toLowerCase();
    })
    .map(function (p) {
      const email = String(p.email).toLowerCase();
      const mesSeances = seances.filter(function (x) {
        return String(x.email).toLowerCase() === email;
      });
      const derniere = mesSeances.length ? mesSeances[mesSeances.length - 1].date : null;

      const active = atts.filter(function (a) {
        return String(a.email).toLowerCase() === email && String(a.statut) === STATUTS.COURS;
      }).sort(function (a, b) { return new Date(b.date_debut) - new Date(a.date_debut); })[0];

      let prog = null;
      if (active) {
        const mod = modeles[String(active.modele_id)];
        active.duree_semaines = mod ? mod.duree_semaines : 0;
        prog = progression_(active,
          lignes.filter(function (l) { return String(l.attribution_id) === String(active.id); }),
          mesSeances);
      }

      // Un pratiquant sans statut explicite est réputé Nouveau tant qu'il n'a
      // pas de programme, Actif dès qu'il en a un.
      const etat = String(p.statut || (active ? ETATS.ACTIF : ETATS.NOUVEAU));

      return {
        email: p.email, nom: p.nom || email.split('@')[0],
        statut: etat, telephone: p.telephone || '', objectif: p.objectif || '',
        nbSeances: mesSeances.length, derniere: derniere,
        joursDepuis: derniere ? Math.floor((Date.now() - new Date(derniere)) / 86400000) : null,
        programme: active ? {
          id: active.id, nom: active.nom, paye: active.paye === true || active.paye === 'VRAI',
          date_debut: active.date_debut, modele_id: active.modele_id || ''
        } : null,
        progression: prog
      };
    })
    .sort(function (a, b) {
      const rang = { Nouveau: 0, Actif: 1, Inactif: 2, Archivé: 3 };
      const d = (rang[a.statut] || 1) - (rang[b.statut] || 1);
      if (d !== 0) return d;
      return (b.joursDepuis === null ? 9999 : b.joursDepuis) - (a.joursDepuis === null ? 9999 : a.joursDepuis);
    });
}

/** Fiche complète d'un pratiquant : identité, statut, historique des programmes. */
function pratiquant_(email) {
  const cible = String(email || '').toLowerCase();
  if (!cible) throw new Error('EMAIL_REQUIS');
  const p = lire_(TABS.PRATIQUANTS).filter(function (x) {
    return String(x.email).toLowerCase() === cible;
  })[0];
  if (!p) throw new Error('PRATIQUANT_INCONNU');

  const seances = lire_(TABS.SEANCES).filter(function (s) {
    return String(s.email).toLowerCase() === cible;
  });
  const series = lire_(TABS.SERIES).filter(function (s) {
    return String(s.email).toLowerCase() === cible;
  });
  const derniere = seances.length ? seances[seances.length - 1].date : null;

  return {
    email: p.email,
    nom: p.nom || cible.split('@')[0],
    statut: String(p.statut || ETATS.ACTIF),
    telephone: p.telephone || '',
    objectif: p.objectif || '',
    notes: p.notes || '',
    date_inscription: p.date_inscription || '',
    nbSeances: seances.length,
    nbSeries: series.length,
    derniere: derniere,
    joursDepuis: derniere ? Math.floor((Date.now() - new Date(derniere)) / 86400000) : null,
    attributions: attributions_(cible)
  };
}

/**
 * Message pré-écrit annonçant un programme. Composé côté serveur pour que le
 * texte reste le même quel que soit le canal choisi, et pour qu'il soit modifiable
 * en un seul endroit.
 */
function messageType_(p) {
  const email = String(p.email || '').toLowerCase();
  if (!email) throw new Error('EMAIL_REQUIS');

  const fiche = lire_(TABS.PRATIQUANTS).filter(function (x) {
    return String(x.email).toLowerCase() === email;
  })[0];
  if (!fiche) throw new Error('PRATIQUANT_INCONNU');

  const att = p.attribution_id
    ? lire_(TABS.ATTRIBUTIONS).filter(function (a) { return String(a.id) === String(p.attribution_id); })[0]
    : attributionActive_(email);
  if (!att) throw new Error('AUCUN_PROGRAMME');

  const lignes = lire_(TABS.PROGRAMMES).filter(function (l) {
    return String(l.attribution_id) === String(att.id);
  });
  const jours = {};
  lignes.forEach(function (l) { if (l.jour) jours[l.jour] = true; });
  const nbJours = Object.keys(jours).length;

  const mod = att.modele_id
    ? lire_(TABS.MODELES).filter(function (m) { return String(m.id) === String(att.modele_id); })[0]
    : null;
  const semaines = mod ? Number(mod.duree_semaines) || 0 : 0;

  const prenom = String(fiche.nom || '').split(' ')[0] || 'Salut';
  const debut = att.date_debut
    ? Utilities.formatDate(new Date(att.date_debut), CONFIG.TZ || 'Europe/Paris', 'dd/MM/yyyy')
    : '';

  const corps = [
    'Salut ' + prenom + ',',
    '',
    'Ton nouveau programme est prêt : « ' + att.nom + ' ».',
    nbJours + ' séance' + (nbJours > 1 ? 's' : '') + ' par semaine' +
      (semaines ? ', sur ' + semaines + ' semaines' : '') +
      (debut ? ', à partir du ' + debut : '') + '.',
    '',
    'Tu le retrouves dans l\'app :',
    CONFIG.APP_URL,
    '',
    'Dis-moi si quelque chose n\'est pas clair.',
    CONFIG.COACH_NOM
  ].join('\n');

  return {
    email: fiche.email,
    nom: fiche.nom,
    telephone: fiche.telephone || '',
    objet: 'Ton nouveau programme : ' + att.nom,
    message: corps
  };
}

/**
 * Envoie le message par e-mail depuis le compte du coach. Les autres canaux
 * (WhatsApp, SMS) passent par le téléphone : ils ouvrent l'application adéquate
 * avec le texte pré-rempli, sans service tiers ni coût.
 */
function notifierMail_(p) {
  const dest = String(p.email || '').toLowerCase();
  const message = String(p.message || '').trim();
  if (!dest) throw new Error('EMAIL_REQUIS');
  if (!message) throw new Error('MESSAGE_VIDE');
  if (!findPratiquant_(dest)) throw new Error('PRATIQUANT_INCONNU');

  MailApp.sendEmail({
    to: dest,
    subject: String(p.objet || 'Ton programme'),
    body: message,
    name: CONFIG.COACH_NOM,
    replyTo: CONFIG.COACH_EMAIL
  });
  return { envoye: true, restant: MailApp.getRemainingDailyQuota() };
}

/** Le coach met à jour la fiche : statut, téléphone, objectif, notes. */
function pratiquantSave_(p) {
  const email = String(p.email || '').toLowerCase();
  if (!email) throw new Error('EMAIL_REQUIS');
  const patch = {};
  ['nom', 'telephone', 'objectif', 'notes'].forEach(function (k) {
    if (p[k] !== undefined) patch[k] = String(p[k]);
  });
  if (p.statut !== undefined) {
    const e = String(p.statut);
    if ([ETATS.NOUVEAU, ETATS.ACTIF, ETATS.INACTIF, ETATS.ARCHIVE].indexOf(e) === -1) {
      throw new Error('STATUT_INCONNU');
    }
    patch.statut = e;
    // `actif` reste renseigné pour rester lisible directement dans le Sheet.
    patch.actif = (e !== ETATS.ARCHIVE);
  }
  if (!majLigne_(TABS.PRATIQUANTS, 'email', email, patch)) throw new Error('PRATIQUANT_INCONNU');
  return { maj: true };
}

/** Inscrit un pratiquant. Il démarre au statut Nouveau, sans programme. */
function pratiquantCreer_(p) {
  const email = String(p.email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') === -1) throw new Error('EMAIL_INVALIDE');
  if (findPratiquant_(email)) throw new Error('DEJA_INSCRIT');
  ajouter_(TABS.PRATIQUANTS, {
    email: email, nom: String(p.nom || '').trim() || email.split('@')[0],
    statut: ETATS.NOUVEAU, telephone: String(p.telephone || ''),
    date_inscription: new Date(), objectif: String(p.objectif || ''),
    notes: '', actif: true
  });
  return { email: email };
}

// ─────────────────────────────────────────────────────────────
// 8. AUTOMATISATIONS CÔTÉ COACH (menu dans le Sheet)
// ─────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Coaching Fitness')
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
    'Coaching Fitness — ' + inactifs.length + ' pratiquant(s) à relancer',
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
      let sh = ss.getSheetByName(nom);
      if (!sh) {
        sh = ss.insertSheet(nom);
        sh.getRange(1, 1, 1, SCHEMA[nom].length).setValues([SCHEMA[nom]])
          .setFontWeight('bold').setBackground('#1C2027').setFontColor('#FFFFFF');
        sh.setFrozenRows(1);
        rapport.push(nom + ' : onglet créé');
      }
      let head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

      const ajoutees = ajouterColonnesManquantes_(sh, SCHEMA[nom]);
      if (ajoutees) {
        head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
        rapport.push(nom + ' : ' + ajoutees + ' colonne(s) ajoutée(s)');
      }

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

    const att = migrerAttributions_();
    if (att) rapport.push(att);

    return finMigration_(rapport.length ? rapport.join('\n') : 'Rien à migrer, tout est à jour.');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Les lignes de Programmes antérieures au modèle « attribution » n'ont pas de
 * rattachement. On crée une attribution « Programme courant » par pratiquant
 * concerné et on y rattache ses lignes. Sans effet si tout est déjà rattaché.
 */
function migrerAttributions_() {
  const lignes = lire_(TABS.PROGRAMMES);
  const orphelins = {};
  lignes.forEach(function (l) {
    if (!l.attribution_id && l.email) orphelins[String(l.email).toLowerCase()] = true;
  });
  const emails = Object.keys(orphelins);
  if (!emails.length) return '';

  const sh = feuille_(TABS.PROGRAMMES);
  const vals = sh.getDataRange().getValues();
  const head = vals[0];
  const ai = head.indexOf('attribution_id'), ei = head.indexOf('email');
  if (ai === -1 || ei === -1) return '';

  const neuves = [];
  const parEmail = {};
  emails.forEach(function (em) {
    const id = uid_('AT');
    parEmail[em] = id;
    neuves.push({
      id: id, email: em, modele_id: '', nom: 'Programme courant',
      date_debut: new Date(), date_fin: '', statut: STATUTS.COURS,
      notes: 'Créé par la migration, à partir des lignes existantes.', cree_le: new Date()
    });
  });
  ajouterPlusieurs_(TABS.ATTRIBUTIONS, neuves);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    let n = 0;
    for (let r = 1; r < vals.length; r++) {
      const em = String(vals[r][ei]).toLowerCase();
      if (!vals[r][ai] && parEmail[em]) { vals[r][ai] = parEmail[em]; n++; }
    }
    sh.getRange(1, 1, vals.length, head.length).setValues(vals);
    return 'Attributions : ' + neuves.length + ' créée(s), ' + n + ' ligne(s) rattachée(s)';
  } finally {
    lock.releaseLock();
  }
}

/**
 * Transforme l'onglet Import en modèle. Les exercices sont désignés par leur nom :
 * le coach compose dans un tableur sans jamais manipuler d'identifiant.
 * `series` et `repos_s` se lisent sur la première ligne du bloc, comme dans l'app.
 * Rien n'est créé si un seul nom est introuvable : mieux vaut refuser que produire
 * un programme troué.
 */
function importerFeuille_(p) {
  const lignes = lire_(TABS.IMPORT).filter(function (l) {
    return String(l.jour || '').trim() && String(l.exercice || '').trim();
  });
  if (!lignes.length) throw new Error('FEUILLE_VIDE');

  const noms = {};
  lire_(TABS.EXERCICES).forEach(function (e) {
    if (e.nom) noms[String(e.nom).trim().toLowerCase()] = String(e.id);
  });

  const inconnus = [];
  lignes.forEach(function (l) {
    if (!noms[String(l.exercice).trim().toLowerCase()]) inconnus.push(String(l.exercice).trim());
  });
  if (inconnus.length) {
    throw new Error('EXERCICES_INCONNUS: ' + [...new Set(inconnus)].join(', '));
  }

  const r = modeleSave_({
    nom: p.nom, categorie: p.categorie, difficulte: p.difficulte,
    duree_semaines: p.duree_semaines, statut: p.statut || 'Brouillon',
    description: p.description, source: p.source, video: p.video
  });

  // Regroupement jour → bloc, en respectant l'ordre de la feuille.
  const jours = [];
  const parJour = {};
  lignes.forEach(function (l) {
    const j = String(l.jour).trim();
    if (!parJour[j]) { parJour[j] = { jour: j, blocs: [], _n: {} }; jours.push(parJour[j]); }
    const num = Number(l.bloc) || 1;
    if (!parJour[j]._n[num]) {
      parJour[j]._n[num] = { series: Number(l.series) || 3, repos_s: Number(l.repos_s) || 90, exercices: [] };
      parJour[j].blocs.push(parJour[j]._n[num]);
    }
    parJour[j]._n[num].exercices.push({
      exercice_id: noms[String(l.exercice).trim().toLowerCase()],
      reps_cible: repsTexte_(l.reps_cible),
      duree_s: l.duree_s === '' || l.duree_s === undefined ? '' : l.duree_s,
      charge_cible: Number(l.charge_cible) || 0,
      pct_rm: Number(String(l.pct_rm).replace('%', '')) || 0,
      cadence: String(l.cadence || ''),
      pause_s: Number(l.pause_s) || 0
    });
  });

  let total = 0;
  jours.forEach(function (j) {
    modeleJourSave_({ modele_id: r.id, jour: j.jour, blocs: j.blocs });
    j.blocs.forEach(function (b) { total += b.exercices.length; });
  });

  return 'Modèle « ' + p.nom + ' » créé : ' + jours.length + ' jour(s), ' + total +
         ' ligne(s). L\'onglet Import peut être vidé.';
}

/** Expose les opérations du menu du Sheet à l'app, pour le coach uniquement. */
function maintenance_(op, p) {
  // La plupart des opérations n'ont pas de paramètre ; l'import de feuille, si.
  if (op === 'feuille') return { message: importerFeuille_(p || {}) };
  switch (op) {
    case 'migrer':       return { message: migrerSchema() };
    case 'jeuEssai':     return { message: programmeTest() };
    case 'jeuEssaiReset':return { message: rechargerProgrammeTest() };
    case 'rapport':      rapportHebdo(); return { message: 'Rapport envoyé si des pratiquants sont à relancer.' };
    case 'catalogue':    return { message: importerCatalogue() };
    case 'exemple':      return { message: creerExemple_() };
    case 'programmes':   return { message: importerProgrammes() };
    default: throw new Error('OPERATION_INCONNUE');
  }
}

/**
 * Rend compte sans bloquer. Un `getUi().alert()` suspend l'exécution jusqu'au clic,
 * et depuis l'éditeur ou depuis l'app ce clic ne vient jamais : la fonction paraît
 * tourner dans le vide alors que son travail est terminé.
 */
function finMigration_(msg) {
  Logger.log(msg);
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
 * Le bloc 1 du jeudi illustre le schéma top set / back-off : la même barre à
 * 90 % puis à 60 % du max, les charges se recalculant seules quand le max bouge.
 * [jour, bloc, ordre, exercice_id, series, reps_cible, duree_s, charge_cible, pct_rm, cadence, pause_s, repos_s]
 */
const PROGRAMME_TEST = [
  ['Lundi — Haut', 1, 1, 'EX001', 4, '8-10', '',  60,  0, '1-0-3-1',  0, 120],
  ['Lundi — Haut', 2, 1, 'EX005', 3, '10',   '',  30,  0, '1-1-2-0', 20,  90],
  ['Lundi — Haut', 2, 2, 'EX004', 3, 'max',  '',   0,  0, '1-1-2-0',  0,  90],
  ['Lundi — Haut', 3, 1, 'EX006', 3, '12',   '',  30,  0, '1-0-2-0',  0,  60],
  ['Jeudi — Bas',  1, 1, 'EX002', 5, '3',    '',   0, 90, '1-0-3-1', 30, 180],
  ['Jeudi — Bas',  1, 2, 'EX002', 5, '12',   '',   0, 60, '1-0-1-0',  0, 180],
  ['Jeudi — Bas',  2, 1, 'EX003', 3, '5',    '', 100,  0, '1-0-2-0', 30, 180],
  ['Jeudi — Bas',  2, 2, 'EX007', 3, '',     45,   0,  0, '',         0, 120]
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
        charge_cible: p[7], pct_rm: p[8], cadence: p[9], pause_s: p[10], repos_s: p[11]
      });
    });
    rapport.push(email + ' : ' + PROGRAMME_TEST.length + ' lignes ajoutées');
  });

  const msg = rapport.join('\n');
  Logger.log(msg);
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
    const sh = feuille_(TABS.PROGRAMMES);
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
