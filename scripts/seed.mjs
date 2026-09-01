#!/usr/bin/env node
/**
 * Seed initial de Firestore — remplace maintenance.catalogue / maintenance.programmes /
 * setup() côté Apps Script. Exécuté une fois en local, jamais depuis le front (la clé de
 * service contourne les Security Rules).
 *
 * Lit directement apps-script/Catalogue.js et apps-script/Code.js (CATALOGUE_DEPART,
 * PROGRAMMES_TYPES, CONFIG) via `vm`, pour ne jamais recopier ces données à la main et
 * risquer une divergence avec le backend d'origine.
 *
 * Prérequis :
 *   - npm install (dans scripts/)
 *   - une clé de compte de service Firebase, chemin passé dans GOOGLE_APPLICATION_CREDENTIALS
 *     (Console Firebase -> Paramètres du projet -> Comptes de service -> Générer une clé privée)
 *
 * Usage : GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node seed.mjs
 */
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');

// ── Extraction des données depuis les fichiers Apps Script d'origine ──────────
// Les deux fichiers ne font que déclarer des const/function au niveau racine (aucun appel
// SpreadsheetApp/MailApp au chargement) : les exécuter dans un contexte vm isolé ne
// déclenche donc aucun effet de bord, seulement les déclarations.
function extraire(fichierRelatif, ...noms) {
  const src = readFileSync(path.join(REPO, fichierRelatif), 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(src, { filename: fichierRelatif }).runInContext(sandbox);
  const expr = `({ ${noms.join(', ')} })`;
  return vm.runInContext(expr, sandbox);
}

const { CATALOGUE_DEPART, PROGRAMMES_TYPES } = extraire('apps-script/Catalogue.js', 'CATALOGUE_DEPART', 'PROGRAMMES_TYPES');
const { CONFIG } = extraire('apps-script/Code.js', 'CONFIG');

console.log(`Catalogue.js : ${CATALOGUE_DEPART.length} exercices, ${PROGRAMMES_TYPES.length} programmes-types.`);
console.log(`Coach : ${CONFIG.COACH_NOM} <${CONFIG.COACH_EMAIL}>`);

// ── Firebase Admin ──────────────────────────────────────────────────────────
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const CHAMPS_EXERCICE = ['nom', 'groupe', 'equipement', 'nom_en', 'consigne', 'photo'];

async function ecrireParLots(operations, taille = 450) {
  for (let i = 0; i < operations.length; i += taille) {
    const batch = db.batch();
    operations.slice(i, i + taille).forEach((op) => op(batch));
    await batch.commit();
  }
}

async function seedExercices() {
  const parNom = {}; // nom en minuscules -> id EXnnn
  const operations = CATALOGUE_DEPART.map((c, i) => {
    const id = 'EX' + String(i + 1).padStart(3, '0');
    parNom[c[0].trim().toLowerCase()] = id;
    const doc = { id, video: '' };
    CHAMPS_EXERCICE.forEach((champ, j) => { doc[champ] = c[j] ?? ''; });
    return (batch) => batch.set(db.collection('exercices').doc(id), doc);
  });
  await ecrireParLots(operations);
  await db.collection('compteurs').doc('exercices').set({ dernier: CATALOGUE_DEPART.length });
  console.log(`${CATALOGUE_DEPART.length} exercices écrits, compteur initialisé à ${CATALOGUE_DEPART.length}.`);
  return parNom;
}

/** Reproduit exactement aplatirBlocs_ (Code.js:1212) : bloc = index+1, ordre = index+1. */
function ligneDepuisBloc(bloc, bi, exercice, ei, idsParNom, manquants) {
  const [nom, reps_cible, duree_s, charge_cible, pct_rm, cadence, pause_s] = exercice;
  const exercice_id = idsParNom[nom.trim().toLowerCase()];
  if (!exercice_id) { manquants.push(nom); return null; }
  return {
    jour: null, // renseigné par l'appelant
    bloc: bi + 1,
    ordre: ei + 1,
    exercice_id,
    series: Number(bloc.series) || 3,
    reps_cible: reps_cible === undefined ? '' : reps_cible,
    duree_s: duree_s === undefined ? '' : duree_s,
    charge_cible: Number(charge_cible) || 0,
    pct_rm: Number(String(pct_rm).replace('%', '')) || 0,
    cadence: cadence || '',
    pause_s: Number(pause_s) || 0,
    repos_s: Number(bloc.repos_s) || 90,
    note: ''
  };
}

async function seedProgrammes(idsParNom) {
  const manquants = [];
  let crees = 0;
  for (const p of PROGRAMMES_TYPES) {
    const modeleRef = db.collection('modeles').doc();

    const lignes = [];
    p.jours.forEach(([nomJour, blocs]) => {
      blocs.forEach((bloc, bi) => {
        bloc.exercices.forEach((exercice, ei) => {
          const ligne = ligneDepuisBloc(bloc, bi, exercice, ei, idsParNom, manquants);
          if (ligne) { ligne.jour = nomJour; lignes.push(ligne); }
        });
      });
    });

    // nb_jours / nb_exercices sont dénormalisés : la liste des modèles les affiche
    // pour chaque entrée, et sans eux il faudrait lire toutes les sous-collections
    // de lignes à chaque ouverture de l'écran.
    await modeleRef.set({
      nom: p.nom, categorie: p.categorie, difficulte: p.difficulte,
      duree_semaines: p.duree_semaines || 0, statut: p.statut || 'Actif',
      description: p.description || '', source: p.source || '', video: p.video || '',
      nb_jours: new Set(lignes.map((l) => l.jour)).size,
      nb_exercices: lignes.length,
      cree_le: admin.firestore.FieldValue.serverTimestamp()
    });

    await ecrireParLots(lignes.map((l) => (batch) => batch.set(modeleRef.collection('lignes').doc(), l)));
    crees++;
  }
  console.log(`${crees} modèles créés.`);
  if (manquants.length) {
    console.warn(`Exercices introuvables (vérifier l'orthographe dans PROGRAMMES_TYPES) : ${[...new Set(manquants)].join(', ')}`);
  }
}

async function seedCoach() {
  const email = CONFIG.COACH_EMAIL.toLowerCase();
  await db.collection('pratiquants').doc(email).set({
    nom: CONFIG.COACH_NOM,
    role: 'coach',
    admin: true,
    statut: 'Actif',
    telephone: '', date_inscription: admin.firestore.FieldValue.serverTimestamp(),
    objectif: '', notes: ''
  }, { merge: true });
  console.log(`Compte coach/admin créé : ${email}`);
}

/**
 * Vide ce que ce script écrit, pour pouvoir le rejouer sans doublonner les
 * modèles (créés avec un identifiant automatique). Ne touche à rien d'autre :
 * ni aux comptes, ni aux séances.
 */
async function vider() {
  for (const modele of (await db.collection('modeles').get()).docs) {
    const lignes = await modele.ref.collection('lignes').get();
    await ecrireParLots(lignes.docs.map((l) => (batch) => batch.delete(l.ref)));
    await modele.ref.delete();
  }
  const ex = await db.collection('exercices').get();
  await ecrireParLots(ex.docs.map((d) => (batch) => batch.delete(d.ref)));
  console.log(`Purge : ${ex.size} exercices et les modèles supprimés.`);
}

async function main() {
  if (process.argv.includes('--reset')) await vider();
  const idsParNom = await seedExercices();
  await seedProgrammes(idsParNom);
  await seedCoach();
  console.log('Seed terminé. Pas de pratiquant de test créé — utiliser un second compte '
    + 'Google réel (Réglages coach -> créer un pratiquant) pour valider les règles cross-compte.');
}

main().catch((err) => { console.error(err); process.exit(1); });
