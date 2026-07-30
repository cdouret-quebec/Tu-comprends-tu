import { useState, useRef, useEffect } from "react";

const C = {
  rouge:    "#D42B2B",
  bleu:     "#1A1F5E",
  jaune:    "#F5C800",
  creme:    "#F7F3EC",
  noir:     "#111111",
  blanc:    "#FFFFFF",
  vertForet:"#1B4332",
};

const ST_COLOR = "#6B21A8";
const ST_BG    = "#F3E8FF";

const SECTEURS = [
  { id: "construction", label: "Construction & Génie", icon: "🏗️", color: "#B45309", bg: "#FEF3C7", desc: "Chantiers, sous-traitants, plans, sécurité", exemples: ["checker les cossins", "le boute", "la shed", "un truck", "foreman"], contexte: "chantier de construction québécois, réunion de chantier, interaction avec contremaître et ouvriers" },
  { id: "finance", label: "Finance & Banque", icon: "💰", color: "#1A1F5E", bg: "#E0E7FF", desc: "REER, placements, conseils aux clients", exemples: ["mon cash", "les cennes", "le bas de laine", "magasiner un prêt", "l'impôt"], contexte: "succursale bancaire ou cabinet de conseil financier québécois, rencontre avec client" },
  { id: "sante", label: "Santé & Services sociaux", icon: "🏥", color: "#065F46", bg: "#D1FAE5", desc: "Hôpitaux, CLSC, relations avec patients", exemples: ["la carte-soleil", "la RAMQ", "les médicaments remboursés", "le médecin de famille"], contexte: "hôpital ou CLSC québécois, interaction avec patients et collègues soignants" },
  { id: "education", label: "Éducation & CPE", icon: "🎓", color: "#6B21A8", bg: "#EDE9FE", desc: "Écoles, CPE, relations avec parents", exemples: ["le bulletin", "les récupérations", "le service de garde", "la direction"], contexte: "école primaire ou secondaire québécoise, salle des profs, rencontre de parents" },
  { id: "commerce", label: "Commerce & Vente", icon: "🛒", color: "#D42B2B", bg: "#FEE2E2", desc: "Épiceries, commerces, service à la clientèle", exemples: ["la caisse", "le dépanneur", "checker le prix", "la commande"], contexte: "commerce de détail québécois, interaction avec clients et collègues" },
  { id: "ti", label: "Technologies (TI)", icon: "💻", color: "#0F766E", bg: "#CCFBF1", desc: "Développement, réunions agiles, startups", exemples: ["pitcher une idée", "le backlog", "ça fait du sens", "on se revire de bord"], contexte: "startup ou département TI québécois, standup, réunion d'équipe agile" }
];

const MODULES = [
  { id: "oral", label: "Comprendre l'oral", icon: "🎙️", color: "#1B4332", desc: "Accent, rythme, syllabes avalées",
    buildPrompt: (s) => `Tu es expert du québécois parlé dans le secteur "${s.label}" (${s.contexte}). Génère un dialogue réaliste (5-7 répliques) avec contractions typiques (t'as, j'sais, c'est-tu, y'a, là là, faque, asteure, pantoute...) ET vocabulaire du secteur. Note: "croche" (pas droit) et NON "croché". Exemples: ${s.exemples.join(", ")}.
Inclus aussi "annotations": liste de 5-8 termes québécois du texte avec leur définition courte en français standard, pour les survols interactifs.
JSON: {"titre":string,"lieu":string,"dialogue":[{"personnage":string,"texte":string,"note_phonetique":string}],"explications":[{"expression":string,"ce_que_ca_sonne":string,"traduction_standard":string,"specifique_au_secteur":boolean}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.` },
  { id: "vocab", label: "Vocabulaire du secteur", icon: "💬", color: "#7B2D8B", desc: "Jargon, expressions et argot professionnel",
    buildPrompt: (s) => {
      const isConstruction = s.id === "construction";
      const sacresSection = isConstruction ? `
IMPORTANT pour Construction : inclus obligatoirement 2 expressions avec sacres utilisés comme intensificateurs sur le chantier (ex: "ostie que c'est croche ce coffrage-là", "câlice, le béton est pas encore pris"). Indique la forme atténuée pour chaque sacre. Précise dans le contexte que ces expressions sont normales sur les chantiers québécois.` : "";
      return `Tu es expert du québécois professionnel dans le secteur "${s.label}" (${s.contexte}). Génère 6 expressions québécoises fréquentes dans ce secteur. "croche" et NON "croché". Exemples: ${s.exemples.join(", ")}.${sacresSection}
Inclus aussi "annotations": les 6 expressions elles-mêmes avec définition courte, pour les survols interactifs.
JSON: {"titre":string,"expressions":[{"expression":string,"registre":"formel"|"neutre"|"familier","contexte":string,"exemple":string,"equivalent_france":string,"piege":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`;
    }
  },
  { id: "registre", label: "Registres de langue", icon: "🎚️", color: "#9E4F00", desc: "Quand parler formel, quand relâcher",
    buildPrompt: (s) => `Tu es expert de la communication dans le secteur "${s.label}" au Québec (${s.contexte}). Crée un exercice de registres avec une situation RÉELLE du secteur en 3 versions (formel / neutre / très familier).
Inclus aussi "annotations": 4-6 expressions québécoises des textes avec définition courte.
JSON: {"titre":string,"situation":string,"versions":[{"registre":string,"texte":string,"quand_utiliser":string,"signes_distinctifs":[string]}],"conseil":string,"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.` },
  { id: "culture", label: "Culture du milieu", icon: "🍁", color: "#8B0000", desc: "Codes sociaux propres à ce secteur",
    buildPrompt: (s) => `Tu es expert de la culture professionnelle québécoise dans le secteur "${s.label}" (${s.contexte}). Génère un mini-guide sur UN aspect culturel qui surprend les immigrants dans CE secteur.
Inclus aussi "annotations": 4-6 termes culturels québécois du texte avec définition courte.
JSON: {"titre":string,"concept":string,"pourquoi_ca_surprend":string,"comment_ca_marche":string,"exemples":[{"situation":string,"reaction_typique_quebecoise":string,"interpretation_possible":string}],"conseil_pratique":string,"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.` },
  { id: "quiz", label: "Quiz", icon: "🧩", color: "#0369A1", desc: "Teste tes connaissances",
    buildPrompt: (s, type) => {
      const types = {
        traduction: `Génère 5 questions QCM DISTINCTES : une expression québécoise du secteur "${s.label}" → 4 choix de sens. "croche" et NON "croché". Chaque question doit tester une expression DIFFÉRENTE.`,
        situation: `Génère 5 questions QCM DISTINCTES de mise en situation dans le secteur "${s.label}". Scène réelle → réaction québécoise appropriée ? 4 choix. Chaque scénario doit être DIFFÉRENT.`,
        registre: `Génère 5 questions QCM DISTINCTES sur les registres dans le secteur "${s.label}". Phrase → quel contexte ? ou contexte → quelle formulation ? Chaque question doit cibler un registre DIFFÉRENT.`
      };
      return `Tu es expert du québécois professionnel dans le secteur "${s.label}" (${s.contexte}). ${types[type]||types.traduction} Exemples: ${s.exemples.join(", ")}.
JSON: {"titre":string,"type":string,"quiz":[{"question":string,"contexte":string,"choix":[{"lettre":"A"|"B"|"C"|"D","texte":string}],"bonne_reponse":"A"|"B"|"C"|"D","explication":string,"astuce":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`;
    }
  }
];

const ST_MODULES = [
  { id: "simulation", label: "Simulation", icon: "🗣️", desc: "Joue une conversation avec Martin, ton collègue québécois" },
  { id: "references", label: "Références culturelles", icon: "📡", desc: "Hockey, météo, chalet, culture pop québécoise" },
  { id: "entree_sortie", label: "Entrer & sortir", icon: "🚪", desc: "Amorces naturelles et façons de clore poliment" },
  { id: "rythme", label: "Rythme & rebond", icon: "🎭", desc: "Réagir, relancer, ne pas tuer la conversation" },
  { id: "lunch", label: "Le lunch", icon: "🍱", desc: "Dîner au bureau, boîte à lunch, commandes collectives" },
  { id: "valeurs", label: "Valeurs & argent", icon: "🌿", desc: "Ce qui ne se dit pas mais se sent : modestie, égalité, rapport à l'argent" },
  { id: "sacres", label: "Les sacres", icon: "🤬", desc: "Comprendre les sacres comme code émotionnel et social québécois" },
  { id: "faux_amis", label: "Faux amis", icon: "😂", desc: "Les mots qui n'ont pas le même sens qu'en France — et qui peuvent surprendre !" }
];

const HG_COLOR = "#9A3412";
const HG_BG = "#FFF7ED";

const NIVEAUX = [
  { id: "a2", label: "A2", desc: "Phrases simples" },
  { id: "b1b2", label: "B1-B2", desc: "Niveau intermédiaire" },
  { id: "c1c2", label: "C1-C2", desc: "Niveau avancé" }
];

const EPOQUES = [
  {
    id: "nouvelle_france", label: "Nouvelle-France", periode: "1608-1760", icon: "⚜️", color: "#1E3A8A", bg: "#EFF6FF",
    contexte: "la vie quotidienne en Nouvelle-France : colons, coureurs des bois, vie dans les seigneuries, relations avec les nations autochtones, le commerce des fourrures",
    notions: {
      a2:    { notion: "Le présent de l'indicatif", notionDesc: "Conjuguer être et avoir + verbes courants au présent", format: "trous" },
      b1b2:  { notion: "L'imparfait", notionDesc: "Décrire des habitudes et des situations passées", format: "lecture" },
      c1c2:  { notion: "Imparfait vs passé simple", notionDesc: "Distinguer le récit littéraire (passé simple) du contexte descriptif (imparfait)", format: "lecture" }
    }
  },
  {
    id: "conquete", label: "Conquête britannique", periode: "1760-1840", icon: "🏴", color: "#7C2D12", bg: "#FEF3E2",
    contexte: "la Conquête de 1760, le Traité de Paris, l'Acte de Québec, la rébellion des Patriotes de 1837-1838",
    notions: {
      a2:    { notion: "Accords dans le groupe du nom", notionDesc: "Accorder déterminants, noms et adjectifs en genre (masculin/féminin) et en nombre", format: "trous" },
      b1b2:  { notion: "Passé composé vs imparfait", notionDesc: "Distinguer l'événement ponctuel du contexte ou de la description", format: "trous" },
      c1c2:  { notion: "Concordance des temps au passé", notionDesc: "Maîtriser passé composé, imparfait et plus-que-parfait dans un même texte", format: "lecture" }
    }
  },
  {
    id: "19e_siecle", label: "19e siècle", periode: "1840-1896", icon: "🚂", color: "#065F46", bg: "#ECFDF5",
    contexte: "l'Acte d'Union, la Confédération de 1867, l'industrialisation, l'exode rural vers les villes et vers les États-Unis",
    notions: {
      a2:    { notion: "Le passé composé", notionDesc: "Former et utiliser le passé composé pour raconter des événements simples", format: "trous" },
      b1b2:  { notion: "Futur simple et futur proche", notionDesc: "Exprimer et distinguer projets, prédictions et intentions", format: "lecture" },
      c1c2:  { notion: "Subordonnées complexes et connecteurs", notionDesc: "Articuler causes, conséquences et oppositions avec des structures avancées", format: "lecture" }
    }
  },
  {
    id: "20e_siecle", label: "20e siècle & Révolution tranquille", periode: "1896-1980", icon: "✊", color: "#5B21B6", bg: "#F5F3FF",
    contexte: "la Grande Noirceur, la Révolution tranquille des années 1960, la nationalisation de l'électricité, les revendications nationalistes, les référendums",
    notions: {
      a2:    { notion: "Les verbes modaux", notionDesc: "Utiliser vouloir, pouvoir et devoir au présent pour exprimer une intention ou une obligation", format: "trous" },
      b1b2:  { notion: "La syntaxe et l'ordre des mots", notionDesc: "Construire des phrases complexes : place de l'adverbe, de la négation, de l'interrogation", format: "lecture" },
      c1c2:  { notion: "Conditionnel et subjonctif", notionDesc: "Exprimer hypothèses, souhaits, doutes et revendications politiques", format: "trous" }
    }
  },
  {
    id: "contemporain", label: "Époque contemporaine", periode: "1980 à aujourd'hui", icon: "🏙️", color: "#BE185D", bg: "#FDF2F8",
    contexte: "le Québec moderne, l'immigration récente, les enjeux linguistiques actuels, la diversité culturelle, les grands débats de société",
    notions: {
      a2:    { notion: "La phrase nominale et l'ellipse", notionDesc: "Comprendre et utiliser les formules courtes sans verbe très fréquentes au Québec : 'Pas de problème.', 'Correct.', 'Bonne journée.', 'Aucun souci.'", format: "trous" },
      b1b2:  { notion: "Le discours rapporté au présent", notionDesc: "Rapporter les paroles et les positions de quelqu'un avec les verbes déclaratifs", format: "lecture" },
      c1c2:  { notion: "Discours rapporté avec concordance complète", notionDesc: "Maîtriser les changements de temps, de pronoms et d'indicateurs temporels dans le discours indirect", format: "lecture" }
    }
  },
  {
    id: "litterature", label: "Littérature québécoise", periode: "1960 à aujourd'hui", icon: "📚", color: "#0F766E", bg: "#CCFBF1",
    contexte: "la littérature québécoise moderne : Michel Tremblay, Réjean Ducharme, Victor-Lévy Beaulieu, Marie-Claire Blais, Gaston Miron — le joual comme revendication culturelle et artistique",
    notions: {
      a2:    { notion: "Les adjectifs et la description littéraire", notionDesc: "Utiliser des adjectifs variés pour décrire des personnages et des lieux dans un texte simple", format: "trous" },
      b1b2:  { notion: "Registres de langue : littéraire vs parlé", notionDesc: "Distinguer et analyser le registre soutenu (français standard) et le registre familier (québécois parlé) dans un même extrait", format: "lecture" },
      c1c2:  { notion: "Le joual comme langue littéraire", notionDesc: "Analyser les caractéristiques linguistiques du joual (phonologie, syntaxe, lexique) chez les auteurs québécois — sans reproduire d'œuvres protégées", format: "lecture" }
    }
  },
  {
    id: "oral_qc", label: "Grammaire de l'oral québécois", periode: "Spécificités actuelles", icon: "🗣️", color: "#6B21A8", bg: "#F3E8FF",
    contexte: "les particularités grammaticales du français québécois parlé au quotidien : négation sans 'ne', gallicismes temporels, phrases elliptiques, anglicismes grammaticaux, emploi de 'on' vs 'nous', voix passive évitée",
    notions: {
      a2:    { notion: "La négation à l'oral", notionDesc: "Comprendre que le 'ne' disparaît à l'oral québécois : 'je sais pas', 'c'est pas grave', 'y'a pas de problème'", format: "trous" },
      b1b2:  { notion: "Les gallicismes temporels", notionDesc: "Maîtriser venir de (passé récent), être en train de (présent progressif) et aller + infinitif (futur proche) — très fréquents à l'oral québécois", format: "lecture" },
      c1c2:  { notion: "Anglicismes grammaticaux et calques syntaxiques", notionDesc: "Identifier et corriger les calques de l'anglais fréquents chez les immigrants : 'être capable à', 'faire du sens', 'prendre pour acquis', 'c'est correct'", format: "lecture" }
    }
  }
];

const SUPABASE_URL = "https://wdgoksaepdbxevzoootz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZ29rc2FlcGRieGV2em9vb3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDM0MjIsImV4cCI6MjA5OTg3OTQyMn0.m6_PaZkqfxvC-2ipX5-9nUPVbxgZ_qMXN-gUr_v9_sM";

async function sbGet(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cache_contenu?id=eq.${encodeURIComponent(id)}&select=*`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    return rows?.[0] || null;
  } catch { return null; }
}

async function sbSet(id, data, status = "pending") {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/cache_contenu`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({ id, data, status, updated_at: new Date().toISOString() })
    });
  } catch {}
}

async function sbUpdate(id, updates) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/cache_contenu?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
    });
  } catch {}
}

async function sbDelete(id) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/cache_contenu?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
  } catch {}
}

async function sbGetAll() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cache_contenu?select=*&order=created_at.desc`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
  
    const obj = {};
    rows.forEach(r => { obj[r.id] = r; });
    return obj;
  } catch { return {}; }
}

const STORAGE_KEY = "qc_pro_progression";
const TEACHER_PWD = "Simple";
const LEXIQUE_KEY = "qc_pro_lexique";
const PREMIUM_KEY = "qc_pro_premium";
const ACCESS_CODE = "QUEBEC2024";

function isPremium() {
  try { return localStorage.getItem(PREMIUM_KEY) === "true"; } catch { return false; }
}
function activatePremium() {
  try { localStorage.setItem(PREMIUM_KEY, "true"); } catch {}
}

function loadLexique() {
  try { return JSON.parse(localStorage.getItem(LEXIQUE_KEY) || "null") || {}; }
  catch { return {}; }
}
function saveLexique(l) { try { localStorage.setItem(LEXIQUE_KEY, JSON.stringify(l)); } catch {} }
function addToLexique(annotations, source) {
  if (!annotations?.length) return;
  const lex = loadLexique();
  annotations.forEach(({ terme, definition }) => {
    if (!terme || !definition) return;
    const key = terme.toLowerCase().trim();
    if (!lex[key]) lex[key] = { terme, definition, sources: [] };
    if (!lex[key].sources.includes(source)) lex[key].sources.push(source);
  });
  saveLexique(lex);
}

function loadProgression() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || { quizScores: [], modulesVus: {}, expressionsRatees: [] }; }
  catch { return { quizScores: [], modulesVus: {}, expressionsRatees: [] }; }
}
function saveProgression(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

// Cache des contenus — localStorage dans l'artifact/dev, Supabase sur Vercel
const CACHE_KEY = "qc_pro_cache";
const USE_SUPABASE = window.location.hostname.includes('vercel.app');

function getCacheKey(type, id, subId = "") { return `${type}__${id}__${subId}`; }

// Fonctions localStorage (artifact Claude)
function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null") || {}; }
  catch { return {}; }
}
function saveCache(c) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} }

async function getCached(type, id, subId = "") {
  const key = getCacheKey(type, id, subId);
  if (USE_SUPABASE) {
    const row = await sbGet(key);
    if (!row) return null;
    return { data: row.data, status: row.status, createdAt: row.created_at };
  } else {
    const cache = loadCache();
    return cache[key] || null;
  }
}

async function setCached(type, id, data, subId = "") {
  const key = getCacheKey(type, id, subId);
  if (USE_SUPABASE) {
    await sbSet(key, data, "pending");
  } else {
    const cache = loadCache();
    cache[key] = { data, status: "pending", createdAt: new Date().toISOString() };
    saveCache(cache);
  }
}

async function validateCached(type, id, subId = "") {
  const key = getCacheKey(type, id, subId);
  if (USE_SUPABASE) {
    await sbUpdate(key, { status: "validated" });
  } else {
    const cache = loadCache();
    if (cache[key]) { cache[key].status = "validated"; saveCache(cache); }
  }
}

async function rejectCached(type, id, subId = "") {
  const key = getCacheKey(type, id, subId);
  if (USE_SUPABASE) {
    await sbDelete(key);
  } else {
    const cache = loadCache();
    delete cache[key];
    saveCache(cache);
  }
}

async function updateCached(type, id, data, subId = "") {
  const key = getCacheKey(type, id, subId);
  if (USE_SUPABASE) {
    await sbUpdate(key, { data, status: "validated" });
  } else {
    const cache = loadCache();
    if (cache[key]) { cache[key].data = data; cache[key].status = "validated"; saveCache(cache); }
  }
}

async function callClaude(messages, system, json = true, retries = 3) {
  const allMessages = system
    ? [{ role: "user", content: `[INSTRUCTIONS]\n${system}\n[/INSTRUCTIONS]\n\n${messages[0].content}` }, ...messages.slice(1)]
    : messages;

  const isVercel = window.location.hostname.includes('vercel.app');
  const endpoint = isVercel ? '/api/generate' : 'https://api.anthropic.com/v1/messages';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const body = {
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: allMessages
      };

      const headers = { "content-type": "application/json" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (res.status === 529 || res.status === 503 || res.status === 502) {
        if (attempt < retries) {
          const wait = attempt * 3000;
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw new Error(`Serveur surchargé (${res.status}) — réessaie dans quelques minutes`);
      }

      if (!res.ok) {
        let msg = `Erreur ${res.status}`;
        try { const e = await res.json(); msg += `: ${e?.error?.message || JSON.stringify(e)}`; } catch {}
        throw new Error(msg);
      }

      const responseText = await res.text();
      let data;
      try { data = JSON.parse(responseText); }
      catch { throw new Error(`Réponse serveur invalide : ${responseText.substring(0, 100)}`); }

      const raw = data.content?.find(b => b.type === "text")?.text || "";
      if (!json) return raw;

      const cleaned = raw
        .replace(/^\uFEFF/, "")
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u00A0/g, " ")
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try { return JSON.parse(match[0]); } catch {}
        }
        throw new Error(`Format inattendu : ${cleaned.substring(0, 200)}`);
      }
    } catch (e) {
      if (attempt < retries && (e.message.includes("fetch") || e.message.includes("network"))) {
        await new Promise(r => setTimeout(r, attempt * 2000));
        continue;
      }
      throw e;
    }
  }
}

function LoadingDots({ color = "#555" }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 0" }}>
      {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: color, animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

function Tooltip({ terme, definition, children }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setVisible(false);
    }
    if (visible) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [visible]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline" }}>
      <span
        onClick={() => setVisible(v => !v)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          borderBottom: "2px dotted #D42B2B",
          cursor: "help",
          color: "inherit",
          textDecoration: "none"
        }}>
        {children}
      </span>
      {visible && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", zIndex: 9999,
          background: "#1A1F5E", color: "white",
          borderRadius: 8, padding: "8px 12px",
          fontSize: 14, lineHeight: 1.5,
          width: 220, boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          pointerEvents: "none", textAlign: "left"
        }}>
          <span style={{ display: "block", fontWeight: 700, color: "#F5C800", marginBottom: 3 }}>
            {terme}
          </span>
          {definition}
          <span style={{
            position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
            width: 10, height: 10, background: "#1A1F5E",
            clipPath: "polygon(0 0, 100% 0, 50% 100%)"
          }} />
        </span>
      )}
    </span>
  );
}

// Transforme un texte brut en texte avec tooltips sur les termes annotés
function AnnotatedText({ text, annotations = [], style = {} }) {
  if (!text) return null;
  if (!annotations.length) return <span style={style}>{text}</span>;

  const sorted = [...annotations].sort((a, b) => b.terme.length - a.terme.length);

  let segments = [{ text, annotated: false }];
  sorted.forEach(({ terme, definition }) => {
    const regex = new RegExp(`(${terme.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    segments = segments.flatMap(seg => {
      if (seg.annotated) return [seg];
      const parts = seg.text.split(regex);
      return parts.map(part => ({
        text: part,
        annotated: regex.test(part),
        terme,
        definition
      }));
    });
  });

  return (
    <span style={style}>
      {segments.map((seg, i) =>
        seg.annotated && seg.terme ? (
          <Tooltip key={i} terme={seg.terme} definition={seg.definition}>
            {seg.text}
          </Tooltip>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

function SimulationQCM({ data }) {
  const [etape, setEtape] = useState(0);
  const [choix, setChoix] = useState({});
  const [termine, setTermine] = useState(false);
  const ann = data.annotations || [];

  if (!data?.scenarios?.length) return <p style={{ color: "#888", fontSize: 15 }}>Contenu en cours de préparation.</p>;

  const sc = data.scenarios;
  const tour = sc[etape];
  const total = sc.length;
  const score = Object.entries(choix).filter(([i, c]) => sc[i]?.bonne_reponse === c).length;

  function handleChoix(lettre) {
    if (choix[etape] !== undefined) return;
    setChoix(c => ({ ...c, [etape]: lettre }));
  }

  function suivant() {
    if (etape < total - 1) setEtape(e => e + 1);
    else setTermine(true);
  }

  if (termine) {
    const pct = Math.round((score / total) * 100);
    const msg = pct === 100 ? "Parfait ! T'as toute compris ! 🎉"
      : pct >= 75 ? "Pas pire ! Encore un p'tit effort ! 💪"
      : pct >= 50 ? "Continue, t'es sur la bonne track ! 📚"
      : "Lâche pas, ça va venir ! 🍁";
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>☕</div>
        <p style={{ fontWeight: 700, fontSize: 22, color: ST_COLOR, margin: "0 0 4px" }}>{score}/{total}</p>
        <p style={{ fontSize: 14, color: "#555", margin: "0 0 20px" }}>{msg}</p>
        {score < total && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, textAlign: "left" }}>
            {sc.map((s, i) => choix[i] !== s.bonne_reponse && (
              <div key={i} style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#92400E" }}>Martin : « {s.ce_que_dit_martin} »</p>
                <p style={{ margin: "0 0 3px", fontSize: 14, color: "#065F46" }}>✅ {s.choix.find(c => c.lettre === s.bonne_reponse)?.texte}</p>
                <p style={{ margin: 0, fontSize: 13, color: "#78350F" }}>{s.explication}</p>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => { setEtape(0); setChoix({}); setTermine(false); }}
          style={{ background: ST_COLOR, color: "white", border: "none", borderRadius: 20, padding: "10px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          🔄 Recommencer
        </button>
      </div>
    );
  }

  const repondu = choix[etape] !== undefined;
  const bonneReponse = tour.bonne_reponse;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: ST_COLOR }}>{data.titre}</h3>
        <span style={{ fontSize: 13, color: "#888", background: "#F3F4F6", borderRadius: 10, padding: "2px 10px" }}>{etape + 1}/{total}</span>
      </div>

      {/* Barre de progression */}
      <div style={{ background: "#E5E7EB", borderRadius: 10, height: 4, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ width: `${((etape) / total) * 100}%`, height: "100%", background: ST_COLOR, transition: "width 0.3s" }} />
      </div>

      {/* Martin parle */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: ST_COLOR, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>M</div>
        <div style={{ background: "#F8F6FF", borderRadius: "4px 14px 14px 14px", padding: "10px 13px", fontSize: 14, lineHeight: 1.6, flex: 1 }}>
          <AnnotatedText text={tour.ce_que_dit_martin} annotations={ann} />
          {tour.contexte && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888", fontStyle: "italic" }}>📍 {tour.contexte}</p>}
        </div>
      </div>

      {/* Choix de réponse */}
      <p style={{ fontSize: 14, color: "#888", margin: "0 0 8px" }}>Comment tu réponds ?</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {tour.choix.map(c => {
          const isChosen = choix[etape] === c.lettre;
          const isCorrect = c.lettre === bonneReponse;
          let bg = "white", border = "1px solid #E5E7EB", color = "#1F2937";
          if (repondu) {
            if (isCorrect) { bg = "#ECFDF5"; border = "1px solid #065F46"; color = "#065F46"; }
            else if (isChosen) { bg = "#FEF2F2"; border = "1px solid #DC2626"; color = "#DC2626"; }
            else { color = "#9CA3AF"; }
          } else if (isChosen) {
            bg = ST_BG; border = `1px solid ${ST_COLOR}`; color = ST_COLOR;
          }
          return (
            <button key={c.lettre} onClick={() => handleChoix(c.lettre)} disabled={repondu}
              style={{ background: bg, border, borderRadius: 8, padding: "10px 12px", cursor: repondu ? "default" : "pointer", textAlign: "left", fontSize: 15, display: "flex", gap: 8, alignItems: "flex-start", transition: "all 0.15s", color, width: "100%" }}>
              <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: isChosen && !repondu ? ST_COLOR : repondu && isCorrect ? "#065F46" : repondu && isChosen ? "#DC2626" : "#E5E7EB", color: (isChosen || (repondu && isCorrect)) ? "white" : "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{c.lettre}</span>
              <span style={{ lineHeight: 1.4 }}>{c.texte}</span>
              {repondu && isCorrect && <span style={{ marginLeft: "auto" }}>✅</span>}
              {repondu && isChosen && !isCorrect && <span style={{ marginLeft: "auto" }}>❌</span>}
            </button>
          );
        })}
      </div>

      {/* Feedback après réponse */}
      {repondu && (
        <div style={{ background: choix[etape] === bonneReponse ? "#ECFDF5" : "#FFF7ED", border: `1px solid ${choix[etape] === bonneReponse ? "#A7F3D0" : "#FED7AA"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
          <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 600, color: choix[etape] === bonneReponse ? "#065F46" : "#92400E" }}>
            {choix[etape] === bonneReponse ? "✅ Parfait !" : `✅ Réponse idéale : ${bonneReponse}`}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#555", lineHeight: 1.5 }}>{tour.explication}</p>
        </div>
      )}

      {repondu && (
        <button onClick={suivant}
          style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: ST_COLOR, color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          {etape < total - 1 ? "Tour suivant →" : "Voir mon score →"}
        </button>
      )}
    </div>
  );
}

function STReferencesCard({ data }) {
  const [open, setOpen] = useState({});
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 15, color: "#666", marginBottom: 16 }}>{data.intro}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.references.map((r, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
              style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>{r.sujet}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{r.sous_titre}</div>
                </div>
              </div>
              <span style={{ color: ST_COLOR, fontSize: 16 }}>{open[i] ? "▲" : "▼"}</span>
            </button>
            {open[i] && (
              <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${ST_COLOR}10` }}>
                <p style={{ fontSize: 15, color: "#374151", margin: "10px 0 8px", lineHeight: 1.6 }}>{r.ce_quil_faut_savoir}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {r.phrases_utiles.map((p, j) => (
                    <div key={j} style={{ background: ST_BG, borderRadius: 8, padding: "7px 10px", fontSize: 15, color: ST_COLOR, fontStyle: "italic" }}>« {p} »</div>
                  ))}
                </div>
                {r.piege && <p style={{ margin: "8px 0 0", fontSize: 14, color: "#c0392b", background: "#fdecea", borderRadius: 6, padding: "4px 8px" }}>⚠️ {r.piege}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function STEntreeSortieCard({ data }) {
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 15, color: "#666", marginBottom: 16 }}>{data.intro}</p>
      {["entrees", "sorties"].map(type => (
        <div key={type} style={{ marginBottom: 20 }}>
          <h4 style={{ color: ST_COLOR, fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            {type === "entrees" ? "🚪 Pour entrer dans une conversation" : "👋 Pour sortir naturellement"}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data[type].map((e, i) => (
              <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 10, padding: 14 }}>
                <div style={{ background: ST_BG, borderRadius: 8, padding: "7px 12px", marginBottom: 8, fontSize: 14, color: ST_COLOR, fontWeight: 600, fontStyle: "italic" }}>
                  « {e.formule} »
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 15, color: "#555" }}>📍 {e.quand}</p>
                <p style={{ margin: "0 0 4px", fontSize: 15, color: "#333" }}>🎯 {e.effet}</p>
                {e.variante && <p style={{ margin: 0, fontSize: 14, color: "#888", fontStyle: "italic" }}>Variante : « {e.variante} »</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {data.conseil_cle && (
        <div style={{ background: "#FFFBE6", border: "1px solid #FCD34D", borderRadius: 10, padding: 12 }}>
          <p style={{ margin: 0, fontSize: 15 }}>💡 <strong>À retenir :</strong> {data.conseil_cle}</p>
        </div>
      )}
    </div>
  );
}

function STRythmeCard({ data }) {
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 15, color: "#666", marginBottom: 16 }}>{data.intro}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.situations.map((s, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: ST_BG, padding: "10px 14px", borderBottom: `1px solid ${ST_COLOR}15` }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1F2937" }}>
                <span style={{ color: ST_COLOR }}>Martin dit : </span>« {s.ce_que_dit_martin} »
              </p>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {s.reactions.map((r, j) => (
                  <div key={j} style={{
                    padding: "8px 12px", borderRadius: 8, fontSize: 15,
                    background: r.type === "ideal" ? "#ECFDF5" : r.type === "correct" ? "#F0F9FF" : "#FEF2F2",
                    border: `1px solid ${r.type === "ideal" ? "#A7F3D0" : r.type === "correct" ? "#BAE6FD" : "#FECACA"}`,
                    color: r.type === "ideal" ? "#065F46" : r.type === "correct" ? "#0369A1" : "#991B1B"
                  }}>
                    <span style={{ fontWeight: 700, marginRight: 6 }}>{r.type === "ideal" ? "✅ Idéal" : r.type === "correct" ? "🆗 Correct" : "❌ À éviter"} :</span>
                    <em>« {r.reponse} »</em>
                    {r.pourquoi && <span style={{ display: "block", fontSize: 13, marginTop: 3, opacity: 0.85 }}>{r.pourquoi}</span>}
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#6B7280", fontStyle: "italic" }}>💡 {s.lecon}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function STValeursCard({ data }) {
  const [open, setOpen] = useState({0: true});
  const ann = data.annotations || [];
  const valeurColors = {
    modestie: "#065F46", argent: "#1D4ED8", égalité: "#7C2D12",
    humour: "#5B21B6", travail: "#B45309"
  };
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 15, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>{data.intro}</p>
      {ann.length > 0 && <p style={{ fontSize: 13, color: "#999", marginBottom: 12, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.scenarios.map((s, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
              style={{ width: "100%", padding: "13px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1F2937", marginBottom: 2 }}>{s.situation}</div>
                {s.valeur_en_jeu && (
                  <span style={{ fontSize: 12, background: ST_BG, color: ST_COLOR, borderRadius: 10, padding: "1px 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {s.valeur_en_jeu}
                  </span>
                )}
              </div>
              <span style={{ color: ST_COLOR, fontSize: 14, flexShrink: 0 }}>{open[i] ? "▲" : "▼"}</span>
            </button>
            {open[i] && (
              <div style={{ borderTop: `1px solid ${ST_COLOR}10` }}>
                <div style={{ padding: "12px 14px", background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
                  <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: 0.4 }}>Ce que fait l'immigrant</p>
                  <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.5 }}>
                    <AnnotatedText text={s.ce_que_fait_immigrant} annotations={ann} />
                  </p>
                </div>
                <div style={{ padding: "12px 14px", background: "#FFF7ED", borderBottom: "1px solid #FED7AA" }}>
                  <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: 0.4 }}>Ce que pensent les Québécois (sans le dire)</p>
                  <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.5, fontStyle: "italic" }}>
                    <AnnotatedText text={s.ce_que_pensent_les_quebecois} annotations={ann} />
                  </p>
                </div>
                <div style={{ padding: "12px 14px", background: "#F0FDF4", borderBottom: "1px solid #BBF7D0" }}>
                  <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: "#065F46", textTransform: "uppercase", letterSpacing: 0.4 }}>Ce qui se passe vraiment</p>
                  <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.5 }}>
                    <AnnotatedText text={s.ce_qui_se_passe_vraiment} annotations={ann} />
                  </p>
                </div>
                <div style={{ padding: "12px 14px", background: ST_BG }}>
                  <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: ST_COLOR, textTransform: "uppercase", letterSpacing: 0.4 }}>Comment s'en sortir</p>
                  <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.5 }}>
                    <AnnotatedText text={s.comment_sen_sortir} annotations={ann} />
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Référence bibliographique */}
      {data.reference && (
        <div style={{ marginTop: 20, background: "#F8F6FF", border: `1px solid ${ST_COLOR}30`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>📚</span>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: ST_COLOR }}>Pour aller plus loin</p>
            <p style={{ margin: "0 0 6px", fontSize: 14, color: "#1F2937", fontWeight: 500 }}>
              <em>{data.reference.titre}</em>
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>{data.reference.auteur}</p>
            <a href={data.reference.lien} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, background: ST_COLOR, color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Voir le livre →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function STExpressionsCard({ data: rawData }) {
  const [revealed, setRevealed] = useState({});
  const ann = rawData.annotations || [];

  const data = rawData;
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 15, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>{data.intro}</p>
      {ann.length > 0 && <p style={{ fontSize: 13, color: "#999", marginBottom: 12, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.expressions.map((e, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            {/* Expression */}
            <div style={{ background: ST_BG, padding: "12px 14px", borderBottom: `1px solid ${ST_COLOR}15` }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: ST_COLOR }}>« <AnnotatedText text={e.expression} annotations={ann} /> »</p>
            </div>
            {/* Scénario */}
            <div style={{ padding: "12px 14px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 15, color: "#374151", lineHeight: 1.6 }}>
                <strong>📍 Scénario :</strong> <AnnotatedText text={e.scenario} annotations={ann} />
              </p>
              {/* Interprétation erronée — révélable */}
              {!revealed[`err_${i}`] ? (
                <button onClick={() => setRevealed(r => ({ ...r, [`err_${i}`]: true }))}
                  style={{ fontSize: 14, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "5px 12px", cursor: "pointer", marginBottom: 8, display: "block" }}>
                  🤔 Qu'est-ce que tu penserais que ça veut dire ?
                </button>
              ) : (
                <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "#DC2626" }}>
                    <strong>Interprétation erronée :</strong> {e.interpretation_erronee}
                  </p>
                </div>
              )}
              {/* Vrai sens */}
              {!revealed[`vrai_${i}`] ? (
                <button onClick={() => setRevealed(r => ({ ...r, [`vrai_${i}`]: true }))}
                  style={{ fontSize: 14, color: "#065F46", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: "5px 12px", cursor: "pointer", marginBottom: 8, display: "block" }}>
                  ✅ Voir le vrai sens
                </button>
              ) : (
                <div style={{ background: "#ECFDF5", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 15, color: "#065F46", fontWeight: 600 }}>
                    ✅ <AnnotatedText text={e.vrai_sens} annotations={ann} />
                  </p>
                </div>
              )}
              {/* Réutilisation */}
              {revealed[`vrai_${i}`] && e.exemple_reutilisation && (
                <div style={{ background: ST_BG, borderRadius: 8, padding: "8px 12px" }}>
                  <p style={{ margin: 0, fontSize: 14, color: ST_COLOR }}>
                    💬 <strong>Comment le réutiliser :</strong> <em>« {e.exemple_reutilisation} »</em>
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ST_PROMPTS = {
references: `Tu es expert de la culture québécoise et du small talk au bureau. Génère un guide sur 5 sujets de conversation incontournables à la pause café québécoise (hockey, météo, chalet, routes/circulation, séries québécoises ou culture pop). Pour chaque sujet : ce qu'il faut savoir pour ne pas être perdu, 3 phrases utiles à placer naturellement.
Inclus "annotations": 6-10 termes québécois du guide avec leur définition courte en français standard.
JSON: {"titre":string,"intro":string,"references":[{"emoji":string,"sujet":string,"sous_titre":string,"ce_quil_faut_savoir":string,"phrases_utiles":[string],"piege":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
entree_sortie: `Tu es expert du small talk québécois au bureau. Génère un guide pratique avec 4 façons d'entrer dans une conversation à la pause café ET 4 façons d'en sortir poliment, en québécois authentique. Contexte: machine à café, couloir, salle de pause.
Inclus "annotations": 5-8 expressions québécoises des formules avec leur définition courte.
JSON: {"titre":string,"intro":string,"entrees":[{"formule":string,"quand":string,"effet":string,"variante":string}],"sorties":[{"formule":string,"quand":string,"effet":string,"variante":string}],"conseil_cle":string,"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
rythme: `Tu es expert du small talk québécois. Génère 5 situations typiques où un immigrant francophone casse le rythme de la conversation — parce qu'il répond trop formellement, trop brièvement ou à côté. Pour chaque situation: ce que dit le collègue québécois Martin, 3 types de réponses possibles (idéale, correcte, à éviter) avec explication.
Inclus "annotations": 5-8 expressions québécoises des dialogues avec leur définition courte.
JSON: {"titre":string,"intro":string,"situations":[{"ce_que_dit_martin":string,"reactions":[{"type":"ideal"|"correct"|"mauvais","reponse":string,"pourquoi":string}],"lecon":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
simulation: `Tu es expert du small talk québécois à la pause café. Génère une simulation de conversation entre Martin (collègue québécois) et un immigrant francophone. Exactement 6 tours. Martin dit quelque chose en québécois authentique, l'élève choisit parmi 3 réponses (A, B, C). Une seule est idéale, une est correcte mais imparfaite, une est à éviter. Garde toutes les répliques COURTES (1-2 phrases max). Martin utilise : t'as, j'sais, c'est-tu, là là, faque, pantoute, etc.
Inclus "annotations": 5 expressions québécoises avec définition courte.
JSON: {"titre":string,"intro":string,"scenarios":[{"ce_que_dit_martin":string,"contexte":string,"choix":[{"lettre":"A"|"B"|"C","texte":string}],"bonne_reponse":"A"|"B"|"C","explication":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
lunch: `Tu es expert de la culture québécoise au bureau. Génère un guide complet sur le lunch (dîner) au bureau québécois — un univers social à part entière pour un immigrant. Couvre : la boîte à lunch et ce qu'on y met typiquement, les commandes collectives (sushis, pho, sandwichs), les conversations de table, les expressions autour de la nourriture, et les codes sociaux (on s'invite, on partage, on commente ce que l'autre mange...). Inclus aussi un lexique des mots québécois liés au lunch (dîner vs lunch, le boss paie la traite, commander en masse, le popote roulante, etc.). 4 sections distinctes.
Inclus "annotations": 8-12 termes québécois du guide avec leur définition courte.
JSON: {"titre":string,"intro":string,"sections":[{"emoji":string,"titre":string,"contenu":string,"expressions":[{"expression":string,"explication":string}],"conseil":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
sacres: `Tu es expert de la langue québécoise. Génère un guide sur les sacres québécois comme intensificateurs émotionnels. IMPORTANT : traite-les comme un phénomène linguistique fascinant. Génère exactement 3 sections courtes : 1) Origine et formes (ostie/estie, câlice/câline, tabarnak/tabarnouche, crisse/crime) avec forme atténuée et 2 exemples courts chacun ; 2) Émotions exprimées selon le ton (admiration, frustration, surprise) avec 2 exemples courts ; 3) Règles sociales (avec qui, quand s'abstenir) avec conseil. Garde TOUS les textes très courts (1-2 phrases max).
Inclus "annotations": 6 formes atténuées avec leur définition courte.
JSON: {"titre":string,"intro":string,"sections":[{"emoji":string,"titre":string,"contenu":string,"exemples":[{"sacre":string,"forme_attenuation":string,"emotion":string,"exemple_phrase":string,"traduction_emotion":string}],"conseil":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
faux_amis: `Tu es expert de la langue québécoise. Génère 8 faux amis et pièges linguistiques qui créent des malentendus hilarants ou embarrassants. Inclus OBLIGATOIREMENT ces 3 premiers : 1) S'ennuyer de quelqu'un (I miss you au QC / trouver le temps long en France) ; 2) "J'ai envie de toi" (erreur hispanophone : tener envidia = envier, mais en français = désir amoureux — catastrophique !) ; 3) Gosser (agacer au QC / les gosses = enfants en France). Puis choisis 5 parmi : char, dépanneur, pogner, magasiner, brunante, clavarder, niaiseux, être game, blé d'Inde. Garde les textes COURTS (1-2 phrases max par champ).
Inclus "annotations": les 8 termes avec leur sens québécois en définition courte.
JSON: {"titre":string,"intro":string,"faux_amis":[{"mot":string,"scenario":string,"sens_quebec":string,"sens_france_ou_malentendu":string,"astuce":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
valeurs: `Tu es expert de la culture québécoise et des codes sociaux implicites au travail. Génère 7 scénarios de faux pas culturels autour des VALEURS NON DITES du Québec. Choisis parmi ces thèmes :
1. La modestie obligatoire (ne pas se vanter, ne pas "flasher")
2. L'égalitarisme (tout le monde se tutoie, le boss mange à la même table)
3. Le rapport à l'argent ("né pour un petit pain", gêne de parler de salaire)
4. L'humour autodérisoire comme code de bienvenue
5. Le débat souverainiste/fédéraliste — esquiver poliment sans prendre position
6. La laïcité et la religion — sujet sensible post-Révolution tranquille
7. RESTER TARD AU BUREAU : partir à l'heure n'est PAS un manque d'engagement au Québec — rester tard = mal organisé
8. Le consensus mou en réunion — "c'est le fun" peut vouloir dire qu'on n'est pas convaincu
9. Les évaluations indirectes — "c'est correct" peut signifier que c'est loin d'être correct
Pour chaque scénario : ce que fait l'immigrant (sans mauvaise intention), ce que ça produit chez les collègues québécois (sans qu'ils le disent), ce qui se passe vraiment, et comment s'en sortir. Garde les textes COURTS (2-3 phrases max par champ).
Inclus "annotations": 8 expressions québécoises clés avec définition courte.
Inclus "reference": {"titre":"Le Code Québec","auteur":"Jean-Marc Léger, Jacques Nantel et Pierre Duhamel","lien":"https://editionshomme.groupelivre.com/products/le-code-quebec-1?variant=42637639287041","description":"Pour aller plus loin sur les valeurs québécoises"}.
JSON: {"titre":string,"intro":string,"scenarios":[{"situation":string,"ce_que_fait_immigrant":string,"ce_que_pensent_les_quebecois":string,"ce_qui_se_passe_vraiment":string,"comment_sen_sortir":string,"valeur_en_jeu":string}],"annotations":[{"terme":string,"definition":string}],"reference":{"titre":string,"auteur":string,"lien":string,"description":string}}
UNIQUEMENT JSON, sans markdown.`,
expressions: `Tu es expert de la langue imagée québécoise. Génère 8 expressions imagées québécoises courantes dans les conversations de bureau et de pause café — des expressions métaphoriques ou idiomatiques qu'un francophone de France ou d'ailleurs ne comprend pas au sens littéral.
Pour chaque expression : un scénario réel où quelqu'un entend cette expression sans la comprendre, ce qu'il pense que ça veut dire (l'interprétation littérale ou erronée), ce que ça veut dire vraiment, et un exemple de comment la réutiliser soi-même.
Inclus des classiques comme : attacher sa tuque, péter de la broue, avoir le dos large, virer su'l'top, être dans le boutte, avoir du front tout le tour de la tête, se sucrer le bec, lâcher son fou, etc.
Inclus "annotations": les 8 expressions elles-mêmes avec leur définition courte.
JSON: {"titre":string,"intro":string,"expressions":[{"expression":string,"scenario":string,"interpretation_erronee":string,"vrai_sens":string,"exemple_reutilisation":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`
};

function STSacresCard({ data }) {
  const [open, setOpen] = useState({ 0: true });
  const ann = data.annotations || [];
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 15, color: "#666", marginBottom: 14, lineHeight: 1.6 }}>{data.intro}</p>
      {ann.length > 0 && <p style={{ fontSize: 13, color: "#999", marginBottom: 12, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.sections.map((s, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
              style={{ width: "100%", padding: "13px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>{s.titre}</span>
              </div>
              <span style={{ color: ST_COLOR, fontSize: 14 }}>{open[i] ? "▲" : "▼"}</span>
            </button>
            {open[i] && (
              <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${ST_COLOR}10` }}>
                <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: "10px 0 12px" }}>
                  <AnnotatedText text={s.contenu} annotations={ann} />
                </p>
                {s.exemples?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    {s.exemples.map((ex, j) => (
                      <div key={j} style={{ background: ST_BG, borderRadius: 10, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                          <strong style={{ color: ST_COLOR, fontSize: 14 }}>
                            <AnnotatedText text={ex.sacre} annotations={ann} />
                          </strong>
                          {ex.forme_attenuation && (
                            <span style={{ fontSize: 13, background: "white", color: "#555", borderRadius: 10, padding: "1px 8px", border: `1px solid ${ST_COLOR}30` }}>
                              atténué : <em>{ex.forme_attenuation}</em>
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "0 0 4px", fontSize: 14, color: "#6B7280" }}>
                          😤 {ex.emotion} → <em style={{ color: "#374151" }}>« <AnnotatedText text={ex.exemple_phrase} annotations={ann} /> »</em>
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: "#888" }}>Ce que ça exprime vraiment : {ex.traduction_emotion}</p>
                      </div>
                    ))}
                  </div>
                )}
                {s.conseil && (
                  <div style={{ background: "#FFFBE6", border: "1px solid #FCD34D", borderRadius: 8, padding: "8px 12px" }}>
                    <p style={{ margin: 0, fontSize: 14 }}>💡 {s.conseil}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function STFauxAmisCard({ data }) {
  const [revealed, setRevealed] = useState({});
  const ann = data.annotations || [];
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 15, color: "#666", marginBottom: 14, lineHeight: 1.6 }}>{data.intro}</p>
      {ann.length > 0 && <p style={{ fontSize: 13, color: "#999", marginBottom: 12, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur sens québécois</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.faux_amis.map((fa, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            {/* Mot vedette */}
            <div style={{ background: ST_BG, padding: "12px 14px", borderBottom: `1px solid ${ST_COLOR}15` }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: ST_COLOR }}>
                « <AnnotatedText text={fa.mot} annotations={ann} /> »
              </p>
            </div>
            <div style={{ padding: "12px 14px" }}>
              {/* Scénario */}
              <p style={{ margin: "0 0 10px", fontSize: 15, color: "#374151", lineHeight: 1.6 }}>
                <strong>📍 Scénario :</strong> <AnnotatedText text={fa.scenario} annotations={ann} />
              </p>
              {/* Sens Québec */}
              {!revealed[`qc_${i}`] ? (
                <button onClick={() => setRevealed(r => ({ ...r, [`qc_${i}`]: true }))}
                  style={{ fontSize: 14, color: "#065F46", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: "5px 12px", cursor: "pointer", marginBottom: 8, display: "block" }}>
                  🇨🇦 Ce que ça veut dire au Québec ?
                </button>
              ) : (
                <div style={{ background: "#ECFDF5", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 15, color: "#065F46", fontWeight: 600 }}>
                    🇨🇦 Au Québec : {fa.sens_quebec}
                  </p>
                </div>
              )}
              {/* Sens France / malentendu */}
              {!revealed[`fr_${i}`] ? (
                <button onClick={() => setRevealed(r => ({ ...r, [`fr_${i}`]: true }))}
                  style={{ fontSize: 14, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "5px 12px", cursor: "pointer", marginBottom: 8, display: "block" }}>
                  🇫🇷 Et en France / le malentendu ?
                </button>
              ) : (
                <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 15, color: "#DC2626" }}>
                    🇫🇷 {fa.sens_france_ou_malentendu}
                  </p>
                </div>
              )}
              {/* Astuce mémo — visible après révélation */}
              {revealed[`qc_${i}`] && revealed[`fr_${i}`] && fa.astuce && (
                <div style={{ background: "#FFFBE6", border: "1px solid #FCD34D", borderRadius: 8, padding: "7px 12px" }}>
                  <p style={{ margin: 0, fontSize: 14 }}>💡 <strong>Astuce :</strong> {fa.astuce}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmallTalkScreen({ onBack, onUpdateProgression, initialModule }) {
  const [activeSTModule, setActiveSTModule] = useState(
    initialModule && initialModule !== "smalltalk"
      ? ST_MODULES.find(m => m.id === initialModule) || null
      : null
  );
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const contentRef = useRef(null);



  async function loadSTModule(mod, forceRegen = false) {
    setActiveSTModule(mod);
    setContent(null);
    setError(null);
    setLoading(true);
    setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    try {
    
      if (!forceRegen) {
        const cached = await getCached("st", "smalltalk", mod.id);
        if (cached && cached.status === "validated") {
          setContent(cached.data);
          setLoading(false);
          return;
        }
        if (cached && cached.status === "pending") {
          setContent(cached.data);
          setLoading(false);
          return;
        }
      }
      const parsed = await callClaude([{ role: "user", content: ST_PROMPTS[mod.id] }],
        "Tu es expert de la langue et culture québécoise. Tu réponds TOUJOURS en JSON valide uniquement, sans markdown, sans backticks.");
      await setCached("st", "smalltalk", parsed, mod.id);
    
      if (mod.id === "expressions" && parsed.expressions) {
        const expAnnotations = parsed.expressions.map(e => ({
          terme: e.expression,
          definition: e.vrai_sens
        }));
        addToLexique(expAnnotations, "Expressions imagées");
      } else {
        addToLexique(parsed.annotations, `Small talk — ${mod.label}`);
      }
      setContent(parsed);
    } catch (e) { setError(`Erreur : ${e.message}`); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (activeSTModule && !content && !loading) {
      loadSTModule(activeSTModule);
    }
  }, [activeSTModule?.id]);

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#2D1B5E", padding: "18px 16px", position: "relative", textAlign: "center" }}>
        <button onClick={onBack} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14 }}>← Accueil</button>
        <h1 style={{ margin: 0, color: "white", fontSize: 20, fontWeight: 800 }}>☕ Small talk québécois</h1>
        <p style={{ margin: "5px 0 0", color: "#C4B5FD", fontSize: 14 }}>Pause café, lunch, ascenseur, couloir… ne sois jamais mal pris !</p>
      </div>

      {/* Onglets */}
      <div style={{ background: "white", borderBottom: "1px solid #E0E0E0", overflowX: "auto" }}>
        <div style={{ display: "flex", padding: "0 12px", minWidth: "max-content" }}>
          {ST_MODULES.map(mod => {
            const isActive = activeSTModule?.id === mod.id;
            return (
              <button key={mod.id} onClick={() => loadSTModule(mod)}
                style={{ padding: "12px 13px 10px", background: "none", border: "none", borderBottom: isActive ? `3px solid ${ST_COLOR}` : "3px solid transparent", cursor: "pointer", fontSize: 14, fontWeight: isActive ? 700 : 500, color: isActive ? ST_COLOR : "#666", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
                <span>{mod.icon}</span><span>{mod.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 60px" }}>
        {/* Accueil ST */}
        {!activeSTModule && (
          <div>
            <div style={{ background: "white", borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${ST_COLOR}20` }}>
              <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: ST_COLOR }}>Pourquoi c'est difficile ?</p>
              <p style={{ margin: 0, fontSize: 15, color: "#666", lineHeight: 1.7 }}>
                Pause café, lunch, ascenseur, couloir… Ces petits moments du quotidien sont souvent les plus difficiles à naviguer en québécois. Le rythme est rapide, les références sont locales, et personne ne t'explique les règles. Ce module est là pour que tu ne sois jamais mal pris.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {ST_MODULES.map(mod => (
                <button key={mod.id} onClick={() => loadSTModule(mod)}
                  style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${ST_COLOR}20`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{mod.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: ST_COLOR, marginBottom: 3 }}>{mod.label}</div>
                  <div style={{ fontSize: 13, color: "#888", lineHeight: 1.4 }}>{mod.desc}</div>
                  {mod.id === "simulation" && <div style={{ marginTop: 8, fontSize: 12, background: ST_BG, color: ST_COLOR, borderRadius: 10, padding: "2px 8px", display: "inline-block", fontWeight: 600 }}>6 TOURS · QCM</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Module actif */}
        {activeSTModule && (
          <div ref={contentRef}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{activeSTModule.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: ST_COLOR, fontSize: 15 }}>{activeSTModule.label}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{activeSTModule.desc}</div>
                </div>
              </div>
              {/* 🔄 Bouton réservé au mode Enseignante */}
            </div>

            <div style={{ background: "white", borderRadius: 16, padding: 16, border: `1px solid ${ST_COLOR}15`, boxShadow: `0 2px 12px ${ST_COLOR}08` }}>
              {activeSTModule.id === "simulation" && content && !loading && !error && (
                <SimulationQCM data={content} />
              )}
              {loading && <div style={{ textAlign: "center", padding: "18px 0" }}><LoadingDots color={ST_COLOR} /><p style={{ color: "#888", fontSize: 14, marginTop: 6 }}>Génération en cours… (jusqu'à 3 tentatives si le serveur est occupé)</p></div>}
              {error && !loading && (
                <div style={{ textAlign: "center", padding: 18 }}>
                  <p style={{ fontSize: 15, color: "#c0392b", marginBottom: 10 }}>{error}</p>
                </div>
              )}
              {/* Écran d'attente si pas de contenu */}
              {!content && !loading && !error && activeSTModule.id !== "simulation" && (
                <div style={{ textAlign: "center", padding: "28px 16px" }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>☕</div>
                  <p style={{ fontWeight: 900, fontSize: 15, color: ST_COLOR, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Contenu bientôt disponible</p>
                  <p style={{ fontSize: 15, color: "#888", lineHeight: 1.6, margin: 0 }}>Caroline prépare ce contenu pour toi.<br/>Reviens dans quelques instants !</p>
                </div>
              )}
              {content && !loading && !error && activeSTModule.id !== "simulation" && (
                <>
                  {activeSTModule.id === "references" && <STReferencesCard data={content} />}
                  {activeSTModule.id === "entree_sortie" && <STEntreeSortieCard data={content} />}
                  {activeSTModule.id === "rythme" && <STRythmeCard data={content} />}
                  {activeSTModule.id === "lunch" && <STLunchCard data={content} />}
                  {activeSTModule.id === "valeurs" && <STValeursCard data={content} />}
                  {activeSTModule.id === "sacres" && <STSacresCard data={content} />}
                  {activeSTModule.id === "faux_amis" && <STFauxAmisCard data={content} />}
                </>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 13, color: "#999", marginBottom: 7 }}>Explorer aussi :</p>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {ST_MODULES.filter(m => m.id !== activeSTModule.id).map(m => (
                  <button key={m.id} onClick={() => loadSTModule(m)}
                    style={{ background: "white", border: `1px solid ${ST_COLOR}30`, borderRadius: 20, padding: "5px 11px", cursor: "pointer", fontSize: 14, color: ST_COLOR, fontWeight: 500 }}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function STLunchCard({ data }) {
  const [open, setOpen] = useState({ 0: true });
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 15, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>{data.intro}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.sections.map((s, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
              style={{ width: "100%", padding: "13px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>{s.titre}</span>
              </div>
              <span style={{ color: ST_COLOR, fontSize: 14 }}>{open[i] ? "▲" : "▼"}</span>
            </button>
            {open[i] && (
              <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${ST_COLOR}10` }}>
                <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: "10px 0 12px" }}>{s.contenu}</p>
                {s.expressions?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
                    {s.expressions.map((ex, j) => (
                      <div key={j} style={{ background: ST_BG, borderRadius: 8, padding: "8px 12px" }}>
                        <span style={{ fontWeight: 700, color: ST_COLOR, fontSize: 15 }}>« {ex.expression} »</span>
                        <span style={{ fontSize: 14, color: "#555", marginLeft: 8 }}>— {ex.explication}</span>
                      </div>
                    ))}
                  </div>
                )}
                {s.conseil && (
                  <div style={{ background: "#FFFBE6", border: "1px solid #FCD34D", borderRadius: 8, padding: "7px 10px" }}>
                    <p style={{ margin: 0, fontSize: 14 }}>💡 {s.conseil}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LectureGrammaireCard({ data, color }) {
  const [showNotion, setShowNotion] = useState(true);
  return (
    <div>
      <h3 style={{ color, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 14 }}>📅 {data.periode_precise}</p>

      {/* Encadré notion */}
      <div style={{ background: HG_BG, border: `1px solid ${color}30`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <button onClick={() => setShowNotion(s => !s)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <span style={{ fontWeight: 700, color, fontSize: 15 }}>✏️ Notion : {data.notion_titre}</span>
          <span style={{ color, fontSize: 15 }}>{showNotion ? "▲" : "▼"}</span>
        </button>
        {showNotion && (
          <div style={{ marginTop: 10 }}>
            <p style={{ margin: "0 0 10px", fontSize: 15, color: "#444", lineHeight: 1.6 }}>{data.notion_explication}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.notion_exemples.map((ex, i) => (
                <div key={i} style={{ background: "white", borderRadius: 8, padding: "7px 10px", fontSize: 15, color, fontStyle: "italic" }}>« {ex} »</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Texte historique */}
      <div style={{ background: "white", border: `1px solid ${color}20`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1F2937" }}>📖 {data.texte_titre}</h4>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "#374151" }}>
          {data.texte.split(new RegExp(`(${data.mots_cles?.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')).map((part, i) => {
            const isKey = data.mots_cles?.some(m => m.toLowerCase() === part.toLowerCase());
            return isKey ? <strong key={i} style={{ color, background: HG_BG, padding: "1px 4px", borderRadius: 4 }}>{part}</strong> : <span key={i}>{part}</span>;
          })}
        </p>
      </div>

      {/* Repère historique */}
      {data.repere_historique && (
        <div style={{ background: "#F8F8F8", borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: "#555" }}>🏛️ <strong>Repère :</strong> {data.repere_historique}</p>
        </div>
      )}

      {/* Exercices d'application */}
      <h4 style={{ color, marginBottom: 10, fontSize: 15 }}>✏️ À toi de jouer :</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.exercices.map((ex, i) => (
          <ExerciceItem key={i} exercice={ex} color={color} />
        ))}
      </div>
    </div>
  );
}

function ExerciceItem({ exercice, color }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ background: "white", border: `1px solid ${color}25`, borderRadius: 10, padding: 12 }}>
      <p style={{ margin: "0 0 8px", fontSize: 15, color: "#1F2937" }}>{exercice.consigne}</p>
      {!revealed ? (
        <button onClick={() => setRevealed(true)} style={{ fontSize: 14, color, background: "none", border: `1px solid ${color}40`, borderRadius: 16, padding: "4px 12px", cursor: "pointer" }}>
          Voir la réponse
        </button>
      ) : (
        <div style={{ background: HG_BG, borderRadius: 8, padding: "8px 12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 15, color, fontWeight: 600 }}>✓ {exercice.reponse}</p>
          {exercice.explication && <p style={{ margin: 0, fontSize: 14, color: "#666" }}>{exercice.explication}</p>}
        </div>
      )}
    </div>
  );
}

function TrousGrammaireCard({ data, color }) {
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);

  if (!data.texte_trous || !data.trous) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <p style={{ fontSize: 14, color: "#888" }}>Ce contenu doit être régénéré. En mode Enseignante, supprime-le et génère-le à nouveau.</p>
      </div>
    );
  }

  const parts = data.texte_trous.split(/(\{\{\d+\}\})/g);
  const score = checked ? data.trous.filter(t => (answers[t.id] || "").trim().toLowerCase() === t.reponse.toLowerCase()).length : 0;

  // Mélanger les mots si disponibles
  const mots = data.mots_a_utiliser || [];

  return (
    <div>
      <h3 style={{ color, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 14 }}>📅 {data.periode_precise}</p>

      <div style={{ background: HG_BG, border: `1px solid ${color}30`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 700, color, fontSize: 15 }}>✏️ Notion : {data.notion_titre}</p>
        <p style={{ margin: 0, fontSize: 15, color: "#444", lineHeight: 1.6 }}>{data.notion_explication}</p>
      </div>

      {/* Liste des mots à utiliser */}
      {mots.length > 0 && (
        <div style={{ background: "#FFFBE6", border: "1px solid #FCD34D", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#78350F" }}>📝 Mots à utiliser :</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {mots.map((mot, i) => (
              <span key={i} style={{ background: "white", border: "1px solid #FCD34D", borderRadius: 8, padding: "4px 12px", fontSize: 14, fontWeight: 600, color: "#92400E" }}>
                {mot}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "white", border: `1px solid ${color}20`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1F2937" }}>📖 {data.texte_titre}</h4>
        <div style={{ margin: 0, fontSize: 14, lineHeight: 2.1, color: "#374151" }}>
          {parts.map((part, i) => {
            const match = part.match(/\{\{(\d+)\}\}/);
            if (!match) return <span key={i}>{part}</span>;
            const id = match[1];
            const trou = data.trous.find(t => String(t.id) === id);
            const isCorrect = checked && (answers[id] || "").trim().toLowerCase() === trou?.reponse.toLowerCase();
            return (
              <input key={i} value={answers[id] || ""} disabled={checked}
                onChange={e => setAnswers(a => ({ ...a, [id]: e.target.value }))}
                placeholder="..."
                style={{
                  width: Math.max(60, (trou?.reponse.length || 6) * 11), display: "inline-block",
                  margin: "0 3px", padding: "2px 6px", borderRadius: 6, fontSize: 14, textAlign: "center",
                  border: `2px solid ${checked ? (isCorrect ? "#065F46" : "#DC2626") : color + "50"}`,
                  background: checked ? (isCorrect ? "#ECFDF5" : "#FEF2F2") : "white",
                  color: checked ? (isCorrect ? "#065F46" : "#DC2626") : "#1F2937", fontWeight: 600
                }} />
            );
          })}
        </div>
      </div>

      {!checked ? (
        <button onClick={() => setChecked(true)} disabled={Object.keys(answers).length < data.trous.length}
          style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: Object.keys(answers).length === data.trous.length ? color : "#D1D5DB", color: "white", fontSize: 14, fontWeight: 700, cursor: Object.keys(answers).length === data.trous.length ? "pointer" : "not-allowed" }}>
          {Object.keys(answers).length < data.trous.length ? `Complète tous les blancs (${Object.keys(answers).length}/${data.trous.length})` : "Vérifier mes réponses →"}
        </button>
      ) : (
        <div>
          <div style={{ background: score === data.trous.length ? "#ECFDF5" : "#FEF3E2", border: `1px solid ${score === data.trous.length ? "#065F46" : color}40`, borderRadius: 12, padding: "12px 16px", marginBottom: 14, textAlign: "center" }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: score === data.trous.length ? "#065F46" : color }}>{score}/{data.trous.length}</span>
            <span style={{ fontSize: 15, color: "#555", marginLeft: 8 }}>bonnes réponses</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {data.trous.filter(t => (answers[t.id] || "").trim().toLowerCase() !== t.reponse.toLowerCase()).map(t => (
              <div key={t.id} style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}>
                <strong style={{ color: "#92400E" }}>Réponse attendue : {t.reponse}</strong>
                {t.explication && <p style={{ margin: "3px 0 0", color: "#78350F" }}>{t.explication}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HGQuizCard({ data, color, onRetry }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const score = submitted ? data.questions.filter((q, i) => answers[i] === q.bonne_reponse).length : 0;
  const total = data.questions.length;
  function cs(q, idx, lettre) {
    const sel = answers[idx] === lettre, ok = lettre === q.bonne_reponse;
    if (!submitted) return { background: sel ? color + "15" : "white", border: `2px solid ${sel ? color : "#E5E7EB"}`, color: "#1F2937" };
    if (ok) return { background: "#ECFDF5", border: "2px solid #065F46", color: "#065F46" };
    if (sel && !ok) return { background: "#FEF2F2", border: "2px solid #DC2626", color: "#DC2626" };
    return { background: "white", border: "2px solid #E5E7EB", color: "#9CA3AF" };
  }
  return (
    <div>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#1F2937" }}>{data.titre}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.questions.map((q, idx) => (
          <div key={idx} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB" }}>
            <div style={{ background: "#F9FAFB", padding: "12px 14px", borderBottom: "1px solid #E5E7EB" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>{q.question}</p>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {q.choix.map(c => (
                <button key={c.lettre} onClick={() => !submitted && setAnswers(a => ({ ...a, [idx]: c.lettre }))}
                  style={{ ...cs(q, idx, c.lettre), borderRadius: 8, padding: "10px 12px", cursor: submitted ? "default" : "pointer", textAlign: "left", fontSize: 15, display: "flex", gap: 10, alignItems: "flex-start", width: "100%" }}>
                  <span style={{ minWidth: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, background: answers[idx] === c.lettre ? color : "#E5E7EB", color: answers[idx] === c.lettre ? "white" : "#6B7280" }}>{c.lettre}</span>
                  <span>{c.texte}</span>
                  {submitted && c.lettre === q.bonne_reponse && <span style={{ marginLeft: "auto" }}>✅</span>}
                </button>
              ))}
            </div>
            {submitted && (
              <div style={{ padding: "10px 14px 14px", background: answers[idx] === q.bonne_reponse ? "#F0FDF4" : "#FFF7ED" }}>
                <p style={{ margin: 0, fontSize: 15, color: "#374151" }}>{q.explication}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        {!submitted ? (
          <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < total}
            style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: Object.keys(answers).length === total ? color : "#D1D5DB", color: "white", fontSize: 14, fontWeight: 700, cursor: Object.keys(answers).length === total ? "pointer" : "not-allowed" }}>
            {Object.keys(answers).length < total ? `Réponds à toutes les questions (${Object.keys(answers).length}/${total})` : "Corriger →"}
          </button>
        ) : (
          <div>
            <div style={{ background: HG_BG, border: `1px solid ${color}40`, borderRadius: 12, padding: "14px 18px", marginBottom: 12, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{score}/{total}</div>
            </div>
            <button onClick={onRetry} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${color}`, background: "white", color, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>🔄 Nouveau quiz</button>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoireGrammaireScreen({ onBack }) {
  const [epoque, setEpoque] = useState(null);
  const [niveau, setNiveau] = useState("b1b2");
  const [mode, setMode] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const contentRef = useRef(null);

  const niveauLabel = {
    a2:   "niveau A2 (phrases courtes et simples, vocabulaire courant, structures élémentaires)",
    b1b2: "niveau B1-B2 (phrases de complexité moyenne, vocabulaire courant et professionnel)",
    c1c2: "niveau C1-C2 (phrases riches, nuances stylistiques, vocabulaire soutenu)"
  };

  function getNotionPourNiveau(ep) {
    return ep.notions[niveau] || ep.notions["b1b2"];
  }

  function buildLecturePrompt(ep) {
    const { notion, notionDesc } = getNotionPourNiveau(ep);
    const isLitterature = ep.id === "litterature";
    const isOralQC = ep.id === "oral_qc";

    let consigne;
    if (isLitterature && niveau === "c1c2") {
      consigne = `Pour le niveau C1-C2 sur "${ep.label}", crée un exercice d'analyse du joual comme langue littéraire québécoise. IMPORTANT : ne reproduis AUCUN extrait réel des œuvres protégées (Tremblay, Ducharme, etc.). À la place : 1) Décris les caractéristiques linguistiques du joual (phonologie : moé, toé, chu, y'a ; syntaxe : interrogation par intonation, négation sans 'ne' ; lexique : anglicismes, sacres comme intensificateurs) ; 2) Crée des dialogues ORIGINAUX inspirés du style joual, sans copier aucune œuvre existante ; 3) Propose des exercices d'analyse stylistique comparant joual et français standard. Mentionne les auteurs comme contexte historique seulement.`;
    } else if (isOralQC) {
      consigne = `Crée un exercice sur les particularités grammaticales du français québécois parlé. Utilise des exemples de conversations réelles au bureau ou dans la vie quotidienne au Québec. Le texte doit montrer clairement la différence entre le français standard écrit et le québécois parlé. Inclus des exemples concrets et des contre-exemples. Crée 3 exercices pratiques de reconnaissance et de transformation.`;
    } else {
      consigne = `Crée un exercice combinant histoire et grammaire pour l'époque "${ep.label}" (${ep.periode}), contexte : ${ep.contexte}. Le texte historique doit être factuel, intéressant, et illustrer naturellement la notion grammaticale ciblée. Identifie 4-6 mots-clés historiques dans "mots_cles". Crée 3 exercices d'application.`;
    }

    return `Tu es expert en histoire du Québec et du Canada (inspiré de Récitus) ET en grammaire française.
${consigne}
Niveau de langue : ${niveauLabel[niveau]}.
Notion de grammaire : ${notion} — ${notionDesc}.
JSON: {"titre":string,"periode_precise":string,"notion_titre":string,"notion_explication":string,"notion_exemples":[string],"texte_titre":string,"texte":string,"mots_cles":[string],"repere_historique":string,"exercices":[{"consigne":string,"reponse":string,"explication":string}]}
UNIQUEMENT JSON, sans markdown.`;
  }

  function buildTrousPrompt(ep) {
    const { notion, notionDesc } = getNotionPourNiveau(ep);
    const isOralQC = ep.id === "oral_qc";
    const contextePrompt = isOralQC
      ? `Crée un texte sur une situation quotidienne au Québec (conversation au bureau, à l'épicerie, entre collègues) illustrant les particularités grammaticales du québécois parlé.`
      : `Crée un texte historique factuel sur l'époque "${ep.label}" (${ep.periode}), contexte : ${ep.contexte}.`;

    return `Tu es expert en grammaire française et en québécois parlé.
${contextePrompt}
Niveau de langue : ${niveauLabel[niveau]}.
Notion de grammaire ciblée : ${notion} — ${notionDesc}.
Texte de 6-10 phrases. Choisis 5-7 mots/groupes illustrant la notion, remplace par {{1}}, {{2}}... Dans "trous", donne la réponse exacte et une explication grammaticale courte. Dans "mots_a_utiliser", liste les mots/formes à placer dans les trous dans le désordre (mélangés) pour que l'élève puisse les choisir sans devoir les inventer — c'est essentiel pour éviter les fausses erreurs.
JSON: {"titre":string,"periode_precise":string,"notion_titre":string,"notion_explication":string,"texte_titre":string,"texte_trous":string,"mots_a_utiliser":[string],"trous":[{"id":number,"reponse":string,"explication":string}]}
UNIQUEMENT JSON, sans markdown.`;
  }

  function buildQuizPrompt(ep) {
    const { notion, notionDesc } = getNotionPourNiveau(ep);
    const isOralQC = ep.id === "oral_qc";
    const contexteQuiz = isOralQC
      ? `dans des situations de communication quotidienne au Québec (bureau, commerces, conversations entre collègues)`
      : `à travers le contexte historique "${ep.label}" (${ep.contexte})`;

    return `Tu es expert en grammaire française et en québécois parlé.
Génère 4 questions QCM testant la notion "${notion}" (${notionDesc}) ${contexteQuiz}.
Niveau : ${niveauLabel[niveau]}. Mélange reconnaissance, transformation et application pratique.
JSON: {"titre":string,"questions":[{"question":string,"choix":[{"lettre":"A"|"B"|"C"|"D","texte":string}],"bonne_reponse":"A"|"B"|"C"|"D","explication":string}]}
UNIQUEMENT JSON, sans markdown.`;
  }

  async function loadContenu(ep, forcedMode = "contenu", forceRegen = false) {
    setEpoque(ep);
    setMode(forcedMode);
    setContent(null);
    setError(null);
    setLoading(true);
    setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    try {
      const subId = `${forcedMode}_${niveau}`;
      if (!forceRegen) {
        const cached = await getCached("hg", ep.id, subId);
        if (cached && cached.status === "validated") { setContent(cached.data); setLoading(false); return; }
        if (cached && cached.status === "pending") { setContent(cached.data); setLoading(false); return; }
      }
      const { format } = getNotionPourNiveau(ep);
      let prompt;
      if (forcedMode === "quiz") prompt = buildQuizPrompt(ep);
      else prompt = format === "trous" ? buildTrousPrompt(ep) : buildLecturePrompt(ep);
      const parsed = await callClaude([{ role: "user", content: prompt }],
        "Tu es expert en histoire du Québec et du Canada et en grammaire française, dans l'esprit pédagogique de Récitus (histoire.recitus.qc.ca). Tu réponds TOUJOURS en JSON valide uniquement, sans markdown, sans backticks.");
      await setCached("hg", ep.id, parsed, subId);
      setContent(parsed);
    } catch (e) { setError(`Erreur : ${e.message}`); console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "#3D1F0F", padding: "18px 16px", position: "relative", textAlign: "center" }}>
        <button onClick={onBack} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: "#D4A574", cursor: "pointer", fontSize: 14 }}>← Accueil</button>
        <h1 style={{ margin: 0, color: "white", fontSize: 20, fontWeight: 800 }}>📜 Histoire & Grammaire</h1>
        <p style={{ margin: "5px 0 0", color: "#D4A574", fontSize: 14 }}>Apprendre la grammaire à travers l'histoire du Québec</p>
      </div>

      {/* Sélecteur de niveau */}
      <div style={{ background: "white", borderBottom: "1px solid #E0E0E0", padding: "10px 16px", display: "flex", justifyContent: "center", gap: 6 }}>
        {NIVEAUX.map(n => (
          <button key={n.id} onClick={() => setNiveau(n.id)}
            style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${niveau === n.id ? HG_COLOR : "#E5E7EB"}`, background: niveau === n.id ? HG_COLOR : "white", color: niveau === n.id ? "white" : "#666", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {n.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* Frise chronologique */}
        {!epoque && (
          <div>
            <p style={{ fontSize: 15, color: "#666", marginBottom: 16, textAlign: "center" }}>
              Chaque époque historique te fait travailler une notion de grammaire précise — inspiré de la structure de <strong>Récitus</strong>, un site de référence en histoire du Québec.
            </p>
            {!isPremium() && (
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 14, color: "#92400E" }}>
                🎁 La première section est gratuite. Les 6 autres font partie de l'<strong>accès complet à 19 $</strong>.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {EPOQUES.map((ep, i) => {
                const n = ep.notions[niveau] || ep.notions["b1b2"];
                const locked = i > 0 && !isPremium();
                return (
                  <button key={ep.id} onClick={() => !locked && loadContenu(ep)}
                    style={{ background: locked ? "#F9F9F9" : "white", border: `1px solid ${locked ? "#E5E4E1" : ep.color+"30"}`, borderRadius: 14, padding: 16, cursor: locked ? "default" : "pointer", textAlign: "left", display: "flex", gap: 14, alignItems: "center", opacity: locked ? 0.7 : 1, transition: "all 0.15s", position: "relative" }}
                    onMouseEnter={e => { if (!locked) e.currentTarget.style.boxShadow = `0 4px 16px ${ep.color}25`; }}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: locked ? "#F0EFED" : ep.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                      {locked ? "🔒" : ep.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: locked ? "#999" : ep.color }}>{ep.label}</div>
                      <div style={{ fontSize: 13, color: "#999", marginBottom: 4 }}>{ep.periode}</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: locked ? "#F0EFED" : ep.bg, borderRadius: 10, padding: "2px 8px" }}>
                        <span style={{ fontSize: 13, color: locked ? "#aaa" : ep.color, fontWeight: 600 }}>✏️ {n.notion}</span>
                      </div>
                      {locked && <span style={{ display: "block", fontSize: 12, color: "#bbb", marginTop: 4 }}>🔒 Accès complet requis</span>}
                    </div>
                    {i < EPOQUES.length - 1 && <div style={{ position: "absolute", left: 38, bottom: -10, width: 2, height: 10, background: "#E5E7EB" }} />}
                  </button>
                );
              })}
            </div>
            {!isPremium() && (
              <div style={{ marginTop: 20 }}>
                <PremiumWall context="hg" onUnlock={() => { window.location.reload(); }} />
              </div>
            )}
          </div>
        )}

        {/* Contenu époque */}
        {epoque && (
          <div ref={contentRef}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <button onClick={() => { setEpoque(null); setContent(null); setMode(null); }}
                style={{ background: "none", border: "none", color: epoque.color, fontSize: 14, cursor: "pointer", padding: 0 }}>← Époques</button>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => loadContenu(epoque, "contenu")} disabled={loading}
                  style={{ fontSize: 13, padding: "5px 11px", borderRadius: 16, border: "none", cursor: loading ? "not-allowed" : "pointer", background: mode === "contenu" ? epoque.color : "white", color: mode === "contenu" ? "white" : epoque.color, fontWeight: 600, border: `1px solid ${epoque.color}40` }}>
                  📖 {(epoque.notions[niveau] || epoque.notions["b1b2"]).format === "trous" ? "Texte à trous" : "Lecture"}
                </button>
                <button onClick={() => loadContenu(epoque, "quiz")} disabled={loading}
                  style={{ fontSize: 13, padding: "5px 11px", borderRadius: 16, cursor: loading ? "not-allowed" : "pointer", background: mode === "quiz" ? epoque.color : "white", color: mode === "quiz" ? "white" : epoque.color, fontWeight: 600, border: `1px solid ${epoque.color}40` }}>
                  🧩 Quiz
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>{epoque.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: epoque.color, fontSize: 15 }}>{epoque.label}</div>
                <div style={{ fontSize: 13, color: "#888" }}>{epoque.periode} · niveau {NIVEAUX.find(n => n.id === niveau)?.label}</div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 16, padding: 16, border: `1px solid ${epoque.color}15`, boxShadow: `0 2px 12px ${epoque.color}08` }}>
              {loading && <div style={{ textAlign: "center", padding: "18px 0" }}><LoadingDots color={epoque.color} /><p style={{ color: "#888", fontSize: 14, marginTop: 6 }}>Génération en cours…</p></div>}
              {error && !loading && (
                <div style={{ textAlign: "center", padding: 18 }}>
                  <p style={{ fontSize: 15, color: "#c0392b", marginBottom: 10 }}>{error}</p>
                </div>
              )}
              {/* Écran d'attente si pas de contenu */}
              {!content && !loading && !error && (
                <div style={{ textAlign: "center", padding: "28px 16px" }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>📜</div>
                  <p style={{ fontWeight: 900, fontSize: 15, color: epoque.color, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Contenu bientôt disponible</p>
                  <p style={{ fontSize: 15, color: "#888", lineHeight: 1.6, margin: 0 }}>Caroline prépare ce contenu pour toi.<br/>Reviens dans quelques instants !</p>
                </div>
              )}
              {content && !loading && !error && mode === "quiz" && <HGQuizCard data={content} color={epoque.color} onRetry={() => loadContenu(epoque, "quiz")} />}
              {content && !loading && !error && mode === "contenu" && (epoque.notions[niveau] || epoque.notions["b1b2"]).format === "trous" && <TrousGrammaireCard data={content} color={epoque.color} />}
              {content && !loading && !error && mode === "contenu" && (epoque.notions[niveau] || epoque.notions["b1b2"]).format !== "trous" && <LectureGrammaireCard data={content} color={epoque.color} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AltPreview({ data, cacheKey }) {
  if (!data) return null;
  const [type, , subId] = cacheKey.split("__");

  if (data.dialogue) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.dialogue.map((l, i) => (
        <p key={i} style={{ margin: "0 0 6px" }}><strong>{l.personnage} :</strong> {l.texte}</p>
      ))}
      {data.explications?.map((e, i) => (
        <p key={i} style={{ margin: "0 0 4px", color: "#555" }}>• <em>« {e.expression} »</em> → {e.traduction_standard}</p>
      ))}
    </div>
  );

  if (data.expressions) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.expressions.map((e, i) => (
        <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < data.expressions.length - 1 ? "1px solid #E5E7EB" : "none" }}>
          <strong style={{ color: "#1D4ED8" }}>« {e.expression} »</strong>
          <span style={{ marginLeft: 8, fontSize: 13, background: "#EFF6FF", borderRadius: 10, padding: "1px 7px" }}>{e.registre}</span>
          <p style={{ margin: "3px 0 0", color: "#555", fontSize: 14 }}>{e.contexte}</p>
          <p style={{ margin: "2px 0 0", fontStyle: "italic", fontSize: 14 }}>« {e.exemple} »</p>
        </div>
      ))}
    </div>
  );

  if (data.versions) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 6 }}>{data.titre}</p>}
      {data.situation && <p style={{ color: "#555", marginBottom: 10, fontSize: 14 }}>Situation : {data.situation}</p>}
      {data.versions.map((v, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <strong style={{ fontSize: 14, textTransform: "uppercase", color: "#6B7280" }}>{v.registre}</strong>
          <p style={{ margin: "2px 0 0", fontStyle: "italic" }}>« {v.texte} »</p>
        </div>
      ))}
    </div>
  );

  if (data.concept) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 6 }}>{data.titre}</p>}
      <p style={{ fontWeight: 600, marginBottom: 6 }}>{data.concept}</p>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 8 }}>{data.comment_ca_marche}</p>
      {data.exemples?.map((e, i) => (
        <p key={i} style={{ margin: "0 0 4px", fontSize: 14 }}>📌 {e.situation} → <em>« {e.reaction_typique_quebecoise} »</em></p>
      ))}
    </div>
  );

  if (data.questions) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.questions.map((q, i) => (
        <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < data.questions.length - 1 ? "1px solid #E5E7EB" : "none" }}>
          <p style={{ fontWeight: 600, margin: "0 0 4px", fontSize: 14 }}>Q{i+1}. {q.question}</p>
          {q.choix.map(c => (
            <p key={c.lettre} style={{ margin: "1px 0", fontSize: 13, color: c.lettre === q.bonne_reponse ? "#065F46" : "#555", fontWeight: c.lettre === q.bonne_reponse ? 700 : 400 }}>
              {c.lettre === q.bonne_reponse ? "✓" : "○"} {c.lettre}. {c.texte}
            </p>
          ))}
        </div>
      ))}
    </div>
  );

  if (data.entrees) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>🚪 Entrer :</p>
      {data.entrees.map((e, i) => <p key={i} style={{ margin: "0 0 4px", fontSize: 14 }}>• <strong>« {e.formule} »</strong> — {e.quand}</p>)}
      <p style={{ fontWeight: 600, fontSize: 14, margin: "10px 0 4px" }}>👋 Sortir :</p>
      {data.sorties.map((s, i) => <p key={i} style={{ margin: "0 0 4px", fontSize: 14 }}>• <strong>« {s.formule} »</strong> — {s.quand}</p>)}
    </div>
  );

  if (data.references) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.references.map((r, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <p style={{ margin: "0 0 2px", fontWeight: 600 }}>{r.emoji} {r.sujet}</p>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: "#555" }}>{r.ce_quil_faut_savoir}</p>
        </div>
      ))}
    </div>
  );

  if (data.faux_amis) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.faux_amis.map((fa, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: ST_COLOR }}>« {fa.mot} »</p>
          <p style={{ margin: "0 0 1px", fontSize: 14, color: "#065F46" }}>🇨🇦 {fa.sens_quebec}</p>
          <p style={{ margin: 0, fontSize: 14, color: "#DC2626" }}>🇫🇷 {fa.sens_france_ou_malentendu}</p>
        </div>
      ))}
    </div>
  );

  if (data.scenarios) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.scenarios.map((s, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 14 }}>📌 {s.situation}</p>
          <p style={{ margin: "0 0 2px", fontSize: 13, color: "#DC2626" }}>❌ {s.ce_que_fait_immigrant}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#065F46" }}>✅ {s.comment_sen_sortir}</p>
        </div>
      ))}
    </div>
  );

  if (data.expressions && data.expressions[0]?.vrai_sens) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.expressions.map((e, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: ST_COLOR }}>« {e.expression} »</p>
          <p style={{ margin: 0, fontSize: 14, color: "#555" }}>{e.vrai_sens}</p>
        </div>
      ))}
    </div>
  );

  if (data.situations) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.situations.map((s, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 14 }}>Martin : « {s.ce_que_dit_martin} »</p>
          {s.reactions.map((r, j) => (
            <p key={j} style={{ margin: "1px 0", fontSize: 13, color: r.type === "ideal" ? "#065F46" : r.type === "mauvais" ? "#991B1B" : "#555" }}>
              {r.type === "ideal" ? "✅" : r.type === "mauvais" ? "❌" : "🆗"} « {r.reponse} »
            </p>
          ))}
        </div>
      ))}
    </div>
  );

  if (data.sections) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{s.emoji} {s.titre}</p>
          <p style={{ margin: "0 0 6px", fontSize: 14, color: "#555" }}>{s.contenu}</p>
          {s.expressions?.slice(0, 2).map((e, j) => (
            <p key={j} style={{ margin: "0 0 2px", fontSize: 13 }}>• <strong>« {e.expression} »</strong> — {e.explication}</p>
          ))}
        </div>
      ))}
    </div>
  );

  if (data.texte_trous) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 6 }}>{data.titre}</p>}
      <p style={{ fontSize: 14, color: "#555", marginBottom: 8 }}><strong>Notion :</strong> {data.notion_titre}</p>
      <p style={{ fontSize: 15, lineHeight: 1.7 }}>{data.texte_trous.replace(/\{\{\d+\}\}/g, "[ ___ ]")}</p>
    </div>
  );

  if (data.texte) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 6 }}>{data.titre}</p>}
      <p style={{ fontSize: 14, color: "#555", marginBottom: 8 }}><strong>Notion :</strong> {data.notion_titre}</p>
      <p style={{ fontSize: 15, lineHeight: 1.7 }}>{data.texte}</p>
    </div>
  );

  return (
    <div>
      {Object.entries(data).filter(([k]) => typeof data[k] === "string").slice(0, 5).map(([k, v]) => (
        <p key={k} style={{ margin: "0 0 6px", fontSize: 14 }}><strong>{k} :</strong> {v.substring(0, 120)}</p>
      ))}
    </div>
  );
}

function PremiumWall({ onUnlock, context = "secteur" }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit() {
    if (code.trim().toUpperCase() === ACCESS_CODE) {
      activatePremium();
      setSuccess(true);
      setTimeout(() => onUnlock(), 800);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  }

  const isHG = context === "hg";

  return (
    <div style={{ background: D.blanc, borderRadius: 12, padding: 24, border: `1px solid ${D.gris2}`, borderTop: `3px solid ${D.rouge}` }}>
      {/* Icône */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: D.gris0, border: `1px solid ${D.gris2}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 22 }}>
          🔒
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 500, color: D.noir, letterSpacing: -0.3 }}>
          {isHG ? "Histoire & Grammaire complet" : "Contenu professionnel"}
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: D.gris3, lineHeight: 1.6 }}>
          {isHG
            ? "Les 7 sections × 3 niveaux font partie de l'accès complet."
            : "Les modules par secteur professionnel font partie de l'accès complet."}
        </p>
      </div>

      {/* Ce qui est inclus */}
      <div style={{ background: D.gris0, borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 500, color: D.gris3, textTransform: "uppercase", letterSpacing: 0.5 }}>Accès complet à 19 $ — une seule fois</p>
        {[
          "6 secteurs professionnels (Construction, Finance, Santé, Éducation, Commerce, TI)",
          "5 modules par secteur : oral, vocabulaire, registres, culture, quiz",
          "Histoire & Grammaire — 7 sections × 3 niveaux (A2, B1-B2, C1-C2)",
          "Progression et suivi des résultats",
          "Accès illimité, sans abonnement",
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < 4 ? 6 : 0 }}>
            <span style={{ color: D.rouge, fontSize: 15, flexShrink: 0, marginTop: 1 }}>✓</span>
            <span style={{ fontSize: 14, color: D.gris4, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      {/* Gratuit inclus */}
      <p style={{ margin: "0 0 16px", fontSize: 13, color: D.gris3, textAlign: "center" }}>
        Déjà gratuit : Small talk complet · Lexique québécois · Une époque Histoire & Grammaire
      </p>

      {/* Saisie du code */}
      {!success ? (
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: D.gris4, fontWeight: 500 }}>Tu as déjà un code d'accès ?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={code} onChange={e => { setCode(e.target.value); setError(false); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Entre ton code ici"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${error ? D.rouge : D.gris2}`, fontSize: 15, outline: "none", color: D.noir, background: D.blanc, transition: "border-color 0.15s" }} />
            <button onClick={handleSubmit}
              style={{ background: D.noir, color: D.blanc, border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 15, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
              Activer →
            </button>
          </div>
          {error && <p style={{ margin: "6px 0 0", fontSize: 14, color: D.rouge }}>Code invalide — vérifie et réessaie.</p>}
          <div style={{ height: 1, background: D.gris2, margin: "16px 0" }} />
          <a href="https://carolinedouret.com" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", textAlign: "center", background: D.rouge, color: D.blanc, borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 500, textDecoration: "none" }}>
            Obtenir l'accès complet — 19 $ →
          </a>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: D.gris3, textAlign: "center" }}>
            Paiement unique · Accès illimité · Aucun abonnement
          </p>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <p style={{ fontSize: 15, color: "#065F46", fontWeight: 500 }}>✅ Accès activé ! Bienvenue.</p>
        </div>
      )}
    </div>
  );
}

function GenerateExpressionsBtn() {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [count, setCount] = useState(0);

  const PROMPT = `Tu es expert de la langue imagée québécoise. Génère 12 expressions imagées québécoises courantes dans les conversations de bureau et de pause café — des expressions métaphoriques ou idiomatiques qu'un francophone de France ou d'ailleurs ne comprend pas au sens littéral. Inclus des classiques comme : attacher sa tuque, péter de la broue, avoir le dos large, virer su'l'top, être dans le boutte, avoir du front tout le tour de la tête, se sucrer le bec, lâcher son fou, être game, tomber dans l'œil, avoir de l'allure, manger ses bas, etc.
JSON: {"expressions":[{"terme":string,"definition":string,"exemple":string}]}
UNIQUEMENT JSON, sans markdown.`;

  async function generate() {
    setStatus("loading");
    try {
      const parsed = await callClaude([{ role: "user", content: PROMPT }],
        "Tu es expert de la langue québécoise. Tu réponds TOUJOURS en JSON valide uniquement, sans markdown.");
      if (parsed.expressions?.length) {
        const annotations = parsed.expressions.map(e => ({ terme: e.terme, definition: `${e.definition}${e.exemple ? ` Ex. : ${e.exemple}` : ""}` }));
        addToLexique(annotations, "Expressions imagées");
        setCount(annotations.length);
        setStatus("done");
      }
    } catch (e) { setStatus("error"); }
  }

  if (status === "done") return <p style={{ fontSize: 15, color: "#065F46", fontWeight: 600 }}>✅ {count} expressions ajoutées au lexique !</p>;
  if (status === "error") return <p style={{ fontSize: 15, color: "#DC2626" }}>❌ Erreur — réessaie</p>;

  return (
    <button onClick={generate} disabled={status === "loading"}
      style={{ background: "#065F46", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 15, fontWeight: 600, cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? 0.7 : 1 }}>
      {status === "loading" ? "⏳ Génération…" : "💬 Générer les expressions → Lexique"}
    </button>
  );
}

function TeacherMode({ onClose }) {
  const [pwd, setPwd] = useState("");
  const [auth, setAuth] = useState(false);
  const [pwdError, setPwdError] = useState(false);
  const [cache, setCache] = useState({});
  const [cacheLoading, setCacheLoading] = useState(false);
  const [editKey, setEditKey] = useState(null);
  const [editText, setEditText] = useState("");
  const [regenLoading, setRegenLoading] = useState(null);
  const [altData, setAltData] = useState({});
  const [filter, setFilter] = useState("all");

  async function refresh() {
    setCacheLoading(true);
    if (USE_SUPABASE) {
      const data = await sbGetAll();
      setCache(data);
    } else {
    
      const raw = loadCache();
    
      const formatted = {};
      Object.entries(raw).forEach(([key, entry]) => {
        formatted[key] = { ...entry, id: key };
      });
      setCache(formatted);
    }
    setCacheLoading(false);
  }

  useEffect(() => { if (auth) refresh(); }, [auth]);

  function handleLogin() {
    if (pwd === TEACHER_PWD) { setAuth(true); setPwdError(false); }
    else { setPwdError(true); }
  }

  async function handleRegen(key, entry) {
    setRegenLoading(key);
    const [type, id, subId] = key.split("__");
    try {
      let prompt = "";
      if (type === "secteur") {
        const sec = SECTEURS.find(s => s.id === id);
        const mod = MODULES.find(m => m.id === subId);
        if (sec && mod) prompt = mod.id === "quiz" ? mod.buildPrompt(sec, "traduction") : mod.buildPrompt(sec);
      } else if (type === "st") {
        prompt = ST_PROMPTS[subId] || "";
      } else if (type === "hg") {
        const ep = EPOQUES.find(e => e.id === id);
        // subId format: "contenu_a2" | "contenu_b1b2" | "quiz_c1c2" etc.
        const [modeHG, niv] = subId.split("_");
        const notionData = ep?.notions?.[niv] || ep?.notions?.["b1b2"];
        if (ep && notionData) {
          prompt = modeHG === "quiz"
            ? `Quiz sur "${ep.label}", notion: ${notionData.notion}. JSON: {"titre":string,"questions":[{"question":string,"choix":[{"lettre":"A"|"B"|"C"|"D","texte":string}],"bonne_reponse":"A"|"B"|"C"|"D","explication":string}]} UNIQUEMENT JSON.`
            : notionData.format === "trous"
              ? `Texte à trous sur "${ep.label}" (${ep.periode}), notion: ${notionData.notion}. Inclus "mots_a_utiliser": liste mélangée des mots à placer dans les trous. JSON: {"titre":string,"periode_precise":string,"notion_titre":string,"notion_explication":string,"texte_titre":string,"texte_trous":string,"mots_a_utiliser":[string],"trous":[{"id":number,"reponse":string,"explication":string}]} UNIQUEMENT JSON.`
              : `Texte + exercices sur "${ep.label}" (${ep.periode}), notion: ${notionData.notion}. JSON: {"titre":string,"periode_precise":string,"notion_titre":string,"notion_explication":string,"notion_exemples":[string],"texte_titre":string,"texte":string,"mots_cles":[string],"repere_historique":string,"exercices":[{"consigne":string,"reponse":string,"explication":string}]} UNIQUEMENT JSON.`;
        }
      }
      if (!prompt) throw new Error("Prompt introuvable");
      const parsed = await callClaude([{ role: "user", content: prompt }],
        "Tu es expert de la langue et culture québécoise. Tu réponds TOUJOURS en JSON valide uniquement, sans markdown.");

      if (entry.status === "validated") {
      
        setAltData(a => ({ ...a, [key]: parsed }));
      } else {
      
        const c = loadCache();
        c[key] = { data: parsed, status: "pending", createdAt: new Date().toISOString() };
        saveCache(c);
        refresh();
      }
    } catch (e) { alert(`Erreur : ${e.message}`); }
    finally { setRegenLoading(null); }
  }

  async function handleKeepAlt(key) {
  
    const [type, id, subId] = key.split("__");
    await updateCached(type, id, altData[key], subId);
    setAltData(a => { const n = { ...a }; delete n[key]; return n; });
    refresh();
  }

  function handleDiscardAlt(key) {
    setAltData(a => { const n = { ...a }; delete n[key]; return n; });
  }

  async function handleValidate(key) {
    const [type, id, subId] = key.split("__");
    await validateCached(type, id, subId);
    refresh();
  }

  async function handleReject(key) {
    if (confirm("Supprimer ce contenu ?")) {
      const [type, id, subId] = key.split("__");
      await rejectCached(type, id, subId);
      refresh();
    }
  }

  async function handleEditSave(key) {
    try {
      const parsed = JSON.parse(editText);
      const [type, id, subId] = key.split("__");
      await updateCached(type, id, parsed, subId);
      setEditKey(null);
      refresh();
    } catch { alert("JSON invalide — vérifie la syntaxe."); }
  }

  const entries = Object.entries(cache);
  const filtered = entries.filter(([, v]) => filter === "all" || v.status === filter);
  const pendingCount = entries.filter(([, v]) => v.status === "pending").length;

  const LABEL = (key) => {
    const [type, id, subId] = key.split("__");
    if (type === "secteur") {
      const sec = SECTEURS.find(s => s.id === id);
      const modId = subId.replace(/_traduction|_situation|_registre/, "");
      const mod = MODULES.find(m => m.id === modId);
      return `${sec?.icon || ""} ${sec?.label || id} — ${mod?.label || subId}`;
    }
    if (type === "st") return `☕ Small talk — ${ST_MODULES.find(m => m.id === subId)?.label || subId}`;
    if (type === "hg") {
      const ep = EPOQUES.find(e => e.id === id);
      const [modeLabel, niv] = subId.split("_");
      return `📜 ${ep?.label || id} — ${modeLabel === "quiz" ? "Quiz" : "Lecture"} (${niv?.toUpperCase() || ""})`;
    }
    return key;
  };

  if (!auth) return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#1B2B1E", padding: "18px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 15 }}>← Retour</button>
        <h2 style={{ margin: 0, color: "white", fontSize: 18, fontWeight: 800 }}>🔑 Mode Enseignante</h2>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "white", borderRadius: 16, padding: 28, maxWidth: 320, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
            <h3 style={{ margin: 0, color: "#1B2B1E" }}>Accès Enseignante</h3>
            <p style={{ fontSize: 15, color: "#888", margin: "6px 0 0" }}>Valide et corrige les contenus générés</p>
          </div>
          <input type="password" value={pwd} onChange={e => { setPwd(e.target.value); setPwdError(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Mot de passe"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${pwdError ? "#DC2626" : "#E5E7EB"}`, fontSize: 14, marginBottom: 10, boxSizing: "border-box", outline: "none" }} />
          {pwdError && <p style={{ margin: "0 0 10px", fontSize: 14, color: "#DC2626" }}>Mot de passe incorrect</p>}
          <button onClick={handleLogin} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "#1B2B1E", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Entrer
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "#1B2B1E", padding: "18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 15 }}>← Retour</button>
          <h2 style={{ margin: 0, color: "white", fontSize: 17, fontWeight: 800 }}>🔑 Mode Enseignante</h2>
        </div>
        {pendingCount > 0 && <span style={{ background: "#F59E0B", color: "white", borderRadius: 10, fontSize: 13, padding: "3px 9px", fontWeight: 700 }}>{pendingCount} à valider</span>}
      </div>

      {/* Filtres */}
      <div style={{ background: "white", borderBottom: "1px solid #E0E0E0", padding: "10px 16px", display: "flex", gap: 8 }}>
        {[["all", "Tout"], ["pending", "⏳ À valider"], ["validated", "✅ Validés"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: filter === id ? "#1B2B1E" : "#F3F4F6", color: filter === id ? "white" : "#555" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 60px" }}>
        {cacheLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <LoadingDots color="#1B2B1E" />
            <p style={{ color: "#888", fontSize: 15, marginTop: 8 }}>Chargement depuis Supabase…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: 14, padding: 28, textAlign: "center", marginTop: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <p style={{ color: "#888", fontSize: 14 }}>
              {filter === "pending" ? "Aucun contenu en attente de validation." : filter === "validated" ? "Aucun contenu validé encore." : "Aucun contenu généré encore — navigue dans l'app pour en créer."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {filtered.map(([key, entry]) => (
              <div key={key} style={{ background: "white", borderRadius: 14, border: `1px solid ${entry.status === "validated" ? "#A7F3D0" : "#FDE68A"}`, overflow: "hidden" }}>
                {/* Header carte */}
                <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderBottom: "1px solid #F3F4F6" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#1F2937" }}>{LABEL(key)}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>{new Date(entry.created_at || entry.createdAt).toLocaleDateString("fr-CA")}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: entry.status === "validated" ? "#ECFDF5" : "#FFFBE6", color: entry.status === "validated" ? "#065F46" : "#92400E" }}>
                    {entry.status === "validated" ? "✅ Validé" : "⏳ À valider"}
                  </span>
                </div>

                {/* Aperçu du contenu */}
                {editKey === key ? (
                  <div style={{ padding: 14 }}>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      style={{ width: "100%", height: 200, fontSize: 13, fontFamily: "monospace", padding: 10, borderRadius: 8, border: "1px solid #E5E7EB", boxSizing: "border-box", resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => handleEditSave(key)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#065F46", color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>💾 Sauvegarder</button>
                      <button onClick={() => setEditKey(null)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "white", color: "#555", fontSize: 15, cursor: "pointer" }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "10px 14px", fontSize: 14, color: "#555", lineHeight: 1.5, maxHeight: 80, overflow: "hidden", position: "relative" }}>
                    <span style={{ color: "#9CA3AF" }}>{JSON.stringify(entry.data).substring(0, 180)}…</span>
                  </div>
                )}

                {/* Actions */}
                {editKey !== key && (
                  <div style={{ padding: "10px 14px", borderTop: "1px solid #F3F4F6", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {entry.status !== "validated" && (
                      <button onClick={() => handleValidate(key)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#ECFDF5", color: "#065F46", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✅ Valider</button>
                    )}
                    {entry.status === "validated" && (
                      <button onClick={async () => { await sbUpdate(key, { status: "pending" }); refresh(); }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#FEF2F2", color: "#DC2626", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>↩ Invalider</button>
                    )}
                    <button onClick={() => { setEditKey(key); setEditText(JSON.stringify(entry.data, null, 2)); }}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #E5E7EB", background: "white", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>✏️ Corriger</button>
                    <button onClick={() => handleRegen(key, entry)} disabled={regenLoading === key}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#EFF6FF", color: "#1D4ED8", fontSize: 14, fontWeight: 600, cursor: regenLoading === key ? "not-allowed" : "pointer", opacity: regenLoading === key ? 0.6 : 1 }}>
                      {regenLoading === key ? "⏳…" : entry.status === "validated" ? "🔄 Voir une alternative" : "🔄 Régénérer"}
                    </button>
                    <button onClick={() => handleReject(key)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#FEF2F2", color: "#DC2626", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>🗑️</button>
                  </div>
                )}

                {/* Alternative générée — comparaison */}
                {altData[key] && (
                  <div style={{ margin: "0 14px 14px", background: "#EFF6FF", borderRadius: 10, padding: 12, border: "1px solid #BFDBFE" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1D4ED8" }}>🔄 Alternative générée — lis et compare</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleKeepAlt(key)}
                          style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: "none", background: "#065F46", color: "white", fontWeight: 700, cursor: "pointer" }}>
                          ✅ Utiliser celle-ci
                        </button>
                        <button onClick={() => handleDiscardAlt(key)}
                          style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: "1px solid #93C5FD", background: "white", color: "#1D4ED8", cursor: "pointer" }}>
                          ✕ Ignorer
                        </button>
                      </div>
                    </div>
                    {/* Contenu lisible et scrollable */}
                    <div style={{ background: "white", borderRadius: 8, padding: 12, maxHeight: 320, overflowY: "auto", fontSize: 15, color: "#1F2937", lineHeight: 1.6 }}>
                      <AltPreview data={altData[key]} cacheKey={key} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Générateur d'expressions imagées → Lexique */}
        <div style={{ marginTop: 16, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#065F46" }}>💬 Expressions imagées → Lexique</p>
          <p style={{ margin: "0 0 10px", fontSize: 14, color: "#555", lineHeight: 1.5 }}>
            Génère les expressions imagées québécoises et les ajoute automatiquement au lexique pour tes élèves. À faire une seule fois.
          </p>
          <GenerateExpressionsBtn />
        </div>

        {/* Export / Import / Reset cache */}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Export */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#1D4ED8" }}>💾 Sauvegarder mes validations</p>
            <p style={{ margin: "0 0 10px", fontSize: 14, color: "#555", lineHeight: 1.5 }}>
              Télécharge tes validations en fichier JSON pour les réimporter dans une prochaine session.
            </p>
            <button onClick={() => {
              const data = { cache: loadCache(), lexique: loadLexique(), exportedAt: new Date().toISOString() };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `tu-comprends-tu-${new Date().toISOString().slice(0,10)}.json`;
              a.click(); URL.revokeObjectURL(url);
            }}
              style={{ background: "#1D4ED8", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              ⬇️ Exporter mes validations
            </button>
          </div>

          {/* Import */}
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#065F46" }}>📂 Restaurer mes validations</p>
            <p style={{ margin: "0 0 10px", fontSize: 14, color: "#555", lineHeight: 1.5 }}>
              Réimporte un fichier de validations exporté précédemment.
            </p>
            <input type="file" accept=".json" id="import-cache"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const data = JSON.parse(ev.target.result);
                    if (data.cache) { saveCache(data.cache); }
                    if (data.lexique) { saveLexique(data.lexique); }
                    refresh();
                    alert(`✅ ${Object.keys(data.cache || {}).length} contenus restaurés avec succès !`);
                  } catch { alert("❌ Fichier invalide — assure-toi d'importer un fichier exporté par l'app."); }
                };
                reader.readAsText(file);
                e.target.value = "";
              }} />
            <button onClick={() => document.getElementById("import-cache").click()}
              style={{ background: "#065F46", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              ⬆️ Importer un fichier de validations
            </button>
          </div>

          {/* Reset */}
          {entries.length > 0 && (
            <div style={{ textAlign: "center" }}>
              <button onClick={async () => { if (confirm("Effacer tout le cache ?")) { if (USE_SUPABASE) { const ids = Object.keys(cache); for (const id of ids) await sbDelete(id); } else { saveCache({}); } refresh(); } }}
                style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 20, padding: "6px 16px", fontSize: 14, color: "#9CA3AF", cursor: "pointer" }}>
                🗑️ Vider le cache
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressionScreen({ onClose }) {
  const [prog, setProg] = useState(loadProgression());
  const [tab, setTab] = useState("apercu");
  const totalQuiz = prog.quizScores.length;
  const avgScore = totalQuiz > 0 ? Math.round(prog.quizScores.reduce((a, s) => a + (s.score / s.total) * 100, 0) / totalQuiz) : null;
  const totalModules = Object.values(prog.modulesVus).reduce((a, m) => a + Object.values(m).reduce((b, c) => b + c, 0), 0);
  const ratees = prog.expressionsRatees.slice().reverse();
  const parSecteur = {};
  prog.quizScores.forEach(s => { if (!parSecteur[s.secteurId]) parSecteur[s.secteurId] = { label: s.secteurLabel, scores: [] }; parSecteur[s.secteurId].scores.push((s.score / s.total) * 100); });
  function clearData() { if (confirm("Effacer toute la progression ?")) { const e = { quizScores: [], modulesVus: {}, expressionsRatees: [] }; saveProgression(e); setProg(e); } }
  const TS = (a) => ({ padding: "8px 14px", background: "none", border: "none", borderBottom: a ? "2px solid #0369A1" : "2px solid transparent", color: a ? "#0369A1" : "#666", fontWeight: a ? 700 : 500, fontSize: 15, cursor: "pointer", whiteSpace: "nowrap" });

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "#1B2B1E", padding: "18px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 15, padding: 0 }}>← Retour</button>
        <h2 style={{ margin: 0, color: "white", fontSize: 18, fontWeight: 800 }}>📊 Ma progression</h2>
      </div>
      <div style={{ background: "white", borderBottom: "1px solid #E0E0E0", display: "flex", padding: "0 12px", overflowX: "auto" }}>
        {[["apercu","Aperçu"],["quiz","Résultats quiz"],["ratees",`À réviser${ratees.length > 0 ? ` (${ratees.length})` : ""}`],["modules","Modules explorés"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={TS(tab === id)}>{label}</button>
        ))}
      </div>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 60px" }}>
        {tab === "apercu" && (
          <div>
            {totalQuiz === 0 && totalModules === 0 ? (
              <div style={{ background: "white", borderRadius: 14, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                <p style={{ color: "#555", fontSize: 14, margin: 0 }}>Aucune activité encore — commence par choisir un secteur !</p>
              </div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[{label:"Quiz complétés",value:totalQuiz,icon:"🧩",color:"#0369A1"},{label:"Score moyen",value:avgScore!=null?`${avgScore}%`:"–",icon:"🎯",color:avgScore>=75?"#065F46":avgScore>=50?"#B45309":"#9B1C1C"},{label:"Sessions explorées",value:totalModules,icon:"📚",color:"#7B2D8B"}].map((s,i)=>(
                    <div key={i} style={{ background: "white", borderRadius: 12, padding: "14px 12px", textAlign: "center", border: `1px solid ${s.color}20` }}>
                      <div style={{ fontSize: 22 }}>{s.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1.2, marginTop: 4 }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {Object.keys(parSecteur).length > 0 && (
                  <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <h4 style={{ margin: "0 0 14px", fontSize: 15, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>Score moyen par secteur</h4>
                    {Object.entries(parSecteur).map(([id,{label,scores}]) => {
                      const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
                      const sec = SECTEURS.find(s=>s.id===id);
                      const bc = avg>=75?"#065F46":avg>=50?"#B45309":"#9B1C1C";
                      return (<div key={id} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 15, color: "#333" }}>{sec?.icon} {label}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: bc }}>{avg}%</span>
                        </div>
                        <div style={{ background: "#F3F4F6", borderRadius: 10, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${avg}%`, height: "100%", background: bc, borderRadius: 10 }} />
                        </div>
                        <div style={{ fontSize: 12, color: "#999", marginTop: 3 }}>{scores.length} quiz complété{scores.length>1?"s":""}</div>
                      </div>);
                    })}
                  </div>
                )}
                {ratees.length > 0 && (
                  <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 14, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <h4 style={{ margin: 0, fontSize: 15, color: "#92400E" }}>⚠️ Expressions à réviser</h4>
                      <button onClick={() => setTab("ratees")} style={{ fontSize: 13, color: "#0369A1", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Voir tout →</button>
                    </div>
                    {ratees.slice(0,3).map((r,i)=>(
                      <div key={i} style={{ fontSize: 15, color: "#78350F", background: "white", borderRadius: 8, padding: "6px 10px", marginBottom: 6 }}>
                        <strong>« {r.expression} »</strong> — {r.secteurLabel}
                      </div>
                    ))}
                    {ratees.length>3 && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#92400E" }}>+ {ratees.length-3} autre{ratees.length-3>1?"s":""}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {tab === "quiz" && (
          <div>
            {prog.quizScores.length === 0 ? <div style={{ background: "white", borderRadius: 14, padding: 24, textAlign: "center" }}><p style={{ color: "#888", fontSize: 14 }}>Aucun quiz complété encore.</p></div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {prog.quizScores.slice().reverse().map((s,i) => {
                  const pct = Math.round((s.score/s.total)*100);
                  const sec = SECTEURS.find(x=>x.id===s.secteurId);
                  const bc = pct>=75?"#065F46":pct>=50?"#B45309":"#9B1C1C";
                  return (<div key={i} style={{ background: "white", borderRadius: 12, padding: 14, border: "1px solid #E5E7EB" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div><span style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{sec?.icon} {s.secteurLabel}</span>{s.type&&<span style={{ marginLeft: 8, fontSize: 13, background: "#EFF6FF", color: "#1D4ED8", borderRadius: 10, padding: "1px 7px" }}>{s.type}</span>}</div>
                      <span style={{ fontSize: 20, fontWeight: 800, color: bc }}>{pct}%</span>
                    </div>
                    <div style={{ background: "#F3F4F6", borderRadius: 10, height: 6, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: bc, borderRadius: 10 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "#888" }}>{s.score}/{s.total} bonnes réponses</span>
                      <span style={{ fontSize: 13, color: "#aaa" }}>{new Date(s.date).toLocaleDateString("fr-CA")}</span>
                    </div>
                  </div>);
                })}
              </div>
            )}
          </div>
        )}
        {tab === "ratees" && (
          <div>
            {ratees.length === 0 ? <div style={{ background: "white", borderRadius: 14, padding: 24, textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div><p style={{ color: "#555", fontSize: 14 }}>Aucune expression à réviser !</p></div> : (
              <div>
                <p style={{ fontSize: 15, color: "#666", marginBottom: 14 }}>Ces expressions t'ont posé problème dans les quiz. Révise-les avant ta prochaine session !</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ratees.map((r,i) => {
                    const sec = SECTEURS.find(s=>s.id===r.secteurId);
                    return (<div key={i} style={{ background: "white", borderRadius: 12, padding: 14, border: "1px solid #FED7AA", borderLeft: "4px solid #F59E0B" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <strong style={{ fontSize: 15, color: "#92400E" }}>« {r.expression} »</strong>
                        <span style={{ fontSize: 12, background: sec?.bg||"#F8F8F8", color: sec?.color||"#555", borderRadius: 10, padding: "2px 8px", border: `1px solid ${sec?.color||"#555"}20`, whiteSpace: "nowrap", marginLeft: 8 }}>{sec?.icon} {r.secteurLabel}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 15, color: "#555", lineHeight: 1.5 }}>{r.explication}</p>
                      {r.astuce&&<p style={{ margin: "5px 0 0", fontSize: 14, color: "#888", fontStyle: "italic" }}>💡 {r.astuce}</p>}
                    </div>);
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {tab === "modules" && (
          <div>
            {totalModules === 0 ? <div style={{ background: "white", borderRadius: 14, padding: 24, textAlign: "center" }}><p style={{ color: "#888", fontSize: 14 }}>Aucun module exploré encore.</p></div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {SECTEURS.filter(s=>prog.modulesVus[s.id]).map(s=>(
                  <div key={s.id} style={{ background: "white", borderRadius: 12, padding: 14, border: `1px solid ${s.color}20` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                      <span style={{ fontWeight: 700, color: s.color, fontSize: 14 }}>{s.label}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {MODULES.map(m => { const c = prog.modulesVus[s.id]?.[m.id]||0; if(!c) return null; return (<div key={m.id} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 14 }}>{m.icon}</span><span style={{ fontSize: 14, color: s.color, fontWeight: 600 }}>{m.label}</span><span style={{ fontSize: 13, background: s.color, color: "white", borderRadius: 10, padding: "0 5px", fontWeight: 700 }}>{c}×</span></div>); })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ marginTop: 30, textAlign: "center" }}>
          <button onClick={clearData} style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 20, padding: "6px 16px", fontSize: 14, color: "#9CA3AF", cursor: "pointer" }}>🗑️ Effacer la progression</button>
        </div>
      </div>
    </div>
  );
}

function QuizCard({ data, color, secteur, onRetry, onNewType, onQuizDone }) {
  // Support ancien format (questions) et nouveau format (quiz)
  const allQuestions = data.quiz || data.questions || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [completed, setCompleted] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  const q = allQuestions[currentIdx];
  const total = allQuestions.length;
  const isSubmitted = submitted[currentIdx];
  const isCorrect = isSubmitted && answers[currentIdx] === q?.bonne_reponse;

  function cs(lettre) {
    const isSel = answers[currentIdx] === lettre;
    const isOk = lettre === q?.bonne_reponse;
    if (!isSubmitted) return { background: isSel ? color+"15" : "white", border: `2px solid ${isSel ? color : "#E5E7EB"}`, color: "#1F2937" };
    if (isOk) return { background: "#ECFDF5", border: "2px solid #065F46", color: "#065F46" };
    if (isSel && !isOk) return { background: "#FEF2F2", border: "2px solid #DC2626", color: "#DC2626" };
    return { background: "white", border: "2px solid #E5E7EB", color: "#9CA3AF" };
  }

  function handleSubmit() {
    const correct = answers[currentIdx] === q.bonne_reponse;
    setSubmitted(s => ({ ...s, [currentIdx]: true }));
    if (correct) setTotalScore(s => s + 1);
  }

  function handleNext() {
    if (currentIdx < total - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      // Tous les quiz terminés
      const ratees = allQuestions
        .filter((q, i) => answers[i] !== q.bonne_reponse)
        .map(q => ({
          expression: q.question.length > 60 ? q.question.substring(0, 60) + "…" : q.question,
          explication: q.explication, astuce: q.astuce || "",
          secteurId: secteur?.id, secteurLabel: secteur?.label, date: new Date().toISOString()
        }));
      onQuizDone({ score: totalScore + (answers[currentIdx] === q.bonne_reponse ? 1 : 0), total, type: data.type, ratees });
      setCompleted(true);
    }
  }

  const QT = [{ id: "traduction", label: "Traduction", icon: "🔤" }, { id: "situation", label: "Mise en situation", icon: "🎭" }, { id: "registre", label: "Registres", icon: "🎚️" }];

  // Écran de fin
  if (completed) {
    const finalScore = Object.entries(answers).filter(([i, a]) => allQuestions[i]?.bonne_reponse === a).length;
    const pct = Math.round((finalScore / total) * 100);
    const sc = pct === 100 ? "#065F46" : pct >= 75 ? "#B45309" : "#9B1C1C";
    const sb = pct === 100 ? "#ECFDF5" : pct >= 75 ? "#FEF3E2" : "#FEF2F2";
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>🎉</div>
        <h3 style={{ margin: "0 0 8px", color: "#111" }}>Tous les quiz complétés !</h3>
        <div style={{ background: sb, border: `1px solid ${sc}40`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "inline-block" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: sc }}>{finalScore}/{total}</div>
          <div style={{ fontSize: 14, color: sc, marginTop: 4 }}>
            {pct === 100 ? "Parfait ! T'as toute compris ! 🎉" : pct >= 75 ? "Pas pire ! Encore un p'tit effort ! 💪" : pct >= 50 ? "Continue, t'es sur la bonne track ! 📚" : "Lâche pas, ça va venir ! 🍁"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setCurrentIdx(0); setAnswers({}); setSubmitted({}); setCompleted(false); setTotalScore(0); }}
            style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1px solid ${color}`, background: "white", color, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            ↩ Recommencer ces quiz
          </button>
          <button onClick={onRetry}
            style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: color, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            🔄 Nouveaux quiz
          </button>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: "#1F2937" }}>{data.titre}</h3>
        <span style={{ fontSize: 13, background: color+"20", color, borderRadius: 10, padding: "2px 10px", fontWeight: 600 }}>
          {currentIdx + 1}/{total}
        </span>
      </div>

      {/* Barre de progression */}
      <div style={{ background: "#E5E7EB", borderRadius: 10, height: 6, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ width: `${((currentIdx) / total) * 100}%`, height: "100%", background: color, transition: "width 0.3s" }} />
      </div>

      {/* Sélecteur de type */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {QT.map(t => (
          <button key={t.id} onClick={() => onNewType(t.id)}
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, cursor: "pointer", fontWeight: 500, background: "white", color, border: `1px solid ${color}40` }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Question */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB", marginBottom: 14 }}>
        <div style={{ background: "#F9FAFB", padding: "12px 14px", borderBottom: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, marginBottom: 4 }}>QUESTION {currentIdx + 1} SUR {total}</div>
          {q.contexte && <div style={{ fontSize: 13, color: "#6B7280", fontStyle: "italic", marginBottom: 5 }}>📍 {q.contexte}</div>}
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827", lineHeight: 1.5 }}>{q.question}</p>
        </div>
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {q.choix.map(c => (
            <button key={c.lettre} onClick={() => !isSubmitted && setAnswers(a => ({ ...a, [currentIdx]: c.lettre }))}
              style={{ ...cs(c.lettre), borderRadius: 8, padding: "10px 12px", cursor: isSubmitted ? "default" : "pointer", textAlign: "left", fontSize: 14, display: "flex", gap: 10, alignItems: "flex-start", transition: "all 0.15s", width: "100%" }}>
              <span style={{ minWidth: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: answers[currentIdx] === c.lettre ? color : "#E5E7EB", color: answers[currentIdx] === c.lettre ? "white" : "#6B7280" }}>{c.lettre}</span>
              <span style={{ lineHeight: 1.4 }}>{c.texte}</span>
              {isSubmitted && c.lettre === q.bonne_reponse && <span style={{ marginLeft: "auto" }}>✅</span>}
              {isSubmitted && answers[currentIdx] === c.lettre && c.lettre !== q.bonne_reponse && <span style={{ marginLeft: "auto" }}>❌</span>}
            </button>
          ))}
        </div>
        {isSubmitted && (
          <div style={{ padding: "10px 14px 14px", background: isCorrect ? "#F0FDF4" : "#FFF7ED", borderTop: `1px solid ${isCorrect ? "#BBF7D0" : "#FED7AA"}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: isCorrect ? "#065F46" : "#92400E" }}>
              {isCorrect ? "✅ Bonne réponse !" : `✅ Bonne réponse : ${q.bonne_reponse}`}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#374151" }}>{q.explication}</p>
            {q.astuce && <p style={{ margin: 0, fontSize: 13, color: "#6B7280", fontStyle: "italic" }}>💡 {q.astuce}</p>}
          </div>
        )}
      </div>

      {/* Boutons */}
      {!isSubmitted ? (
        <button onClick={handleSubmit} disabled={!answers[currentIdx]}
          style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: answers[currentIdx] ? color : "#D1D5DB", color: "white", fontSize: 14, fontWeight: 700, cursor: answers[currentIdx] ? "pointer" : "not-allowed" }}>
          Vérifier ma réponse →
        </button>
      ) : (
        <button onClick={handleNext}
          style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: color, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {currentIdx < total - 1 ? `Question suivante → (${currentIdx + 2}/${total})` : "Voir mes résultats 🎉"}
        </button>
      )}
    </div>
  );
}

function DialogueCard({ data, color }) {
  const [rev, setRev] = useState({});
  const ann = data.annotations || [];
  return (
    <div>
      <h3 style={{ color, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      {data.lieu&&<p style={{ color: "#888", fontSize: 15, marginBottom: 14 }}>📍 {data.lieu}</p>}
      {ann.length > 0 && <p style={{ fontSize: 13, color: "#999", marginBottom: 10, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
      <div style={{ background: "#F8F8F8", borderRadius: 12, padding: 14, marginBottom: 18 }}>
        {data.dialogue.map((line,i)=>(
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ background: color, color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", marginTop: 3, flexShrink: 0 }}>{line.personnage}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
                  <AnnotatedText text={line.texte} annotations={ann} />
                </p>
                {!rev[i]?<button onClick={()=>setRev(r=>({...r,[i]:true}))} style={{ marginTop: 4, fontSize: 14, color, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>💡 Note phonétique</button>
                :<p style={{ margin: "4px 0 0", fontSize: 14, color: "#555", fontStyle: "italic", background: "white", padding: "4px 8px", borderRadius: 6 }}>📢 {line.note_phonetique}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <h4 style={{ color, marginBottom: 10, fontSize: 15 }}>À retenir :</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.explications.map((e,i)=>(
          <div key={i} style={{ background: "white", border: `1px solid ${color}30`, borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              <strong style={{ color, fontSize: 14 }}>« {e.expression} »</strong>
              {e.specifique_au_secteur&&<span style={{ fontSize: 12, background: color, color: "white", borderRadius: 10, padding: "1px 8px" }}>SECTEUR</span>}
            </div>
            <p style={{ margin: "3px 0 1px", fontSize: 14, color: "#666" }}>S'entend comme : <em>« {e.ce_que_ca_sonne} »</em></p>
            <p style={{ margin: 0, fontSize: 14, color: "#444" }}>Standard : <em>{e.traduction_standard}</em></p>
          </div>
        ))}
      </div>
    </div>
  );
}
function VocabCard({ data, color }) {
  const rc={formel:"#1B4332",neutre:"#7B2D8B",familier:"#9E4F00"}, rb={formel:"#F0F7F4",neutre:"#F5EEF8",familier:"#FEF3E2"};
  return <div><h3 style={{ marginBottom: 14, fontSize: 17 }}>{data.titre}</h3><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {data.expressions.map((e,i)=>(
      <div key={i} style={{ background: rb[e.registre]||"#F8F8F8", border: `1px solid ${(rc[e.registre]||color)}30`, borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          <strong style={{ fontSize: 15, color: rc[e.registre]||color }}>« {e.expression} »</strong>
          <span style={{ background: rc[e.registre]||color, color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 12, textTransform: "uppercase" }}>{e.registre}</span>
        </div>
        <p style={{ margin: "0 0 4px", fontSize: 14, color: "#444" }}><strong>Contexte :</strong> {e.contexte}</p>
        <p style={{ margin: "0 0 4px", fontSize: 15, color: "#333", fontStyle: "italic" }}>« {e.exemple} »</p>
        {e.equivalent_france&&<p style={{ margin: "0 0 3px", fontSize: 13, color: "#777" }}>🇫🇷 En France : <em>{e.equivalent_france}</em></p>}
        {e.piege&&<p style={{ margin: "5px 0 0", fontSize: 13, color: "#c0392b", background: "#fdecea", borderRadius: 6, padding: "3px 8px" }}>⚠️ {e.piege}</p>}
      </div>
    ))}
  </div></div>;
}
function RegistreCard({ data }) {
  const colors=["#1B4332","#7B2D8B","#9E4F00"], bgs=["#F0F7F4","#F5EEF8","#FEF3E2"];
  return <div><h3 style={{ marginBottom: 8, fontSize: 17 }}>{data.titre}</h3>
    <div style={{ background: "#F8F8F8", borderRadius: 10, padding: 12, marginBottom: 16 }}><p style={{ margin: 0, fontSize: 15 }}><strong>Situation :</strong> {data.situation}</p></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
      {data.versions.map((v,i)=>(
        <div key={i} style={{ background: bgs[i], borderLeft: `4px solid ${colors[i]}`, borderRadius: "0 10px 10px 0", padding: 12 }}>
          <div style={{ color: colors[i], fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{v.registre}</div>
          <p style={{ margin: "0 0 6px", fontSize: 14, lineHeight: 1.6, fontStyle: "italic" }}>
            <AnnotatedText text={`« ${v.texte} »`} annotations={data.annotations||[]} />
          </p>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "#666" }}>📍 {v.quand_utiliser}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{v.signes_distinctifs.map((s,j)=><span key={j} style={{ background: "white", border: `1px solid ${colors[i]}40`, borderRadius: 20, padding: "2px 7px", fontSize: 12, color: "#444" }}>{s}</span>)}</div>
        </div>
      ))}
    </div>
    {data.conseil&&<div style={{ background: "#FFFBE6", border: "1px solid #FFD700", borderRadius: 10, padding: 12 }}><p style={{ margin: 0, fontSize: 15 }}>💡 <strong>Conseil :</strong> {data.conseil}</p></div>}
  </div>;
}
function CultureCard({ data, color }) {
  const ann = data.annotations || [];
  return <div>
    <h3 style={{ marginBottom: 8, fontSize: 17 }}>{data.titre}</h3>
    {ann.length > 0 && <p style={{ fontSize: 13, color: "#999", marginBottom: 10, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
    <div style={{ background: "#FFF5F5", borderLeft: `4px solid ${color}`, borderRadius: "0 10px 10px 0", padding: 12, marginBottom: 12 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{data.concept}</p></div>
    <p style={{ fontSize: 15, color: "#555", margin: "0 0 5px" }}><strong>😕 Pourquoi ça surprend :</strong> <AnnotatedText text={data.pourquoi_ca_surprend} annotations={ann} /></p>
    <p style={{ fontSize: 15, color: "#333", margin: "0 0 14px" }}><strong>🎯 Comment ça marche :</strong> <AnnotatedText text={data.comment_ca_marche} annotations={ann} /></p>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
      {data.exemples.map((ex,i)=>(
        <div key={i} style={{ background: "#F8F8F8", borderRadius: 10, padding: 12 }}>
          <p style={{ margin: "0 0 5px", fontSize: 15, fontWeight: 600 }}>📌 {ex.situation}</p>
          <p style={{ margin: "0 0 3px", fontSize: 15, color: "#1B4332", fontStyle: "italic" }}>🇨🇦 « <AnnotatedText text={ex.reaction_typique_quebecoise} annotations={ann} /> »</p>
          <p style={{ margin: 0, fontSize: 13, color: "#777" }}>→ {ex.interpretation_possible}</p>
        </div>
      ))}
    </div>
    {data.conseil_pratique&&<div style={{ background: "#FFFBE6", border: "1px solid #FFD700", borderRadius: 10, padding: 12 }}><p style={{ margin: 0, fontSize: 15 }}>💡 <strong>À retenir :</strong> {data.conseil_pratique}</p></div>}
  </div>;
}
function ResultCard({ moduleId, data, color, secteur, onQuizRetry, onQuizNewType, onQuizDone }) {
  try {
    const p = typeof data==="string"?JSON.parse(data):data;
    if(moduleId==="oral") return <DialogueCard data={p} color={color} />;
    if(moduleId==="vocab") return <VocabCard data={p} color={color} />;
    if(moduleId==="registre") return <RegistreCard data={p} color={color} />;
    if(moduleId==="culture") return <CultureCard data={p} color={color} />;
    if(moduleId==="quiz") return <QuizCard data={p} color={color} secteur={secteur} onRetry={onQuizRetry} onNewType={onQuizNewType} onQuizDone={onQuizDone} />;
  } catch { return <p style={{ color: "#c0392b", fontSize: 14 }}>Erreur de format. Réessaie !</p>; }
  return null;
}

const D = {
  noir:  "#111111",
  blanc: "#FFFFFF",
  rouge: "#E63030",
  gris0: "#F7F7F5",
  gris1: "#F0EFED",
  gris2: "#E5E4E1",
  gris3: "#999999",
  gris4: "#555555",
};

function LexiqueScreen({ onBack }) {
  const [search, setSearch] = useState("");
  const lex = loadLexique();
  const entries = Object.values(lex).sort((a, b) => a.terme.localeCompare(b.terme, "fr"));
  const filtered = entries.filter(e =>
    !search || e.terme.toLowerCase().includes(search.toLowerCase()) || e.definition.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{ minHeight: "100vh", background: D.gris0, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: D.noir, padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: D.gris3, cursor: "pointer", fontSize: 14, padding: 0 }}>←</button>
          <div>
            <h2 style={{ margin: 0, color: D.blanc, fontSize: 17, fontWeight: 500, letterSpacing: -0.3 }}>Lexique québécois</h2>
            <p style={{ margin: "2px 0 0", color: D.gris3, fontSize: 13 }}>{entries.length} expression{entries.length > 1 ? "s" : ""} · se remplit au fil des sessions</p>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 14px 60px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher une expression…"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${D.gris2}`, fontSize: 14, marginBottom: 14, boxSizing: "border-box", outline: "none", background: D.blanc, color: D.noir }} />
        {entries.length === 0 ? (
          <div style={{ background: D.blanc, borderRadius: 10, padding: 28, textAlign: "center", border: `1px solid ${D.gris2}` }}>
            <p style={{ fontWeight: 500, color: D.noir, fontSize: 14, margin: "0 0 6px" }}>Lexique vide pour l'instant</p>
            <p style={{ color: D.gris3, fontSize: 15, margin: 0, lineHeight: 1.6 }}>Explore un module pour alimenter le lexique automatiquement. Les expressions imagées québécoises s'y retrouvent aussi !</p>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color: D.gris3, fontSize: 14, textAlign: "center", padding: 24 }}>Aucun résultat pour « {search} »</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((entry, i) => (
              <div key={i} style={{ background: D.blanc, borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid ${D.rouge}`, border: `1px solid ${D.gris2}`, borderLeft: `3px solid ${D.rouge}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <strong style={{ fontSize: 14, color: D.noir, fontWeight: 500 }}>« {entry.terme} »</strong>
                  {entry.sources?.length > 0 && <span style={{ fontSize: 12, color: D.gris3, whiteSpace: "nowrap" }}>{entry.sources[0]}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 15, color: D.gris4, lineHeight: 1.5 }}>{entry.definition}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [secteur, setSecteur] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState({});
  const [quizType, setQuizType] = useState("traduction");
  const [sessionStats, setSessionStats] = useState({ quizDone: 0, modulesDone: 0 });
  const [fontSize, setFontSize] = useState(1);
  const resultRef = useRef(null);

  const FS = fontSize === 0 ? 0.85 : fontSize === 2 ? 1.2 : 1;

  async function loadModule(mod, sec=secteur, qType=quizType, forceRegen=false) {
    setActiveModule(mod); setContent(null); setError(null); setLoading(true);
    setTimeout(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),100);
    try {
      const subId = mod.id==="quiz" ? `${mod.id}_${qType}` : mod.id;
      if (!forceRegen) {
        const cached = await getCached("secteur", sec.id, subId);
        if (cached) { setContent(cached.data); setHistory(h=>({...h,[`${sec.id}-${mod.id}`]:(h[`${sec.id}-${mod.id}`]||0)+1})); setLoading(false); return; }
      }
      const prompt = mod.id==="quiz"?mod.buildPrompt(sec,qType):mod.buildPrompt(sec);
      const parsed = await callClaude([{role:"user",content:prompt}], "Tu es expert de la langue et culture québécoise professionnelle. Tu réponds TOUJOURS en JSON valide uniquement, sans markdown, sans backticks, sans preamble.");
      await setCached("secteur", sec.id, parsed, subId);
      addToLexique(parsed.annotations, `${sec.label} — ${mod.label}`);
      setContent(parsed);
      setHistory(h=>({...h,[`${sec.id}-${mod.id}`]:(h[`${sec.id}-${mod.id}`]||0)+1}));
      if(mod.id!=="quiz") {
        const prog=loadProgression();
        if(!prog.modulesVus[sec.id]) prog.modulesVus[sec.id]={};
        prog.modulesVus[sec.id][mod.id]=(prog.modulesVus[sec.id][mod.id]||0)+1;
        saveProgression(prog);
        setSessionStats(s=>({...s,modulesDone:s.modulesDone+1}));
      }
    } catch(e) { setError(`Erreur : ${e.message}`); console.error(e); }
    finally { setLoading(false); }
  }

  function handleQuizDone({score,total,type,ratees}) {
    const prog=loadProgression();
    prog.quizScores.push({date:new Date().toISOString(),secteurId:secteur.id,secteurLabel:secteur.label,score,total,type});
    ratees.forEach(r=>{if(!prog.expressionsRatees.some(e=>e.expression===r.expression&&e.secteurId===r.secteurId)) prog.expressionsRatees.push(r);});
    saveProgression(prog);
    setSessionStats(s=>({...s,quizDone:s.quizDone+1}));
  }

  function handleNewQuizType(type) { setQuizType(type); loadModule(MODULES.find(m=>m.id==="quiz"),secteur,type); }
  function handleSecteur(s) { setSecteur(s); setActiveModule(null); setContent(null); setError(null); setScreen("app"); }

  const [premiumState, setPremiumState] = useState(isPremium());
  const sessionCount = sessionStats.quizDone + sessionStats.modulesDone;
  const modColor = (mod) => mod?.id === "quiz" ? D.rouge : D.noir;

  if(screen==="progression") return <ProgressionScreen onClose={()=>setScreen(secteur?"app":"home")} />;
  if(screen==="smalltalk") return <SmallTalkScreen onBack={()=>setScreen("home")} />;
  if(screen==="histoiregrammaire") return <HistoireGrammaireScreen onBack={()=>setScreen("home")} />;
  if(screen==="teacher") return <TeacherMode onClose={()=>setScreen("home")} />;
  if(screen==="lexique") return <LexiqueScreen onBack={()=>setScreen("home")} />;

  return (
    <div style={{ minHeight: "100vh", background: D.gris0, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: `${FS}em` }}>
      <div style={{ background: D.noir }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
          <div style={{ minWidth: 64 }}>
            {secteur && <button onClick={()=>{setSecteur(null);setActiveModule(null);setContent(null);setScreen("home");}} style={{ background: "none", border: "none", color: D.gris3, cursor: "pointer", fontSize: 14, padding: 0 }}>← Accueil</button>}
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <h1 style={{ margin: 0, lineHeight: 1, letterSpacing: -0.5 }}>
              <span style={{ color: D.rouge, fontSize: 21, fontWeight: 500 }}>Tu</span>
              <span style={{ color: D.blanc, fontSize: 21, fontWeight: 500 }}> comprends-</span>
              <span style={{ color: D.rouge, fontSize: 21, fontWeight: 500 }}>tu</span>
              <span style={{ color: D.blanc, fontSize: 21, fontWeight: 500 }}> ? </span>
              <span style={{ color: D.gris3, fontSize: 12, fontWeight: 400, verticalAlign: "super" }}>™</span>
              <span style={{ fontSize: 18 }}>🐿️</span>
            </h1>
            {secteur ? (
              <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 5, background: D.rouge, borderRadius: 4, padding: "2px 8px" }}>
                <span style={{ fontSize: 13 }}>{secteur.icon}</span>
                <span style={{ color: D.blanc, fontSize: 12, fontWeight: 500 }}>{secteur.label}</span>
              </div>
            ) : (
              <p style={{ margin: "3px 0 0", color: D.gris3, fontSize: 12, letterSpacing: 0.5 }}>Le québécois du quotidien · au travail</p>
            )}
          </div>
          <div style={{ minWidth: 64, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 3 }}>
              <button onClick={() => setFontSize(f => Math.max(0, f-1))}
                style={{ background: fontSize === 0 ? D.rouge : "none", border: `1px solid ${D.gris4}`, borderRadius: 4, color: fontSize === 0 ? D.blanc : D.gris3, cursor: "pointer", fontSize: 11, padding: "3px 6px", fontWeight: 700 }}>A-</button>
              <button onClick={() => setFontSize(f => Math.min(2, f+1))}
                style={{ background: fontSize === 2 ? D.rouge : "none", border: `1px solid ${D.gris4}`, borderRadius: 4, color: fontSize === 2 ? D.blanc : D.gris3, cursor: "pointer", fontSize: 15, padding: "3px 6px", fontWeight: 700 }}>A+</button>
            </div>
            <button onClick={()=>setScreen("progression")}
              style={{ background: "none", border: `1px solid ${D.gris4}`, borderRadius: 6, color: D.gris3, cursor: "pointer", fontSize: 13, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              ↗{sessionCount > 0 && <span style={{ background: D.rouge, color: D.blanc, borderRadius: 8, fontSize: 11, padding: "0 4px", fontWeight: 500, marginLeft: 2 }}>{sessionCount}</span>}
            </button>
          </div>
        </div>
      </div>

      {screen==="home" && (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 14px 60px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
            {[
              { screen: "smalltalk", icon: "☕", label: "Small talk", sub: "Pause café, lunch, ascenseur… ne sois jamais mal pris" },
              { screen: "histoiregrammaire", icon: "📜", label: "Histoire & Grammaire", sub: "Apprendre la grammaire par l'histoire du Québec" },
              { screen: "lexique", icon: "📖", label: "Lexique québécois", sub: Object.keys(loadLexique()).length > 0 ? `${Object.keys(loadLexique()).length} expressions · se remplit automatiquement` : "Se remplit au fil de tes sessions" },
            ].map(item => (
              <button key={item.screen} onClick={()=>setScreen(item.screen)}
                style={{ background: D.blanc, border: `1px solid ${D.gris2}`, borderRadius: 10, padding: "13px 14px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "border-color 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=D.noir}
                onMouseLeave={e=>e.currentTarget.style.borderColor=D.gris2}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: D.noir }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: D.gris3, marginTop: 2 }}>{item.sub}</div>
                </div>
                <span style={{ color: D.gris2, fontSize: 16 }}>→</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: D.gris2 }} />
            <span style={{ fontSize: 11, color: D.gris3, letterSpacing: 0.8, textTransform: "uppercase" }}>Ton milieu de travail</span>
            <div style={{ flex: 1, height: 1, background: D.gris2 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
            {SECTEURS.map(s => (
              <button key={s.id} onClick={()=>handleSecteur(s)}
                style={{ background: D.blanc, border: `1px solid ${D.gris2}`, borderRadius: 10, padding: "13px 12px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", position: "relative" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=D.noir; e.currentTarget.style.background=D.gris0; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=D.gris2; e.currentTarget.style.background=D.blanc; }}>
                {!premiumState && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 11 }}>🔒</span>}
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: D.noir, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: D.gris3, lineHeight: 1.4 }}>{s.desc}</div>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {s.exemples.slice(0,2).map((ex,i)=><span key={i} style={{ fontSize: 10, background: D.gris1, color: D.gris4, borderRadius: 4, padding: "2px 6px" }}>{ex}</span>)}
                </div>
              </button>
            ))}
          </div>

          <div style={{ background: D.noir, borderRadius: 10, padding: 18 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADIAMgDASIAAhEBAxEB/8QAHAAAAgMBAQEBAAAAAAAAAAAABQYEBwMCAQj/xAA9EAACAQMDAQYEBAUDBAMAAAABAgMABBEFEiExBhNBUWFxIoGRoRQyQrHBI1Ji0fAVouHxBxYzQ3KC/8QAGgEAAwEBAQEAAAAAAAAAAAAAAQIDBAUABv/EACYRAAICAgICAgIDAQAAAAAAAAABAhEhAxIxBBNBIlFhBRSR/9oADAMBAAIRAxEAPwDLooopXJiiijzW+k8VlR3AHJqWiisEGFFFFBQUUUUAFFFFABRRRQBpABJA0cSbFDHknuaHD3e5CgOeMjvTFrHbSXTpFMWYFQdp5reyuFS0kiMe4hsjPeqxjuCT4EttDc2yRhpVZT8O7mrCIRgWsSjHzPkGv2UQy3CRjJG4Ak0/XdpFJKo8MoBcDAxmnK3jzTpfohvLeNllUBSQTjvU+sBHGj0gL+AEbgOO9IrmMMhGeKZLyNVtiCMk0wXYiWBgO5FXSTdIwSVGAR+wRVJIJJAyMVbJKFLHBFVF0Ee7ANXRkIUnPaqvMB3pjfxovmAACqhgWAbPGakpMHFWRqiG7lJGAagCVCT/hXqcb8HvQrnaOcnFaTIy3JJJj8+eaR1V2AXaO54rzgk7Md6lMTHBx0r2HdjGRRJFKQxC7Rmo1UBJIGSe+KYpZj7MAds/SocD1FLMmSQYHFJdCkpJNMslxIjJtXpTZLhLVCrM2CMmgVBWJuuTUiLKDjGaE2yWORq6uEmjYdDxVoMUjbRn40yCJM7u/SrvII2AdagtUd0kGiRSNjYOwp+0ePeQOoFBtlBcEDrU6gqcqeaFbZbjkFN2HHSs2ikTJA7VIwz0+tCt4VXBT3psiCRORg0aWO8JkGO1JB7k84oe8GRk5BqC4cFMdjwKiULQSFYvJUnO7rQreAueVwTQ+0KlcHrT1bsJDkjmq5J7jlHyHbRbWtslvHc3E5UkM0aMQD25rZPbQfqNt2j3NvLFmRIYmyIj/CCO59e3apu2VreB2VSWDAKMY5GelRPR4Ir6J7a4jR4mB3RMm4HPUH6U1T5Yv12YNq+Gec3vQ5htoI7SENGXPqPXvnv2HzqLuoVjT8QKGP1pkl8W0u0h+Ij9NPGLSGZFcx4Kh3G7pkcDPyIz8qjuJSkSqvGT0HPFctPuYvxCQ2l0FkB8N8YIxjHP7+tPemTW9/p2VZ9gJAZOPzFadOqZSVbFDSLWKaOZpJW2lflJ4OKf9Mu4I42tpnSSFGPlYdwfce/FIOnWF1A95cW0OeHMG3c9SeOo/Q1PaZo094kUJlMcRctNcOeTk59h0HaqLb2yO0egJA8EjJjGDwMGrFkVkBKHI7kVJXlhFCpkhO11+XJ4P2qK8yqc5BFUL2CkZ6/wCxVpIl3E0bEA4zn3pkuo4pFGHPJq6J4lC9aVLlyeuKQ6oE9n6msKsN6vn5VSSOMitBNOzJuGTxVbWR5VIGQexrL7I0VC9p4QCdmMnn6UPjdYoyT1HWpo9QEZIJ4NIJ5fMk+g6UxTjFEbi3YTsQ2ABjFRV7NKACM5zyKthEW4E96dLT4uBj/KrVCk6VhVxLy2cY4qSaORkUZyKH3KGdT35qW2mjFqAuSakrr8EPLB4H/9k=" 
                  alt="Caroline Douret" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <p style={{ margin: "0 0 1px", fontWeight: 500, fontSize: 15, color: D.blanc }}>Caroline Douret</p>
                <p style={{ margin: 0, fontSize: 11, color: D.gris3, letterSpacing: 0.3 }}>Enseignante en immersion québécoise</p>
              </div>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: D.gris3, lineHeight: 1.7, fontStyle: "italic" }}>
              « Depuis des années, j'entends mes élèves me dire : <em>"Je comprends le français mais je ne comprends pas mes collègues québécois !"</em> Cette application est pour eux. »
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 11, color: D.gris3 }}>Cours particuliers · Groupes · En ligne</p>
              <a href="https://carolinedouret.com" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, background: D.rouge, color: D.blanc, borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 500, textDecoration: "none" }}>
                carolinedouret.com →
              </a>
            </div>
          </div>

          <div style={{ marginTop: 18, textAlign: "center" }}>
            <button onClick={() => setScreen("teacher")} style={{ background: "none", border: "none", color: D.gris2, cursor: "pointer", fontSize: 12, padding: "4px 8px" }}>🔑</button>
          </div>
        </div>
      )}

      {screen==="app" && secteur && (
        <>
          <div style={{ background: D.blanc, borderBottom: `1px solid ${D.gris2}`, overflowX: "auto" }}>
            <div style={{ display: "flex", padding: "0 14px", minWidth: "max-content" }}>
              {MODULES.map(mod => {
                const isActive = activeModule?.id === mod.id;
                const mc = modColor(mod);
                const count = history[`\${secteur.id}-\${mod.id}`]||0;
                return (
                  <button key={mod.id} onClick={()=>loadModule(mod)}
                    style={{ padding: "11px 12px 9px", background: "none", border: "none", borderBottom: isActive ? `2px solid \${mc}` : "2px solid transparent", cursor: "pointer", fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? mc : D.gris3, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, transition: "all 0.12s" }}>
                    <span style={{ fontSize: 14 }}>{mod.icon}</span><span>{mod.label}</span>
                    {count>0 && <span style={{ background: isActive?mc:D.gris2, color: isActive?D.blanc:D.gris4, borderRadius: 8, fontSize: 10, padding: "1px 5px" }}>{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ maxWidth: 680, margin: "0 auto", padding: "18px 14px 60px" }}>
            {!premiumState ? (
              <PremiumWall context="secteur" onUnlock={() => setPremiumState(true)} />
            ) : (
              <>
                {!activeModule && (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <h2 style={{ margin: "0 0 2px", fontSize: 17, fontWeight: 500, color: D.noir }}>{secteur.icon} {secteur.label}</h2>
                      <p style={{ margin: 0, fontSize: 12, color: D.gris3 }}>Contenus générés spécifiquement pour ce milieu</p>
                      <div style={{ height: 1, background: D.gris2, marginTop: 12 }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {MODULES.map(mod => {
                        const mc = modColor(mod);
                        return (
                          <button key={mod.id} onClick={()=>loadModule(mod)}
                            style={{ background: D.blanc, border: `1px solid ${D.gris2}`, borderRadius: 10, padding: 14, cursor: "pointer", textAlign: "left", transition: "all 0.12s" }}
                            onMouseEnter={e=>{ e.currentTarget.style.borderColor=mc; e.currentTarget.style.background=D.gris0; }}
                            onMouseLeave={e=>{ e.currentTarget.style.borderColor=D.gris2; e.currentTarget.style.background=D.blanc; }}>
                            <div style={{ fontSize: 20, marginBottom: 5 }}>{mod.icon}</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: D.noir, marginBottom: 2 }}>{mod.label}</div>
                            <div style={{ fontSize: 11, color: D.gris3 }}>{mod.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeModule && (
                  <div ref={resultRef}>
                    <div style={{ background: D.blanc, borderRadius: 10, padding: 16, border: `1px solid ${D.gris2}`, borderTop: `3px solid \${modColor(activeModule)}` }}>
                      {loading && <div style={{ textAlign: "center", padding: "20px 0" }}><LoadingDots color={D.noir}/><p style={{ color: D.gris3, fontSize: 13, marginTop: 8 }}>Génération en cours…</p></div>}
                      {error && !loading && <p style={{ fontSize: 14, color: D.rouge, textAlign: "center" }}>{error}</p>}
                      {!content && !loading && !error && (
                        <div style={{ textAlign: "center", padding: "28px 16px" }}>
                          <p style={{ fontSize: 28, marginBottom: 12 }}>🍁</p>
                          <p style={{ fontWeight: 500, fontSize: 15, color: D.noir, margin: "0 0 6px" }}>Contenu bientôt disponible</p>
                          <p style={{ fontSize: 13, color: D.gris3, lineHeight: 1.6, margin: 0 }}>Caroline prépare ce contenu pour toi. Reviens dans quelques instants !</p>
                        </div>
                      )}
                      {content && !loading && !error && <ResultCard moduleId={activeModule.id} data={content} color={modColor(activeModule)} secteur={secteur} onQuizRetry={()=>loadModule(activeModule)} onQuizNewType={handleNewQuizType} onQuizDone={handleQuizDone}/>}
                    </div>
                    <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {MODULES.filter(m=>m.id!==activeModule.id).map(m => (
                        <button key={m.id} onClick={()=>loadModule(m)}
                          style={{ background: D.blanc, border: `1px solid ${D.gris2}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: D.gris4 }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=D.noir}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=D.gris2}>
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
