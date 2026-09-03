#!/usr/bin/env node
/**
 * Pose la vidéo de démonstration sur les exercices déjà en base, depuis
 * `videos-exercices.json` — des liens Vimeo de la chaîne Rehab-U, partagés par
 * le coach (client de leurs formations), pas des ressources sous licence libre
 * comme free-exercise-db. C'est pourquoi ils sont listés à part plutôt que versés
 * dans `Catalogue.js`.
 *
 * Même prudence que `appliquer-difficultes.mjs` : jamais le seed, qui écrase avec
 * `set()` sans merge. Ici on ne touche qu'au champ `video`, et seulement là où il
 * est vide — un exercice sur lequel le coach a déjà collé une adresse depuis
 * l'app garde la sienne. `--forcer` pour réécrire aussi les vidéos déjà posées.
 *
 * Prérequis : npm install (dans scripts/), et la clé de compte de service.
 * Usage : GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node appliquer-videos.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORCER = process.argv.includes('--forcer');

const table = JSON.parse(readFileSync(path.join(__dirname, 'videos-exercices.json'), 'utf8'));
const parNom = {};
Object.entries(table).forEach(([nom, v]) => { parNom[nom.trim().toLowerCase()] = v.video; });

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const snap = await db.collection('exercices').get();
console.log(`${snap.size} exercices en base, ${Object.keys(table).length} vidéos connues.`);

const aEcrire = [];
let dejaPosees = 0;

snap.forEach(doc => {
  const e = doc.data();
  const video = parNom[String(e.nom || '').trim().toLowerCase()];
  if (!video) return;
  if (String(e.video || '').trim() && !FORCER) { dejaPosees++; return; }
  if (String(e.video || '').trim() === video) { dejaPosees++; return; }
  aEcrire.push({ ref: doc.ref, nom: e.nom, video });
});

console.log(`\n${dejaPosees} déjà à jour, ${aEcrire.length} à écrire.`);
aEcrire.forEach(({ nom, video }) => console.log('  -', nom, '→', video));

for (let i = 0; i < aEcrire.length; i += 400) {
  const batch = db.batch();
  aEcrire.slice(i, i + 400).forEach(({ ref, video }) => batch.update(ref, { video }));
  await batch.commit();
}

console.log(`\n${aEcrire.length} vidéo(s) écrite(s).`);
