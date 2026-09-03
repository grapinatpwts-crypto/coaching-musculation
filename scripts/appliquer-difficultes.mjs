#!/usr/bin/env node
/**
 * Pose la difficulté d'exécution sur les exercices déjà en base, depuis
 * `difficultes-exercices.json` (voir generer-difficultes.mjs pour sa provenance).
 *
 * Pourquoi un script à part et pas `seed.mjs` : le seed écrit les exercices avec
 * `set()` sans merge, il écraserait les vidéos et les retouches faites depuis
 * l'app. Ici on ne touche qu'à un champ, et — même règle que l'import du
 * catalogue d'origine — on ne remplit que ce qui est vide. `--forcer` pour
 * réécrire aussi les difficultés déjà posées.
 *
 * Prérequis : npm install (dans scripts/), et la clé de compte de service.
 * Usage : GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node appliquer-difficultes.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORCER = process.argv.includes('--forcer');

const table = JSON.parse(readFileSync(path.join(__dirname, 'difficultes-exercices.json'), 'utf8'));
const parNom = {};
Object.entries(table).forEach(([nom, v]) => { parNom[nom.trim().toLowerCase()] = v.difficulte; });

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const snap = await db.collection('exercices').get();
console.log(`${snap.size} exercices en base, ${Object.keys(table).length} difficultés connues.`);

const aEcrire = [];
const inconnus = [];
let dejaPosees = 0;

snap.forEach(doc => {
  const e = doc.data();
  const difficulte = parNom[String(e.nom || '').trim().toLowerCase()];
  if (!difficulte) { inconnus.push(e.nom || doc.id); return; }
  if (String(e.difficulte || '').trim() && !FORCER) { dejaPosees++; return; }
  if (String(e.difficulte || '').trim() === difficulte) { dejaPosees++; return; }
  aEcrire.push({ ref: doc.ref, nom: e.nom, difficulte });
});

if (inconnus.length) {
  console.log(`\n${inconnus.length} exercice(s) hors table — laissés tels quels (ajoutés depuis l'app ?) :`);
  inconnus.forEach(n => console.log('  -', n));
}
console.log(`\n${dejaPosees} déjà à jour, ${aEcrire.length} à écrire.`);

for (let i = 0; i < aEcrire.length; i += 400) {
  const batch = db.batch();
  aEcrire.slice(i, i + 400).forEach(({ ref, difficulte }) => batch.update(ref, { difficulte }));
  await batch.commit();
}

console.log(`${aEcrire.length} difficulté(s) écrite(s).`);
