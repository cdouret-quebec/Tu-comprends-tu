import { useState, useRef, useEffect } from "react";

// ── PALETTE — Affiche culturelle québécoise ────────────────────────────────────
const C = {
  rouge:    "#D42B2B",  // rouge Saint-Jean
  bleu:     "#1A1F5E",  // bleu nuit métro
  jaune:    "#F5C800",  // jaune solaire Expo 67
  creme:    "#F7F3EC",  // crème affiche
  noir:     "#111111",  // noir typographique
  blanc:    "#FFFFFF",
  vertForet:"#1B4332",  // vert forêt (conservé pour cohérence)
};

const ST_COLOR = "#6B21A8";
const ST_BG    = "#F3E8FF";

// ── SECTEURS ──────────────────────────────────────────────────────────────────
const SECTEURS = [
  { id: "construction", label: "Construction & Génie", icon: "🏗️", color: "#B45309", bg: "#FEF3C7", desc: "Chantiers, sous-traitants, plans, sécurité", exemples: ["checker les cossins", "le boute", "la shed", "un truck", "foreman"], contexte: "chantier de construction québécois, réunion de chantier, interaction avec contremaître et ouvriers" },
  { id: "finance", label: "Finance & Banque", icon: "💰", color: "#1A1F5E", bg: "#E0E7FF", desc: "REER, placements, conseils aux clients", exemples: ["mon cash", "les cennes", "le bas de laine", "magasiner un prêt", "l'impôt"], contexte: "succursale bancaire ou cabinet de conseil financier québécois, rencontre avec client" },
  { id: "sante", label: "Santé & Services sociaux", icon: "🏥", color: "#065F46", bg: "#D1FAE5", desc: "Hôpitaux, CLSC, relations avec patients", exemples: ["la carte-soleil", "la RAMQ", "les médicaments remboursés", "le médecin de famille"], contexte: "hôpital ou CLSC québécois, interaction avec patients et collègues soignants" },
  { id: "education", label: "Éducation & CPE", icon: "🎓", color: "#6B21A8", bg: "#EDE9FE", desc: "Écoles, CPE, relations avec parents", exemples: ["le bulletin", "les récupérations", "le service de garde", "la direction"], contexte: "école primaire ou secondaire québécoise, salle des profs, rencontre de parents" },
  { id: "commerce", label: "Commerce & Vente", icon: "🛒", color: "#D42B2B", bg: "#FEE2E2", desc: "Épiceries, commerces, service à la clientèle", exemples: ["la caisse", "le dépanneur", "checker le prix", "la commande"], contexte: "commerce de détail québécois, interaction avec clients et collègues" },
  { id: "ti", label: "Technologies (TI)", icon: "💻", color: "#0F766E", bg: "#CCFBF1", desc: "Développement, réunions agiles, startups", exemples: ["pitcher une idée", "le backlog", "ça fait du sens", "on se revire de bord"], contexte: "startup ou département TI québécois, standup, réunion d'équipe agile" }
];

// ── MODULES SECTEUR ───────────────────────────────────────────────────────────
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
        traduction: `4 questions QCM: une expression québécoise du secteur "${s.label}" → 4 choix de sens. "croche" et NON "croché".`,
        situation: `4 questions QCM de mise en situation dans le secteur "${s.label}". Scène réelle → réaction québécoise appropriée ? 4 choix.`,
        registre: `4 questions QCM sur les registres dans le secteur "${s.label}". Phrase → quel contexte ? ou contexte → quelle formulation ?`
      };
      return `Tu es expert du québécois professionnel dans le secteur "${s.label}" (${s.contexte}). ${types[type]||types.traduction} Exemples: ${s.exemples.join(", ")}.
JSON: {"titre":string,"type":string,"questions":[{"question":string,"contexte":string,"choix":[{"lettre":"A"|"B"|"C"|"D","texte":string}],"bonne_reponse":"A"|"B"|"C"|"D","explication":string,"astuce":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`;
    }
  }
];

// ── SMALL TALK SOUS-MODULES ───────────────────────────────────────────────────
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

// ── HISTOIRE & GRAMMAIRE ──────────────────────────────────────────────────────
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

// ── STORAGE ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "qc_pro_progression";
const CACHE_KEY = "qc_pro_cache";
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

// ── LEXIQUE STORAGE ───────────────────────────────────────────────────────────
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

// Cache des contenus générés
function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null") || {}; }
  catch { return {}; }
}
function saveCache(c) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} }
function getCacheKey(type, id, subId = "") { return `${type}__${id}__${subId}`; }
function getCached(type, id, subId = "") {
  const cache = loadCache();
  return cache[getCacheKey(type, id, subId)] || null;
}
function setCached(type, id, data, subId = "") {
  const cache = loadCache();
  const key = getCacheKey(type, id, subId);
  cache[key] = { data, status: "pending", createdAt: new Date().toISOString() };
  saveCache(cache);
}
function validateCached(type, id, subId = "") {
  const cache = loadCache();
  const key = getCacheKey(type, id, subId);
  if (cache[key]) { cache[key].status = "validated"; saveCache(cache); }
}
function rejectCached(type, id, subId = "") {
  const cache = loadCache();
  const key = getCacheKey(type, id, subId);
  delete cache[key];
  saveCache(cache);
}
function updateCached(type, id, data, subId = "") {
  const cache = loadCache();
  const key = getCacheKey(type, id, subId);
  if (cache[key]) { cache[key].data = data; cache[key].status = "validated"; saveCache(cache); }
}

// ── API ───────────────────────────────────────────────────────────────────────
async function callClaude(messages, system, json = true, retries = 3) {
  const allMessages = system
    ? [{ role: "user", content: `[INSTRUCTIONS]\n${system}\n[/INSTRUCTIONS]\n\n${messages[0].content}` }, ...messages.slice(1)]
    : messages;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          messages: allMessages
        })
      });

      // Erreurs transitoires → on réessaie
      if (res.status === 529 || res.status === 503 || res.status === 502) {
        if (attempt < retries) {
          const wait = attempt * 3000; // 3s, 6s, 9s
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

      // Safari peut échouer sur res.json() si content-type inattendu — on lit le texte d'abord
      const responseText = await res.text();
      let data;
      try { data = JSON.parse(responseText); }
      catch { throw new Error(`Réponse serveur invalide : ${responseText.substring(0, 100)}`); }

      const raw = data.content?.find(b => b.type === "text")?.text || "";
      if (!json) return raw;

      // Nettoyage robuste : markdown fences, BOM, guillemets typographiques, espaces insécables
      const cleaned = raw
        .replace(/^\uFEFF/, "")                    // BOM
        .replace(/```json\s*/gi, "")               // ```json
        .replace(/```\s*/g, "")                    // ```
        .replace(/[\u2018\u2019]/g, "'")           // guillemets simples typographiques
        .replace(/[\u201C\u201D]/g, '"')           // guillemets doubles typographiques
        .replace(/\u00A0/g, " ")                   // espace insécable
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        // Tentative 2 : extraire le premier objet JSON valide
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try { return JSON.parse(match[0]); } catch {}
        }
        // Tentative 3 : afficher les 200 premiers caractères pour diagnostic
        throw new Error(`Format inattendu : ${cleaned.substring(0, 200)}`);
      }
    } catch (e) {
      // Erreur réseau → on réessaie
      if (attempt < retries && (e.message.includes("fetch") || e.message.includes("network"))) {
        await new Promise(r => setTimeout(r, attempt * 2000));
        continue;
      }
      throw e;
    }
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function LoadingDots({ color = "#555" }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 0" }}>
      {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: color, animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ── TOOLTIP & TEXTE ANNOTÉ ────────────────────────────────────────────────────
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
          fontSize: 12, lineHeight: 1.5,
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

  // Trier par longueur décroissante pour matcher les expressions d'abord
  const sorted = [...annotations].sort((a, b) => b.terme.length - a.terme.length);

  // Découper le texte en segments annotés/non-annotés
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

// ── SMALL TALK SCREENS ────────────────────────────────────────────────────────
function SimulationQCM({ data }) {
  const [etape, setEtape] = useState(0);
  const [choix, setChoix] = useState({});
  const [termine, setTermine] = useState(false);
  const ann = data.annotations || [];

  if (!data?.scenarios?.length) return <p style={{ color: "#888", fontSize: 13 }}>Contenu en cours de préparation.</p>;

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
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#92400E" }}>Martin : « {s.ce_que_dit_martin} »</p>
                <p style={{ margin: "0 0 3px", fontSize: 12, color: "#065F46" }}>✅ {s.choix.find(c => c.lettre === s.bonne_reponse)?.texte}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#78350F" }}>{s.explication}</p>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => { setEtape(0); setChoix({}); setTermine(false); }}
          style={{ background: ST_COLOR, color: "white", border: "none", borderRadius: 20, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
        <span style={{ fontSize: 11, color: "#888", background: "#F3F4F6", borderRadius: 10, padding: "2px 10px" }}>{etape + 1}/{total}</span>
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
          {tour.contexte && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#888", fontStyle: "italic" }}>📍 {tour.contexte}</p>}
        </div>
      </div>

      {/* Choix de réponse */}
      <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>Comment tu réponds ?</p>
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
              style={{ background: bg, border, borderRadius: 8, padding: "10px 12px", cursor: repondu ? "default" : "pointer", textAlign: "left", fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", transition: "all 0.15s", color, width: "100%" }}>
              <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: isChosen && !repondu ? ST_COLOR : repondu && isCorrect ? "#065F46" : repondu && isChosen ? "#DC2626" : "#E5E7EB", color: (isChosen || (repondu && isCorrect)) ? "white" : "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{c.lettre}</span>
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
          <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 600, color: choix[etape] === bonneReponse ? "#065F46" : "#92400E" }}>
            {choix[etape] === bonneReponse ? "✅ Parfait !" : `✅ Réponse idéale : ${bonneReponse}`}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#555", lineHeight: 1.5 }}>{tour.explication}</p>
        </div>
      )}

      {repondu && (
        <button onClick={suivant}
          style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: ST_COLOR, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>{data.intro}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.references.map((r, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
              style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>{r.sujet}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{r.sous_titre}</div>
                </div>
              </div>
              <span style={{ color: ST_COLOR, fontSize: 16 }}>{open[i] ? "▲" : "▼"}</span>
            </button>
            {open[i] && (
              <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${ST_COLOR}10` }}>
                <p style={{ fontSize: 13, color: "#374151", margin: "10px 0 8px", lineHeight: 1.6 }}>{r.ce_quil_faut_savoir}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {r.phrases_utiles.map((p, j) => (
                    <div key={j} style={{ background: ST_BG, borderRadius: 8, padding: "7px 10px", fontSize: 13, color: ST_COLOR, fontStyle: "italic" }}>« {p} »</div>
                  ))}
                </div>
                {r.piege && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#c0392b", background: "#fdecea", borderRadius: 6, padding: "4px 8px" }}>⚠️ {r.piege}</p>}
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
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>{data.intro}</p>
      {["entrees", "sorties"].map(type => (
        <div key={type} style={{ marginBottom: 20 }}>
          <h4 style={{ color: ST_COLOR, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            {type === "entrees" ? "🚪 Pour entrer dans une conversation" : "👋 Pour sortir naturellement"}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data[type].map((e, i) => (
              <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 10, padding: 14 }}>
                <div style={{ background: ST_BG, borderRadius: 8, padding: "7px 12px", marginBottom: 8, fontSize: 14, color: ST_COLOR, fontWeight: 600, fontStyle: "italic" }}>
                  « {e.formule} »
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#555" }}>📍 {e.quand}</p>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#333" }}>🎯 {e.effet}</p>
                {e.variante && <p style={{ margin: 0, fontSize: 12, color: "#888", fontStyle: "italic" }}>Variante : « {e.variante} »</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {data.conseil_cle && (
        <div style={{ background: "#FFFBE6", border: "1px solid #FCD34D", borderRadius: 10, padding: 12 }}>
          <p style={{ margin: 0, fontSize: 13 }}>💡 <strong>À retenir :</strong> {data.conseil_cle}</p>
        </div>
      )}
    </div>
  );
}

function STRythmeCard({ data }) {
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>{data.intro}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.situations.map((s, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: ST_BG, padding: "10px 14px", borderBottom: `1px solid ${ST_COLOR}15` }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1F2937" }}>
                <span style={{ color: ST_COLOR }}>Martin dit : </span>« {s.ce_que_dit_martin} »
              </p>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {s.reactions.map((r, j) => (
                  <div key={j} style={{
                    padding: "8px 12px", borderRadius: 8, fontSize: 13,
                    background: r.type === "ideal" ? "#ECFDF5" : r.type === "correct" ? "#F0F9FF" : "#FEF2F2",
                    border: `1px solid ${r.type === "ideal" ? "#A7F3D0" : r.type === "correct" ? "#BAE6FD" : "#FECACA"}`,
                    color: r.type === "ideal" ? "#065F46" : r.type === "correct" ? "#0369A1" : "#991B1B"
                  }}>
                    <span style={{ fontWeight: 700, marginRight: 6 }}>{r.type === "ideal" ? "✅ Idéal" : r.type === "correct" ? "🆗 Correct" : "❌ À éviter"} :</span>
                    <em>« {r.reponse} »</em>
                    {r.pourquoi && <span style={{ display: "block", fontSize: 11, marginTop: 3, opacity: 0.85 }}>{r.pourquoi}</span>}
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>💡 {s.lecon}</p>
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
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>{data.intro}</p>
      {ann.length > 0 && <p style={{ fontSize: 11, color: "#999", marginBottom: 12, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.scenarios.map((s, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
              style={{ width: "100%", padding: "13px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1F2937", marginBottom: 2 }}>{s.situation}</div>
                {s.valeur_en_jeu && (
                  <span style={{ fontSize: 10, background: ST_BG, color: ST_COLOR, borderRadius: 10, padding: "1px 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {s.valeur_en_jeu}
                  </span>
                )}
              </div>
              <span style={{ color: ST_COLOR, fontSize: 14, flexShrink: 0 }}>{open[i] ? "▲" : "▼"}</span>
            </button>
            {open[i] && (
              <div style={{ borderTop: `1px solid ${ST_COLOR}10` }}>
                <div style={{ padding: "12px 14px", background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
                  <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: 0.4 }}>Ce que fait l'immigrant</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                    <AnnotatedText text={s.ce_que_fait_immigrant} annotations={ann} />
                  </p>
                </div>
                <div style={{ padding: "12px 14px", background: "#FFF7ED", borderBottom: "1px solid #FED7AA" }}>
                  <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: 0.4 }}>Ce que pensent les Québécois (sans le dire)</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5, fontStyle: "italic" }}>
                    <AnnotatedText text={s.ce_que_pensent_les_quebecois} annotations={ann} />
                  </p>
                </div>
                <div style={{ padding: "12px 14px", background: "#F0FDF4", borderBottom: "1px solid #BBF7D0" }}>
                  <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#065F46", textTransform: "uppercase", letterSpacing: 0.4 }}>Ce qui se passe vraiment</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                    <AnnotatedText text={s.ce_qui_se_passe_vraiment} annotations={ann} />
                  </p>
                </div>
                <div style={{ padding: "12px 14px", background: ST_BG }}>
                  <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: ST_COLOR, textTransform: "uppercase", letterSpacing: 0.4 }}>Comment s'en sortir</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                    <AnnotatedText text={s.comment_sen_sortir} annotations={ann} />
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function STExpressionsCard({ data: rawData }) {
  const [revealed, setRevealed] = useState({});
  const ann = rawData.annotations || [];
  // Éviter collision de nom avec STEntreeSortieCard
  const data = rawData;
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>{data.intro}</p>
      {ann.length > 0 && <p style={{ fontSize: 11, color: "#999", marginBottom: 12, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.expressions.map((e, i) => (
          <div key={i} style={{ background: "white", border: `1px solid ${ST_COLOR}20`, borderRadius: 12, overflow: "hidden" }}>
            {/* Expression */}
            <div style={{ background: ST_BG, padding: "12px 14px", borderBottom: `1px solid ${ST_COLOR}15` }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: ST_COLOR }}>« <AnnotatedText text={e.expression} annotations={ann} /> »</p>
            </div>
            {/* Scénario */}
            <div style={{ padding: "12px 14px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                <strong>📍 Scénario :</strong> <AnnotatedText text={e.scenario} annotations={ann} />
              </p>
              {/* Interprétation erronée — révélable */}
              {!revealed[`err_${i}`] ? (
                <button onClick={() => setRevealed(r => ({ ...r, [`err_${i}`]: true }))}
                  style={{ fontSize: 12, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "5px 12px", cursor: "pointer", marginBottom: 8, display: "block" }}>
                  🤔 Qu'est-ce que tu penserais que ça veut dire ?
                </button>
              ) : (
                <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#DC2626" }}>
                    <strong>Interprétation erronée :</strong> {e.interpretation_erronee}
                  </p>
                </div>
              )}
              {/* Vrai sens */}
              {!revealed[`vrai_${i}`] ? (
                <button onClick={() => setRevealed(r => ({ ...r, [`vrai_${i}`]: true }))}
                  style={{ fontSize: 12, color: "#065F46", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: "5px 12px", cursor: "pointer", marginBottom: 8, display: "block" }}>
                  ✅ Voir le vrai sens
                </button>
              ) : (
                <div style={{ background: "#ECFDF5", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#065F46", fontWeight: 600 }}>
                    ✅ <AnnotatedText text={e.vrai_sens} annotations={ann} />
                  </p>
                </div>
              )}
              {/* Réutilisation */}
              {revealed[`vrai_${i}`] && e.exemple_reutilisation && (
                <div style={{ background: ST_BG, borderRadius: 8, padding: "8px 12px" }}>
                  <p style={{ margin: 0, fontSize: 12, color: ST_COLOR }}>
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

function STSacresCard({ data }) {
  const [open, setOpen] = useState({ 0: true });
  const ann = data.annotations || [];
  return (
    <div>
      <h3 style={{ color: ST_COLOR, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 14, lineHeight: 1.6 }}>{data.intro}</p>
      {ann.length > 0 && <p style={{ fontSize: 11, color: "#999", marginBottom: 12, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
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
                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "10px 0 12px" }}>
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
                            <span style={{ fontSize: 11, background: "white", color: "#555", borderRadius: 10, padding: "1px 8px", border: `1px solid ${ST_COLOR}30` }}>
                              atténué : <em>{ex.forme_attenuation}</em>
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6B7280" }}>
                          😤 {ex.emotion} → <em style={{ color: "#374151" }}>« <AnnotatedText text={ex.exemple_phrase} annotations={ann} /> »</em>
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Ce que ça exprime vraiment : {ex.traduction_emotion}</p>
                      </div>
                    ))}
                  </div>
                )}
                {s.conseil && (
                  <div style={{ background: "#FFFBE6", border: "1px solid #FCD34D", borderRadius: 8, padding: "8px 12px" }}>
                    <p style={{ margin: 0, fontSize: 12 }}>💡 {s.conseil}</p>
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
      <p style={{ fontSize: 13, color: "#666", marginBottom: 14, lineHeight: 1.6 }}>{data.intro}</p>
      {ann.length > 0 && <p style={{ fontSize: 11, color: "#999", marginBottom: 12, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur sens québécois</p>}
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
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                <strong>📍 Scénario :</strong> <AnnotatedText text={fa.scenario} annotations={ann} />
              </p>
              {/* Sens Québec */}
              {!revealed[`qc_${i}`] ? (
                <button onClick={() => setRevealed(r => ({ ...r, [`qc_${i}`]: true }))}
                  style={{ fontSize: 12, color: "#065F46", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: "5px 12px", cursor: "pointer", marginBottom: 8, display: "block" }}>
                  🇨🇦 Ce que ça veut dire au Québec ?
                </button>
              ) : (
                <div style={{ background: "#ECFDF5", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#065F46", fontWeight: 600 }}>
                    🇨🇦 Au Québec : {fa.sens_quebec}
                  </p>
                </div>
              )}
              {/* Sens France / malentendu */}
              {!revealed[`fr_${i}`] ? (
                <button onClick={() => setRevealed(r => ({ ...r, [`fr_${i}`]: true }))}
                  style={{ fontSize: 12, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "5px 12px", cursor: "pointer", marginBottom: 8, display: "block" }}>
                  🇫🇷 Et en France / le malentendu ?
                </button>
              ) : (
                <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#DC2626" }}>
                    🇫🇷 {fa.sens_france_ou_malentendu}
                  </p>
                </div>
              )}
              {/* Astuce mémo — visible après révélation */}
              {revealed[`qc_${i}`] && revealed[`fr_${i}`] && fa.astuce && (
                <div style={{ background: "#FFFBE6", border: "1px solid #FCD34D", borderRadius: 8, padding: "7px 12px" }}>
                  <p style={{ margin: 0, fontSize: 12 }}>💡 <strong>Astuce :</strong> {fa.astuce}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmallTalkScreen({ onBack, onUpdateProgression }) {
  const [activeSTModule, setActiveSTModule] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const contentRef = useRef(null);

  const PROMPTS = {
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
    simulation: `Tu es expert du small talk québécois à la pause café. Génère une simulation de conversation entre Martin (collègue québécois) et un immigrant francophone. 8 tours de conversation. Martin dit quelque chose en québécois authentique, l'élève choisit parmi 3 réponses (A, B, C). Une seule est idéale, une est correcte mais imparfaite, une est à éviter (trop formelle, maladroite ou hors sujet). Les répliques de Martin doivent utiliser le québécois vivant : t'as, j'sais, c'est-tu, là là, faque, t'sais veux-tu dire, pantoute, etc.
Inclus "annotations": 6-8 expressions québécoises du texte avec définition courte.
JSON: {"titre":string,"intro":string,"scenarios":[{"ce_que_dit_martin":string,"contexte":string,"choix":[{"lettre":"A"|"B"|"C","texte":string}],"bonne_reponse":"A"|"B"|"C","explication":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
    lunch: `Tu es expert de la culture québécoise au bureau. Génère un guide complet sur le lunch (dîner) au bureau québécois — un univers social à part entière pour un immigrant. Couvre : la boîte à lunch et ce qu'on y met typiquement, les commandes collectives (sushis, pho, sandwichs), les conversations de table, les expressions autour de la nourriture, et les codes sociaux (on s'invite, on partage, on commente ce que l'autre mange...). Inclus aussi un lexique des mots québécois liés au lunch (dîner vs lunch, le boss paie la traite, commander en masse, le popote roulante, etc.). 4 sections distinctes.
Inclus "annotations": 8-12 termes québécois du guide avec leur définition courte.
JSON: {"titre":string,"intro":string,"sections":[{"emoji":string,"titre":string,"contenu":string,"expressions":[{"expression":string,"explication":string}],"conseil":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
    sacres: `Tu es expert de la langue et de la culture québécoise. Génère un guide complet sur les sacres québécois utilisés comme intensificateurs émotionnels dans la vie quotidienne et au travail. IMPORTANT : traite les sacres comme un phénomène linguistique et culturel fascinant, pas comme des grossièretés choquantes. Couvre : 1) Les principaux sacres et leur origine religieuse (ostie/estie, câlice/câline, tabarnak/tabarnouche, crisse/crime, viarge, baptême) avec leurs formes atténuées utilisées en contexte mixte ; 2) La gamme d'émotions qu'ils expriment selon le ton (admiration, frustration, surprise, emphase positive) avec exemples concrets ; 3) Les règles sociales implicites (avec qui, dans quel contexte, quand s'abstenir) ; 4) Des scénarios de chantier, bureau et pause café pour illustrer l'usage naturel.
Inclus "annotations": les formes atténuées et expressions clés avec leur définition.
JSON: {"titre":string,"intro":string,"sections":[{"emoji":string,"titre":string,"contenu":string,"exemples":[{"sacre":string,"forme_attenuation":string,"emotion":string,"exemple_phrase":string,"traduction_emotion":string}],"conseil":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
    faux_amis: `Tu es expert de la langue québécoise et des différences avec le français de France, mais aussi des erreurs fréquentes des francophones venant d'autres langues (espagnol, anglais, arabe...). Génère 12 faux amis et pièges linguistiques — des mots ou constructions qui créent des malentendus hilarants ou embarrassants. Inclus OBLIGATOIREMENT :
1. S'ennuyer de quelqu'un (calque de "I miss you" au QC = tu me manques, alors qu'en France "je m'ennuie" = trouver le temps long)
2. "J'ai envie de toi" (erreur des hispanophones : calque de "tener envidia" = envier quelqu'un, mais en français = désir amoureux/sexuel — catastrophique en contexte de classe ou de bureau !)
3. Gosser (agacer au QC / les gosses = enfants en France)
4. Char (voiture au QC / tank en France)
5. Dépanneur (épicerie de quartier au QC / technicien en France)
6. Pogner (attraper/être populaire au QC / connotation vulgaire en France)
7. Magasiner (faire du shopping au QC / inconnu en France)
8. Brunante (tombée de la nuit au QC)
9. Clavarder (chatter au QC)
10. Niaiseux (idiot au QC)
11. Être game (être partant au QC)
12. Blé d'Inde (maïs au QC)
Pour chaque entrée : un mini-scénario réel où la confusion se produit, le sens correct, le malentendu créé, et une astuce pour retenir la différence.
Inclus "annotations": les 12 termes avec leur sens correct en définition courte.
JSON: {"titre":string,"intro":string,"faux_amis":[{"mot":string,"scenario":string,"sens_quebec":string,"sens_france_ou_malentendu":string,"astuce":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
    valeurs: `Tu es expert de la culture québécoise et des codes sociaux implicites au travail. Génère 10 scénarios de faux pas culturels autour des VALEURS NON DITES du Québec. Couvre OBLIGATOIREMENT ces thèmes :
1. La modestie obligatoire (ne pas se vanter, ne pas "flasher")
2. L'égalitarisme (tout le monde se tutoie, le boss mange à la même table, appeler son patron par son prénom)
3. Le rapport particulier à l'argent ("né pour un petit pain", gêne de parler de salaire mais curiosité quand même)
4. L'humour autodérisoire comme code de bienvenue et de confiance
5. Le débat souverainiste/fédéraliste — comment esquiver poliment sans prendre position (règle d'or : écouter, jamais initier)
6. La laïcité et la religion — sujet sensible post-Révolution tranquille, la religion est une affaire privée au bureau
7. RESTER TARD AU BUREAU : contrairement à la France ou d'autres cultures, partir à l'heure n'est PAS un manque d'engagement — rester tard signifie au contraire qu'on est mal organisé ou qu'on a une vie personnelle sacrifiée. Le présentéisme est mal vu au Québec.
8. Les réunions québécoises : le consensus mou, personne ne dit non directement, "c'est le fun" peut vouloir dire qu'on n'est pas du tout convaincu — décoder le oui poli
9. Les évaluations de performance : la critique est très indirecte au Québec, "c'est correct" peut signifier que c'est loin d'être correct — apprendre à lire entre les lignes
10. Se démarquer vs appartenir au groupe : l'initiative individuelle trop visible peut être mal perçue, la solidarité collective prime sur le vedettariat personnel
Pour chaque scénario : ce que fait l'immigrant (sans mauvaise intention), ce que ça produit chez les collègues québécois (sans qu'ils le disent), ce qui se passe vraiment, et comment s'en sortir.
Inclus "annotations": 10-12 expressions québécoises clés avec définition courte.
JSON: {"titre":string,"intro":string,"scenarios":[{"situation":string,"ce_que_fait_immigrant":string,"ce_que_pensent_les_quebecois":string,"ce_qui_se_passe_vraiment":string,"comment_sen_sortir":string,"valeur_en_jeu":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`,
    expressions: `Tu es expert de la langue imagée québécoise. Génère 8 expressions imagées québécoises courantes dans les conversations de bureau et de pause café — des expressions métaphoriques ou idiomatiques qu'un francophone de France ou d'ailleurs ne comprend pas au sens littéral.
Pour chaque expression : un scénario réel où quelqu'un entend cette expression sans la comprendre, ce qu'il pense que ça veut dire (l'interprétation littérale ou erronée), ce que ça veut dire vraiment, et un exemple de comment la réutiliser soi-même.
Inclus des classiques comme : attacher sa tuque, péter de la broue, avoir le dos large, virer su'l'top, être dans le boutte, avoir du front tout le tour de la tête, se sucrer le bec, lâcher son fou, etc.
Inclus "annotations": les 8 expressions elles-mêmes avec leur définition courte.
JSON: {"titre":string,"intro":string,"expressions":[{"expression":string,"scenario":string,"interpretation_erronee":string,"vrai_sens":string,"exemple_reutilisation":string}],"annotations":[{"terme":string,"definition":string}]}
UNIQUEMENT JSON, sans markdown.`
  };

  async function loadSTModule(mod, forceRegen = false) {
    setActiveSTModule(mod);
    setContent(null);
    setError(null);
    setLoading(true);
    setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    try {
      // Vérifier le cache d'abord
      if (!forceRegen) {
        const cached = getCached("st", "smalltalk", mod.id);
        if (cached && cached.status === "validated") {
          setContent(cached.data);
          setLoading(false);
          return;
        }
        // Contenu existe mais pas encore validé → on l'affiche quand même
        // pour que l'enseignante puisse le voir en mode Enseignante
        if (cached && cached.status === "pending") {
          setContent(cached.data);
          setLoading(false);
          return;
        }
      }
      const parsed = await callClaude([{ role: "user", content: PROMPTS[mod.id] }],
        "Tu es expert de la langue et culture québécoise. Tu réponds TOUJOURS en JSON valide uniquement, sans markdown, sans backticks.");
      setCached("st", "smalltalk", parsed, mod.id);
      // Pour les expressions imagées : alimenter le lexique avec les expressions elles-mêmes
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

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#2D1B5E", padding: "18px 16px", position: "relative", textAlign: "center" }}>
        <button onClick={onBack} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12 }}>← Accueil</button>
        <h1 style={{ margin: 0, color: "white", fontSize: 20, fontWeight: 800 }}>☕ Small talk québécois</h1>
        <p style={{ margin: "5px 0 0", color: "#C4B5FD", fontSize: 12 }}>Pause café, lunch, ascenseur, couloir… ne sois jamais mal pris !</p>
      </div>

      {/* Onglets */}
      <div style={{ background: "white", borderBottom: "1px solid #E0E0E0", overflowX: "auto" }}>
        <div style={{ display: "flex", padding: "0 12px", minWidth: "max-content" }}>
          {ST_MODULES.map(mod => {
            const isActive = activeSTModule?.id === mod.id;
            return (
              <button key={mod.id} onClick={() => loadSTModule(mod)}
                style={{ padding: "12px 13px 10px", background: "none", border: "none", borderBottom: isActive ? `3px solid ${ST_COLOR}` : "3px solid transparent", cursor: "pointer", fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? ST_COLOR : "#666", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
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
              <p style={{ margin: 0, fontSize: 13, color: "#666", lineHeight: 1.7 }}>
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
                  <div style={{ fontWeight: 700, fontSize: 13, color: ST_COLOR, marginBottom: 3 }}>{mod.label}</div>
                  <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>{mod.desc}</div>
                  {mod.id === "simulation" && <div style={{ marginTop: 8, fontSize: 10, background: ST_BG, color: ST_COLOR, borderRadius: 10, padding: "2px 8px", display: "inline-block", fontWeight: 600 }}>8 TOURS · QCM</div>}
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
                  <div style={{ fontWeight: 700, color: ST_COLOR, fontSize: 13 }}>{activeSTModule.label}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{activeSTModule.desc}</div>
                </div>
              </div>
              {/* 🔄 Bouton réservé au mode Enseignante */}
            </div>

            <div style={{ background: "white", borderRadius: 16, padding: 16, border: `1px solid ${ST_COLOR}15`, boxShadow: `0 2px 12px ${ST_COLOR}08` }}>
              {activeSTModule.id === "simulation" && content && !loading && !error && (() => {
                const cached = getCached("st", "smalltalk", "simulation");
                if (!cached || cached.status !== "validated") return (
                  <div style={{ textAlign: "center", padding: "28px 16px" }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>☕</div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: ST_COLOR, margin: "0 0 8px" }}>Contenu bientôt disponible</p>
                    <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>Caroline prépare cette simulation pour toi.</p>
                  </div>
                );
                return <SimulationQCM data={content} />;
              })()}
              {loading && <div style={{ textAlign: "center", padding: "18px 0" }}><LoadingDots color={ST_COLOR} /><p style={{ color: "#888", fontSize: 12, marginTop: 6 }}>Génération en cours… (jusqu'à 3 tentatives si le serveur est occupé)</p></div>}
              {error && !loading && (
                <div style={{ textAlign: "center", padding: 18 }}>
                  <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 10 }}>{error}</p>
                </div>
              )}
              {/* Écran d'attente si non validé */}
              {!loading && !error && activeSTModule.id !== "simulation" && (() => {
                const cached = getCached("st", "smalltalk", activeSTModule.id);
                if (!cached || cached.status !== "validated") {
                  return (
                    <div style={{ textAlign: "center", padding: "28px 16px" }}>
                      <div style={{ fontSize: 48, marginBottom: 14 }}>☕</div>
                      <p style={{ fontWeight: 900, fontSize: 15, color: ST_COLOR, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Contenu bientôt disponible</p>
                      <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>Caroline prépare ce contenu pour toi.<br/>Reviens dans quelques instants !</p>
                    </div>
                  );
                }
                return null;
              })()}
              {content && !loading && !error && activeSTModule.id !== "simulation" && (() => {
                const cached = getCached("st", "smalltalk", activeSTModule.id);
                if (!cached || cached.status !== "validated") return null;
                return (
                  <>
                    {activeSTModule.id === "references" && <STReferencesCard data={content} />}
                    {activeSTModule.id === "entree_sortie" && <STEntreeSortieCard data={content} />}
                    {activeSTModule.id === "rythme" && <STRythmeCard data={content} />}
                    {activeSTModule.id === "lunch" && <STLunchCard data={content} />}
                    {activeSTModule.id === "valeurs" && <STValeursCard data={content} />}
                    {activeSTModule.id === "sacres" && <STSacresCard data={content} />}
                    {activeSTModule.id === "faux_amis" && <STFauxAmisCard data={content} />}
                  </>
                );
              })()}
            </div>

            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, color: "#999", marginBottom: 7 }}>Explorer aussi :</p>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {ST_MODULES.filter(m => m.id !== activeSTModule.id).map(m => (
                  <button key={m.id} onClick={() => loadSTModule(m)}
                    style={{ background: "white", border: `1px solid ${ST_COLOR}30`, borderRadius: 20, padding: "5px 11px", cursor: "pointer", fontSize: 12, color: ST_COLOR, fontWeight: 500 }}>
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
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>{data.intro}</p>
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
                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "10px 0 12px" }}>{s.contenu}</p>
                {s.expressions?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
                    {s.expressions.map((ex, j) => (
                      <div key={j} style={{ background: ST_BG, borderRadius: 8, padding: "8px 12px" }}>
                        <span style={{ fontWeight: 700, color: ST_COLOR, fontSize: 13 }}>« {ex.expression} »</span>
                        <span style={{ fontSize: 12, color: "#555", marginLeft: 8 }}>— {ex.explication}</span>
                      </div>
                    ))}
                  </div>
                )}
                {s.conseil && (
                  <div style={{ background: "#FFFBE6", border: "1px solid #FCD34D", borderRadius: 8, padding: "7px 10px" }}>
                    <p style={{ margin: 0, fontSize: 12 }}>💡 {s.conseil}</p>
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

// ── HISTOIRE & GRAMMAIRE ──────────────────────────────────────────────────────
function LectureGrammaireCard({ data, color }) {
  const [showNotion, setShowNotion] = useState(true);
  return (
    <div>
      <h3 style={{ color, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ color: "#888", fontSize: 12, marginBottom: 14 }}>📅 {data.periode_precise}</p>

      {/* Encadré notion */}
      <div style={{ background: HG_BG, border: `1px solid ${color}30`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <button onClick={() => setShowNotion(s => !s)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <span style={{ fontWeight: 700, color, fontSize: 13 }}>✏️ Notion : {data.notion_titre}</span>
          <span style={{ color, fontSize: 13 }}>{showNotion ? "▲" : "▼"}</span>
        </button>
        {showNotion && (
          <div style={{ marginTop: 10 }}>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#444", lineHeight: 1.6 }}>{data.notion_explication}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.notion_exemples.map((ex, i) => (
                <div key={i} style={{ background: "white", borderRadius: 8, padding: "7px 10px", fontSize: 13, color, fontStyle: "italic" }}>« {ex} »</div>
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
          <p style={{ margin: 0, fontSize: 12, color: "#555" }}>🏛️ <strong>Repère :</strong> {data.repere_historique}</p>
        </div>
      )}

      {/* Exercices d'application */}
      <h4 style={{ color, marginBottom: 10, fontSize: 13 }}>✏️ À toi de jouer :</h4>
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
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#1F2937" }}>{exercice.consigne}</p>
      {!revealed ? (
        <button onClick={() => setRevealed(true)} style={{ fontSize: 12, color, background: "none", border: `1px solid ${color}40`, borderRadius: 16, padding: "4px 12px", cursor: "pointer" }}>
          Voir la réponse
        </button>
      ) : (
        <div style={{ background: HG_BG, borderRadius: 8, padding: "8px 12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, color, fontWeight: 600 }}>✓ {exercice.reponse}</p>
          {exercice.explication && <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{exercice.explication}</p>}
        </div>
      )}
    </div>
  );
}

function TrousGrammaireCard({ data, color }) {
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);

  const parts = data.texte_trous.split(/(\{\{\d+\}\})/g);
  const score = checked ? data.trous.filter(t => (answers[t.id] || "").trim().toLowerCase() === t.reponse.toLowerCase()).length : 0;

  return (
    <div>
      <h3 style={{ color, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      <p style={{ color: "#888", fontSize: 12, marginBottom: 14 }}>📅 {data.periode_precise}</p>

      <div style={{ background: HG_BG, border: `1px solid ${color}30`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 700, color, fontSize: 13 }}>✏️ Notion : {data.notion_titre}</p>
        <p style={{ margin: 0, fontSize: 13, color: "#444", lineHeight: 1.6 }}>{data.notion_explication}</p>
      </div>

      <div style={{ background: "white", border: `1px solid ${color}20`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1F2937" }}>📖 {data.texte_titre}</h4>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 2.1, color: "#374151" }}>
          {parts.map((part, i) => {
            const match = part.match(/\{\{(\d+)\}\}/);
            if (!match) return <span key={i}>{part}</span>;
            const id = match[1];
            const trou = data.trous.find(t => String(t.id) === id);
            const isCorrect = checked && (answers[id] || "").trim().toLowerCase() === trou?.reponse.toLowerCase();
            const isWrong = checked && !isCorrect;
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
        </p>
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
            <span style={{ fontSize: 13, color: "#555", marginLeft: 8 }}>bonnes réponses</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {data.trous.filter(t => (answers[t.id] || "").trim().toLowerCase() !== t.reponse.toLowerCase()).map(t => (
              <div key={t.id} style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
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
                  style={{ ...cs(q, idx, c.lettre), borderRadius: 8, padding: "10px 12px", cursor: submitted ? "default" : "pointer", textAlign: "left", fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start", width: "100%" }}>
                  <span style={{ minWidth: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: answers[idx] === c.lettre ? color : "#E5E7EB", color: answers[idx] === c.lettre ? "white" : "#6B7280" }}>{c.lettre}</span>
                  <span>{c.texte}</span>
                  {submitted && c.lettre === q.bonne_reponse && <span style={{ marginLeft: "auto" }}>✅</span>}
                </button>
              ))}
            </div>
            {submitted && (
              <div style={{ padding: "10px 14px 14px", background: answers[idx] === q.bonne_reponse ? "#F0FDF4" : "#FFF7ED" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>{q.explication}</p>
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
            <button onClick={onRetry} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${color}`, background: "white", color, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🔄 Nouveau quiz</button>
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

  // Récupère la notion et le format pour le niveau actuel
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
Texte de 6-10 phrases. Choisis 5-7 mots/groupes illustrant la notion, remplace par {{1}}, {{2}}... Dans "trous", donne la réponse exacte et une explication grammaticale courte.
JSON: {"titre":string,"periode_precise":string,"notion_titre":string,"notion_explication":string,"texte_titre":string,"texte_trous":string,"trous":[{"id":number,"reponse":string,"explication":string}]}
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
        const cached = getCached("hg", ep.id, subId);
        if (cached && cached.status === "validated") { setContent(cached.data); setLoading(false); return; }
        if (cached && cached.status === "pending") { setContent(cached.data); setLoading(false); return; }
      }
      const { format } = getNotionPourNiveau(ep);
      let prompt;
      if (forcedMode === "quiz") prompt = buildQuizPrompt(ep);
      else prompt = format === "trous" ? buildTrousPrompt(ep) : buildLecturePrompt(ep);
      const parsed = await callClaude([{ role: "user", content: prompt }],
        "Tu es expert en histoire du Québec et du Canada et en grammaire française, dans l'esprit pédagogique de Récitus (histoire.recitus.qc.ca). Tu réponds TOUJOURS en JSON valide uniquement, sans markdown, sans backticks.");
      setCached("hg", ep.id, parsed, subId);
      setContent(parsed);
    } catch (e) { setError(`Erreur : ${e.message}`); console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "#3D1F0F", padding: "18px 16px", position: "relative", textAlign: "center" }}>
        <button onClick={onBack} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: "#D4A574", cursor: "pointer", fontSize: 12 }}>← Accueil</button>
        <h1 style={{ margin: 0, color: "white", fontSize: 20, fontWeight: 800 }}>📜 Histoire & Grammaire</h1>
        <p style={{ margin: "5px 0 0", color: "#D4A574", fontSize: 12 }}>Apprendre la grammaire à travers l'histoire du Québec</p>
      </div>

      {/* Sélecteur de niveau */}
      <div style={{ background: "white", borderBottom: "1px solid #E0E0E0", padding: "10px 16px", display: "flex", justifyContent: "center", gap: 6 }}>
        {NIVEAUX.map(n => (
          <button key={n.id} onClick={() => setNiveau(n.id)}
            style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${niveau === n.id ? HG_COLOR : "#E5E7EB"}`, background: niveau === n.id ? HG_COLOR : "white", color: niveau === n.id ? "white" : "#666", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {n.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* Frise chronologique */}
        {!epoque && (
          <div>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 16, textAlign: "center" }}>
              Chaque époque historique te fait travailler une notion de grammaire précise — inspiré de la structure de <strong>Récitus</strong>, un site de référence en histoire du Québec.
            </p>
            {!isPremium() && (
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400E" }}>
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
                      <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>{ep.periode}</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: locked ? "#F0EFED" : ep.bg, borderRadius: 10, padding: "2px 8px" }}>
                        <span style={{ fontSize: 11, color: locked ? "#aaa" : ep.color, fontWeight: 600 }}>✏️ {n.notion}</span>
                      </div>
                      {locked && <span style={{ display: "block", fontSize: 10, color: "#bbb", marginTop: 4 }}>🔒 Accès complet requis</span>}
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
                style={{ background: "none", border: "none", color: epoque.color, fontSize: 12, cursor: "pointer", padding: 0 }}>← Époques</button>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => loadContenu(epoque, "contenu")} disabled={loading}
                  style={{ fontSize: 11, padding: "5px 11px", borderRadius: 16, border: "none", cursor: loading ? "not-allowed" : "pointer", background: mode === "contenu" ? epoque.color : "white", color: mode === "contenu" ? "white" : epoque.color, fontWeight: 600, border: `1px solid ${epoque.color}40` }}>
                  📖 {(epoque.notions[niveau] || epoque.notions["b1b2"]).format === "trous" ? "Texte à trous" : "Lecture"}
                </button>
                <button onClick={() => loadContenu(epoque, "quiz")} disabled={loading}
                  style={{ fontSize: 11, padding: "5px 11px", borderRadius: 16, cursor: loading ? "not-allowed" : "pointer", background: mode === "quiz" ? epoque.color : "white", color: mode === "quiz" ? "white" : epoque.color, fontWeight: 600, border: `1px solid ${epoque.color}40` }}>
                  🧩 Quiz
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>{epoque.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: epoque.color, fontSize: 15 }}>{epoque.label}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{epoque.periode} · niveau {NIVEAUX.find(n => n.id === niveau)?.label}</div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 16, padding: 16, border: `1px solid ${epoque.color}15`, boxShadow: `0 2px 12px ${epoque.color}08` }}>
              {loading && <div style={{ textAlign: "center", padding: "18px 0" }}><LoadingDots color={epoque.color} /><p style={{ color: "#888", fontSize: 12, marginTop: 6 }}>Génération en cours…</p></div>}
              {error && !loading && (
                <div style={{ textAlign: "center", padding: 18 }}>
                  <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 10 }}>{error}</p>
                </div>
              )}
              {/* Écran d'attente si non validé */}
              {!content && !loading && !error && (() => {
                const subId = `${mode}_${niveau}`;
                const cached = getCached("hg", epoque.id, subId);
                if (!cached || cached.status !== "validated") {
                  return (
                    <div style={{ textAlign: "center", padding: "28px 16px" }}>
                      <div style={{ fontSize: 48, marginBottom: 14 }}>📜</div>
                      <p style={{ fontWeight: 900, fontSize: 15, color: epoque.color, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Contenu bientôt disponible</p>
                      <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>Caroline prépare ce contenu pour toi.<br/>Reviens dans quelques instants !</p>
                    </div>
                  );
                }
                return null;
              })()}
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

// ── APERÇU ALTERNATIF ─────────────────────────────────────────────────────────
function AltPreview({ data, cacheKey }) {
  if (!data) return null;
  const [type, , subId] = cacheKey.split("__");

  // Dialogue oral
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

  // Vocabulaire
  if (data.expressions) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.expressions.map((e, i) => (
        <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < data.expressions.length - 1 ? "1px solid #E5E7EB" : "none" }}>
          <strong style={{ color: "#1D4ED8" }}>« {e.expression} »</strong>
          <span style={{ marginLeft: 8, fontSize: 11, background: "#EFF6FF", borderRadius: 10, padding: "1px 7px" }}>{e.registre}</span>
          <p style={{ margin: "3px 0 0", color: "#555", fontSize: 12 }}>{e.contexte}</p>
          <p style={{ margin: "2px 0 0", fontStyle: "italic", fontSize: 12 }}>« {e.exemple} »</p>
        </div>
      ))}
    </div>
  );

  // Registres
  if (data.versions) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 6 }}>{data.titre}</p>}
      {data.situation && <p style={{ color: "#555", marginBottom: 10, fontSize: 12 }}>Situation : {data.situation}</p>}
      {data.versions.map((v, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <strong style={{ fontSize: 12, textTransform: "uppercase", color: "#6B7280" }}>{v.registre}</strong>
          <p style={{ margin: "2px 0 0", fontStyle: "italic" }}>« {v.texte} »</p>
        </div>
      ))}
    </div>
  );

  // Culture
  if (data.concept) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 6 }}>{data.titre}</p>}
      <p style={{ fontWeight: 600, marginBottom: 6 }}>{data.concept}</p>
      <p style={{ color: "#555", fontSize: 12, marginBottom: 8 }}>{data.comment_ca_marche}</p>
      {data.exemples?.map((e, i) => (
        <p key={i} style={{ margin: "0 0 4px", fontSize: 12 }}>📌 {e.situation} → <em>« {e.reaction_typique_quebecoise} »</em></p>
      ))}
    </div>
  );

  // Quiz
  if (data.questions) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.questions.map((q, i) => (
        <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < data.questions.length - 1 ? "1px solid #E5E7EB" : "none" }}>
          <p style={{ fontWeight: 600, margin: "0 0 4px", fontSize: 12 }}>Q{i+1}. {q.question}</p>
          {q.choix.map(c => (
            <p key={c.lettre} style={{ margin: "1px 0", fontSize: 11, color: c.lettre === q.bonne_reponse ? "#065F46" : "#555", fontWeight: c.lettre === q.bonne_reponse ? 700 : 400 }}>
              {c.lettre === q.bonne_reponse ? "✓" : "○"} {c.lettre}. {c.texte}
            </p>
          ))}
        </div>
      ))}
    </div>
  );

  // Small talk — entrees/sorties
  if (data.entrees) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>🚪 Entrer :</p>
      {data.entrees.map((e, i) => <p key={i} style={{ margin: "0 0 4px", fontSize: 12 }}>• <strong>« {e.formule} »</strong> — {e.quand}</p>)}
      <p style={{ fontWeight: 600, fontSize: 12, margin: "10px 0 4px" }}>👋 Sortir :</p>
      {data.sorties.map((s, i) => <p key={i} style={{ margin: "0 0 4px", fontSize: 12 }}>• <strong>« {s.formule} »</strong> — {s.quand}</p>)}
    </div>
  );

  // Small talk — références
  if (data.references) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.references.map((r, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <p style={{ margin: "0 0 2px", fontWeight: 600 }}>{r.emoji} {r.sujet}</p>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#555" }}>{r.ce_quil_faut_savoir}</p>
        </div>
      ))}
    </div>
  );

  // Small talk — faux amis
  if (data.faux_amis) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.faux_amis.map((fa, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: ST_COLOR }}>« {fa.mot} »</p>
          <p style={{ margin: "0 0 1px", fontSize: 12, color: "#065F46" }}>🇨🇦 {fa.sens_quebec}</p>
          <p style={{ margin: 0, fontSize: 12, color: "#DC2626" }}>🇫🇷 {fa.sens_france_ou_malentendu}</p>
        </div>
      ))}
    </div>
  );

  // Small talk — valeurs/faux pas
  if (data.scenarios) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.scenarios.map((s, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 12 }}>📌 {s.situation}</p>
          <p style={{ margin: "0 0 2px", fontSize: 11, color: "#DC2626" }}>❌ {s.ce_que_fait_immigrant}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#065F46" }}>✅ {s.comment_sen_sortir}</p>
        </div>
      ))}
    </div>
  );

  // Small talk — expressions imagées
  if (data.expressions && data.expressions[0]?.vrai_sens) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.expressions.map((e, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: ST_COLOR }}>« {e.expression} »</p>
          <p style={{ margin: 0, fontSize: 12, color: "#555" }}>{e.vrai_sens}</p>
        </div>
      ))}
    </div>
  );

  // Small talk — rythme/situations
  if (data.situations) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.situations.map((s, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 12 }}>Martin : « {s.ce_que_dit_martin} »</p>
          {s.reactions.map((r, j) => (
            <p key={j} style={{ margin: "1px 0", fontSize: 11, color: r.type === "ideal" ? "#065F46" : r.type === "mauvais" ? "#991B1B" : "#555" }}>
              {r.type === "ideal" ? "✅" : r.type === "mauvais" ? "❌" : "🆗"} « {r.reponse} »
            </p>
          ))}
        </div>
      ))}
    </div>
  );

  // Small talk — lunch / sections
  if (data.sections) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 8 }}>{data.titre}</p>}
      {data.sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{s.emoji} {s.titre}</p>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#555" }}>{s.contenu}</p>
          {s.expressions?.slice(0, 2).map((e, j) => (
            <p key={j} style={{ margin: "0 0 2px", fontSize: 11 }}>• <strong>« {e.expression} »</strong> — {e.explication}</p>
          ))}
        </div>
      ))}
    </div>
  );

  // Histoire-grammaire — texte à trous
  if (data.texte_trous) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 6 }}>{data.titre}</p>}
      <p style={{ fontSize: 12, color: "#555", marginBottom: 8 }}><strong>Notion :</strong> {data.notion_titre}</p>
      <p style={{ fontSize: 13, lineHeight: 1.7 }}>{data.texte_trous.replace(/\{\{\d+\}\}/g, "[ ___ ]")}</p>
    </div>
  );

  // Histoire-grammaire — lecture
  if (data.texte) return (
    <div>
      {data.titre && <p style={{ fontWeight: 700, marginBottom: 6 }}>{data.titre}</p>}
      <p style={{ fontSize: 12, color: "#555", marginBottom: 8 }}><strong>Notion :</strong> {data.notion_titre}</p>
      <p style={{ fontSize: 13, lineHeight: 1.7 }}>{data.texte}</p>
    </div>
  );

  // Fallback — afficher les clés principales
  return (
    <div>
      {Object.entries(data).filter(([k]) => typeof data[k] === "string").slice(0, 5).map(([k, v]) => (
        <p key={k} style={{ margin: "0 0 6px", fontSize: 12 }}><strong>{k} :</strong> {v.substring(0, 120)}</p>
      ))}
    </div>
  );
}

// ── ÉCRAN PREMIUM ─────────────────────────────────────────────────────────────
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
        <p style={{ margin: 0, fontSize: 12, color: D.gris3, lineHeight: 1.6 }}>
          {isHG
            ? "Les 7 sections × 3 niveaux font partie de l'accès complet."
            : "Les modules par secteur professionnel font partie de l'accès complet."}
        </p>
      </div>

      {/* Ce qui est inclus */}
      <div style={{ background: D.gris0, borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 500, color: D.gris3, textTransform: "uppercase", letterSpacing: 0.5 }}>Accès complet à 19 $ — une seule fois</p>
        {[
          "6 secteurs professionnels (Construction, Finance, Santé, Éducation, Commerce, TI)",
          "5 modules par secteur : oral, vocabulaire, registres, culture, quiz",
          "Histoire & Grammaire — 7 sections × 3 niveaux (A2, B1-B2, C1-C2)",
          "Progression et suivi des résultats",
          "Accès illimité, sans abonnement",
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < 4 ? 6 : 0 }}>
            <span style={{ color: D.rouge, fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
            <span style={{ fontSize: 12, color: D.gris4, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      {/* Gratuit inclus */}
      <p style={{ margin: "0 0 16px", fontSize: 11, color: D.gris3, textAlign: "center" }}>
        Déjà gratuit : Small talk complet · Lexique québécois · Une époque Histoire & Grammaire
      </p>

      {/* Saisie du code */}
      {!success ? (
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: D.gris4, fontWeight: 500 }}>Tu as déjà un code d'accès ?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={code} onChange={e => { setCode(e.target.value); setError(false); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Entre ton code ici"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${error ? D.rouge : D.gris2}`, fontSize: 13, outline: "none", color: D.noir, background: D.blanc, transition: "border-color 0.15s" }} />
            <button onClick={handleSubmit}
              style={{ background: D.noir, color: D.blanc, border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
              Activer →
            </button>
          </div>
          {error && <p style={{ margin: "6px 0 0", fontSize: 12, color: D.rouge }}>Code invalide — vérifie et réessaie.</p>}
          <div style={{ height: 1, background: D.gris2, margin: "16px 0" }} />
          <a href="https://carolinedouret.com" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", textAlign: "center", background: D.rouge, color: D.blanc, borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
            Obtenir l'accès complet — 19 $ →
          </a>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: D.gris3, textAlign: "center" }}>
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

  if (status === "done") return <p style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>✅ {count} expressions ajoutées au lexique !</p>;
  if (status === "error") return <p style={{ fontSize: 13, color: "#DC2626" }}>❌ Erreur — réessaie</p>;

  return (
    <button onClick={generate} disabled={status === "loading"}
      style={{ background: "#065F46", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? 0.7 : 1 }}>
      {status === "loading" ? "⏳ Génération…" : "💬 Générer les expressions → Lexique"}
    </button>
  );
}

// ── MODE ENSEIGNANTE ──────────────────────────────────────────────────────────
function TeacherMode({ onClose }) {
  const [pwd, setPwd] = useState("");
  const [auth, setAuth] = useState(false);
  const [pwdError, setPwdError] = useState(false);
  const [cache, setCache] = useState(loadCache());
  const [editKey, setEditKey] = useState(null);
  const [editText, setEditText] = useState("");
  const [regenLoading, setRegenLoading] = useState(null);
  const [altData, setAltData] = useState({}); // {key: data} — alternatives générées
  const [filter, setFilter] = useState("all");

  function refresh() { setCache(loadCache()); }

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
        const PROMPTS_ST = {
          references: `Tu es expert de la culture québécoise et du small talk au bureau. Génère un guide sur 5 sujets de conversation incontournables (hockey, météo, chalet, routes, culture pop). JSON: {"titre":string,"intro":string,"references":[{"emoji":string,"sujet":string,"sous_titre":string,"ce_quil_faut_savoir":string,"phrases_utiles":[string],"piege":string}]} UNIQUEMENT JSON.`,
          entree_sortie: `Guide pratique: 4 façons d'entrer dans une conversation à la pause café ET 4 façons d'en sortir, en québécois authentique. JSON: {"titre":string,"intro":string,"entrees":[{"formule":string,"quand":string,"effet":string,"variante":string}],"sorties":[{"formule":string,"quand":string,"effet":string,"variante":string}],"conseil_cle":string} UNIQUEMENT JSON.`,
          rythme: `5 situations où un immigrant casse le rythme. 3 réponses par situation (ideal/correct/mauvais). JSON: {"titre":string,"intro":string,"situations":[{"ce_que_dit_martin":string,"reactions":[{"type":"ideal"|"correct"|"mauvais","reponse":string,"pourquoi":string}],"lecon":string}]} UNIQUEMENT JSON.`,
          lunch: `Guide complet sur le lunch au bureau québécois. 4 sections. JSON: {"titre":string,"intro":string,"sections":[{"emoji":string,"titre":string,"contenu":string,"expressions":[{"expression":string,"explication":string}],"conseil":string}],"annotations":[{"terme":string,"definition":string}]} UNIQUEMENT JSON.`,
          valeurs: `7 scénarios de faux pas culturels autour des valeurs non dites du Québec : modestie, égalitarisme, rapport à l'argent, humour autodérisoire, débat souverainiste/fédéraliste (comment esquiver poliment), laïcité et religion. Pour chaque scénario: situation, ce_que_fait_immigrant, ce_que_pensent_les_quebecois, ce_qui_se_passe_vraiment, comment_sen_sortir, valeur_en_jeu. JSON: {"titre":string,"intro":string,"scenarios":[{"situation":string,"ce_que_fait_immigrant":string,"ce_que_pensent_les_quebecois":string,"ce_qui_se_passe_vraiment":string,"comment_sen_sortir":string,"valeur_en_jeu":string}],"annotations":[{"terme":string,"definition":string}]} UNIQUEMENT JSON.`,
          sacres: `Guide complet sur les sacres québécois comme intensificateurs émotionnels. Origine religieuse, gamme d'émotions, formes atténuées, règles sociales, exemples chantier/bureau/pause café. JSON: {"titre":string,"intro":string,"sections":[{"emoji":string,"titre":string,"contenu":string,"exemples":[{"sacre":string,"forme_attenuation":string,"emotion":string,"exemple_phrase":string,"traduction_emotion":string}],"conseil":string}],"annotations":[{"terme":string,"definition":string}]} UNIQUEMENT JSON.`,
          faux_amis: `12 faux amis et pièges linguistiques avec scénario, sens correct, malentendu créé, et astuce mémo. Inclure OBLIGATOIREMENT : s'ennuyer de (I miss you au QC), "j'ai envie de toi" (erreur hispanophone : tener envidia = envier, mais en français = désir amoureux — catastrophique !), gosser, char, dépanneur, pogner, magasiner, brunante, clavarder, niaiseux, être game, blé d'Inde. JSON: {"titre":string,"intro":string,"faux_amis":[{"mot":string,"scenario":string,"sens_quebec":string,"sens_france_ou_malentendu":string,"astuce":string}],"annotations":[{"terme":string,"definition":string}]} UNIQUEMENT JSON.`,
          expressions: `8 expressions imagées québécoises avec scénario, interprétation erronée, vrai sens et exemple de réutilisation. JSON: {"titre":string,"intro":string,"expressions":[{"expression":string,"scenario":string,"interpretation_erronee":string,"vrai_sens":string,"exemple_reutilisation":string}],"annotations":[{"terme":string,"definition":string}]} UNIQUEMENT JSON.`
        };
        prompt = PROMPTS_ST[subId] || "";
      } else if (type === "hg") {
        const ep = EPOQUES.find(e => e.id === id);
        // subId format: "contenu_a2" | "contenu_b1b2" | "quiz_c1c2" etc.
        const [modeHG, niv] = subId.split("_");
        const notionData = ep?.notions?.[niv] || ep?.notions?.["b1b2"];
        if (ep && notionData) {
          prompt = modeHG === "quiz"
            ? `Quiz sur "${ep.label}", notion: ${notionData.notion}. JSON: {"titre":string,"questions":[{"question":string,"choix":[{"lettre":"A"|"B"|"C"|"D","texte":string}],"bonne_reponse":"A"|"B"|"C"|"D","explication":string}]} UNIQUEMENT JSON.`
            : notionData.format === "trous"
              ? `Texte à trous sur "${ep.label}" (${ep.periode}), notion: ${notionData.notion}. JSON: {"titre":string,"periode_precise":string,"notion_titre":string,"notion_explication":string,"texte_titre":string,"texte_trous":string,"trous":[{"id":number,"reponse":string,"explication":string}]} UNIQUEMENT JSON.`
              : `Texte + exercices sur "${ep.label}" (${ep.periode}), notion: ${notionData.notion}. JSON: {"titre":string,"periode_precise":string,"notion_titre":string,"notion_explication":string,"notion_exemples":[string],"texte_titre":string,"texte":string,"mots_cles":[string],"repere_historique":string,"exercices":[{"consigne":string,"reponse":string,"explication":string}]} UNIQUEMENT JSON.`;
        }
      }
      if (!prompt) throw new Error("Prompt introuvable");
      const parsed = await callClaude([{ role: "user", content: prompt }],
        "Tu es expert de la langue et culture québécoise. Tu réponds TOUJOURS en JSON valide uniquement, sans markdown.");

      if (entry.status === "validated") {
        // Contenu validé → stocker l'alternative séparément pour comparaison
        setAltData(a => ({ ...a, [key]: parsed }));
      } else {
        // Contenu non validé → remplacer directement
        const c = loadCache();
        c[key] = { data: parsed, status: "pending", createdAt: new Date().toISOString() };
        saveCache(c);
        refresh();
      }
    } catch (e) { alert(`Erreur : ${e.message}`); }
    finally { setRegenLoading(null); }
  }

  function handleKeepAlt(key) {
    // Remplacer le contenu validé par l'alternative et la valider
    const [type, id, subId] = key.split("__");
    updateCached(type, id, altData[key], subId);
    setAltData(a => { const n = { ...a }; delete n[key]; return n; });
    refresh();
  }

  function handleDiscardAlt(key) {
    setAltData(a => { const n = { ...a }; delete n[key]; return n; });
  }

  function handleValidate(key) { validateCached(...key.split("__")); refresh(); }
  function handleReject(key) { if (confirm("Supprimer ce contenu ?")) { rejectCached(...key.split("__")); refresh(); } }

  function handleEditSave(key) {
    try {
      const parsed = JSON.parse(editText);
      const [type, id, subId] = key.split("__");
      updateCached(type, id, parsed, subId);
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
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13 }}>← Retour</button>
        <h2 style={{ margin: 0, color: "white", fontSize: 18, fontWeight: 800 }}>🔑 Mode Enseignante</h2>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "white", borderRadius: 16, padding: 28, maxWidth: 320, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
            <h3 style={{ margin: 0, color: "#1B2B1E" }}>Accès Enseignante</h3>
            <p style={{ fontSize: 13, color: "#888", margin: "6px 0 0" }}>Valide et corrige les contenus générés</p>
          </div>
          <input type="password" value={pwd} onChange={e => { setPwd(e.target.value); setPwdError(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Mot de passe"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${pwdError ? "#DC2626" : "#E5E7EB"}`, fontSize: 14, marginBottom: 10, boxSizing: "border-box", outline: "none" }} />
          {pwdError && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#DC2626" }}>Mot de passe incorrect</p>}
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
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13 }}>← Retour</button>
          <h2 style={{ margin: 0, color: "white", fontSize: 17, fontWeight: 800 }}>🔑 Mode Enseignante</h2>
        </div>
        {pendingCount > 0 && <span style={{ background: "#F59E0B", color: "white", borderRadius: 10, fontSize: 11, padding: "3px 9px", fontWeight: 700 }}>{pendingCount} à valider</span>}
      </div>

      {/* Filtres */}
      <div style={{ background: "white", borderBottom: "1px solid #E0E0E0", padding: "10px 16px", display: "flex", gap: 8 }}>
        {[["all", "Tout"], ["pending", "⏳ À valider"], ["validated", "✅ Validés"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: filter === id ? "#1B2B1E" : "#F3F4F6", color: filter === id ? "white" : "#555" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 60px" }}>
        {filtered.length === 0 ? (
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
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1F2937" }}>{LABEL(key)}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9CA3AF" }}>{new Date(entry.createdAt).toLocaleDateString("fr-CA")}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: entry.status === "validated" ? "#ECFDF5" : "#FFFBE6", color: entry.status === "validated" ? "#065F46" : "#92400E" }}>
                    {entry.status === "validated" ? "✅ Validé" : "⏳ À valider"}
                  </span>
                </div>

                {/* Aperçu du contenu */}
                {editKey === key ? (
                  <div style={{ padding: 14 }}>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      style={{ width: "100%", height: 200, fontSize: 11, fontFamily: "monospace", padding: 10, borderRadius: 8, border: "1px solid #E5E7EB", boxSizing: "border-box", resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => handleEditSave(key)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#065F46", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>💾 Sauvegarder</button>
                      <button onClick={() => setEditKey(null)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "white", color: "#555", fontSize: 13, cursor: "pointer" }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "10px 14px", fontSize: 12, color: "#555", lineHeight: 1.5, maxHeight: 80, overflow: "hidden", position: "relative" }}>
                    <span style={{ color: "#9CA3AF" }}>{JSON.stringify(entry.data).substring(0, 180)}…</span>
                  </div>
                )}

                {/* Actions */}
                {editKey !== key && (
                  <div style={{ padding: "10px 14px", borderTop: "1px solid #F3F4F6", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {entry.status !== "validated" && (
                      <button onClick={() => handleValidate(key)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#ECFDF5", color: "#065F46", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✅ Valider</button>
                    )}
                    {entry.status === "validated" && (
                      <button onClick={() => { rejectCached(...key.split("__")); refresh(); }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>↩ Invalider</button>
                    )}
                    <button onClick={() => { setEditKey(key); setEditText(JSON.stringify(entry.data, null, 2)); }}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #E5E7EB", background: "white", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ Corriger</button>
                    <button onClick={() => handleRegen(key, entry)} disabled={regenLoading === key}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 600, cursor: regenLoading === key ? "not-allowed" : "pointer", opacity: regenLoading === key ? 0.6 : 1 }}>
                      {regenLoading === key ? "⏳…" : entry.status === "validated" ? "🔄 Voir une alternative" : "🔄 Régénérer"}
                    </button>
                    <button onClick={() => handleReject(key)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑️</button>
                  </div>
                )}

                {/* Alternative générée — comparaison */}
                {altData[key] && (
                  <div style={{ margin: "0 14px 14px", background: "#EFF6FF", borderRadius: 10, padding: 12, border: "1px solid #BFDBFE" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8" }}>🔄 Alternative générée — lis et compare</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleKeepAlt(key)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "none", background: "#065F46", color: "white", fontWeight: 700, cursor: "pointer" }}>
                          ✅ Utiliser celle-ci
                        </button>
                        <button onClick={() => handleDiscardAlt(key)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid #93C5FD", background: "white", color: "#1D4ED8", cursor: "pointer" }}>
                          ✕ Ignorer
                        </button>
                      </div>
                    </div>
                    {/* Contenu lisible et scrollable */}
                    <div style={{ background: "white", borderRadius: 8, padding: 12, maxHeight: 320, overflowY: "auto", fontSize: 13, color: "#1F2937", lineHeight: 1.6 }}>
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
          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#065F46" }}>💬 Expressions imagées → Lexique</p>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#555", lineHeight: 1.5 }}>
            Génère les expressions imagées québécoises et les ajoute automatiquement au lexique pour tes élèves. À faire une seule fois.
          </p>
          <GenerateExpressionsBtn />
        </div>

        {/* Export / Import / Reset cache */}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Export */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>💾 Sauvegarder mes validations</p>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#555", lineHeight: 1.5 }}>
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
              style={{ background: "#1D4ED8", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ⬇️ Exporter mes validations
            </button>
          </div>

          {/* Import */}
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#065F46" }}>📂 Restaurer mes validations</p>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#555", lineHeight: 1.5 }}>
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
              style={{ background: "#065F46", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ⬆️ Importer un fichier de validations
            </button>
          </div>

          {/* Reset */}
          {entries.length > 0 && (
            <div style={{ textAlign: "center" }}>
              <button onClick={() => { if (confirm("Effacer tout le cache ?")) { saveCache({}); refresh(); } }}
                style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 20, padding: "6px 16px", fontSize: 12, color: "#9CA3AF", cursor: "pointer" }}>
                🗑️ Vider le cache
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PROGRESSION SCREEN ────────────────────────────────────────────────────────
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
  const TS = (a) => ({ padding: "8px 14px", background: "none", border: "none", borderBottom: a ? "2px solid #0369A1" : "2px solid transparent", color: a ? "#0369A1" : "#666", fontWeight: a ? 700 : 500, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" });

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "#1B2B1E", padding: "18px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, padding: 0 }}>← Retour</button>
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
                      <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {Object.keys(parSecteur).length > 0 && (
                  <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <h4 style={{ margin: "0 0 14px", fontSize: 13, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>Score moyen par secteur</h4>
                    {Object.entries(parSecteur).map(([id,{label,scores}]) => {
                      const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
                      const sec = SECTEURS.find(s=>s.id===id);
                      const bc = avg>=75?"#065F46":avg>=50?"#B45309":"#9B1C1C";
                      return (<div key={id} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 13, color: "#333" }}>{sec?.icon} {label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: bc }}>{avg}%</span>
                        </div>
                        <div style={{ background: "#F3F4F6", borderRadius: 10, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${avg}%`, height: "100%", background: bc, borderRadius: 10 }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#999", marginTop: 3 }}>{scores.length} quiz complété{scores.length>1?"s":""}</div>
                      </div>);
                    })}
                  </div>
                )}
                {ratees.length > 0 && (
                  <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 14, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <h4 style={{ margin: 0, fontSize: 13, color: "#92400E" }}>⚠️ Expressions à réviser</h4>
                      <button onClick={() => setTab("ratees")} style={{ fontSize: 11, color: "#0369A1", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Voir tout →</button>
                    </div>
                    {ratees.slice(0,3).map((r,i)=>(
                      <div key={i} style={{ fontSize: 13, color: "#78350F", background: "white", borderRadius: 8, padding: "6px 10px", marginBottom: 6 }}>
                        <strong>« {r.expression} »</strong> — {r.secteurLabel}
                      </div>
                    ))}
                    {ratees.length>3 && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#92400E" }}>+ {ratees.length-3} autre{ratees.length-3>1?"s":""}</p>}
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
                      <div><span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{sec?.icon} {s.secteurLabel}</span>{s.type&&<span style={{ marginLeft: 8, fontSize: 11, background: "#EFF6FF", color: "#1D4ED8", borderRadius: 10, padding: "1px 7px" }}>{s.type}</span>}</div>
                      <span style={{ fontSize: 20, fontWeight: 800, color: bc }}>{pct}%</span>
                    </div>
                    <div style={{ background: "#F3F4F6", borderRadius: 10, height: 6, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: bc, borderRadius: 10 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "#888" }}>{s.score}/{s.total} bonnes réponses</span>
                      <span style={{ fontSize: 11, color: "#aaa" }}>{new Date(s.date).toLocaleDateString("fr-CA")}</span>
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
                <p style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>Ces expressions t'ont posé problème dans les quiz. Révise-les avant ta prochaine session !</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ratees.map((r,i) => {
                    const sec = SECTEURS.find(s=>s.id===r.secteurId);
                    return (<div key={i} style={{ background: "white", borderRadius: 12, padding: 14, border: "1px solid #FED7AA", borderLeft: "4px solid #F59E0B" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <strong style={{ fontSize: 15, color: "#92400E" }}>« {r.expression} »</strong>
                        <span style={{ fontSize: 10, background: sec?.bg||"#F8F8F8", color: sec?.color||"#555", borderRadius: 10, padding: "2px 8px", border: `1px solid ${sec?.color||"#555"}20`, whiteSpace: "nowrap", marginLeft: 8 }}>{sec?.icon} {r.secteurLabel}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.5 }}>{r.explication}</p>
                      {r.astuce&&<p style={{ margin: "5px 0 0", fontSize: 12, color: "#888", fontStyle: "italic" }}>💡 {r.astuce}</p>}
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
                      {MODULES.map(m => { const c = prog.modulesVus[s.id]?.[m.id]||0; if(!c) return null; return (<div key={m.id} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 12 }}>{m.icon}</span><span style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{m.label}</span><span style={{ fontSize: 11, background: s.color, color: "white", borderRadius: 10, padding: "0 5px", fontWeight: 700 }}>{c}×</span></div>); })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ marginTop: 30, textAlign: "center" }}>
          <button onClick={clearData} style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 20, padding: "6px 16px", fontSize: 12, color: "#9CA3AF", cursor: "pointer" }}>🗑️ Effacer la progression</button>
        </div>
      </div>
    </div>
  );
}

// ── QUIZ CARD ─────────────────────────────────────────────────────────────────
function QuizCard({ data, color, secteur, onRetry, onNewType, onQuizDone }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const score = submitted ? data.questions.filter((q,i) => answers[i]===q.bonne_reponse).length : 0;
  const total = data.questions.length;
  const pct = Math.round((score/total)*100);
  const sc = pct===100?"#065F46":pct>=75?"#B45309":"#9B1C1C";
  const sb = pct===100?"#ECFDF5":pct>=75?"#FEF3E2":"#FEF2F2";
  const sm = pct===100?"Parfait ! T'as toute compris ! 🎉":pct>=75?"Pas pire ! Encore un p'tit effort ! 💪":pct>=50?"Continue, t'es sur la bonne track ! 📚":"Lâche pas, ça va venir ! 🍁";
  function cs(q,idx,lettre) {
    const isSel = answers[idx]===lettre, isOk = lettre===q.bonne_reponse;
    if(!submitted) return {background:isSel?color+"15":"white",border:`2px solid ${isSel?color:"#E5E7EB"}`,color:"#1F2937"};
    if(isOk) return {background:"#ECFDF5",border:"2px solid #065F46",color:"#065F46"};
    if(isSel&&!isOk) return {background:"#FEF2F2",border:"2px solid #DC2626",color:"#DC2626"};
    return {background:"white",border:"2px solid #E5E7EB",color:"#9CA3AF"};
  }
  function handleSubmit() {
    setSubmitted(true);
    const ratees = data.questions.filter((q,i)=>answers[i]!==q.bonne_reponse).map(q=>({
      expression: q.question.length>60?q.question.substring(0,60)+"…":q.question,
      explication: q.explication, astuce: q.astuce||"",
      secteurId: secteur.id, secteurLabel: secteur.label, date: new Date().toISOString()
    }));
    onQuizDone({score,total,type:data.type,ratees});
  }
  const QT = [{id:"traduction",label:"Traduction",icon:"🔤"},{id:"situation",label:"Mise en situation",icon:"🎭"},{id:"registre",label:"Registres",icon:"🎚️"}];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: "#1F2937" }}>{data.titre}</h3>
        {data.type&&<span style={{ fontSize: 11, background: color+"20", color, borderRadius: 10, padding: "2px 10px", fontWeight: 600 }}>{data.type}</span>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {QT.map(t=><button key={t.id} onClick={()=>onNewType(t.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, cursor: "pointer", fontWeight: 500, background: "white", color, border: `1px solid ${color}40` }}>{t.icon} {t.label}</button>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.questions.map((q,idx)=>(
          <div key={idx} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB" }}>
            <div style={{ background: "#F9FAFB", padding: "12px 14px", borderBottom: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, marginBottom: 4 }}>QUESTION {idx+1}</div>
              {q.contexte&&<div style={{ fontSize: 11, color: "#6B7280", fontStyle: "italic", marginBottom: 5 }}>📍 {q.contexte}</div>}
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.5 }}>{q.question}</p>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {q.choix.map(c=>(
                <button key={c.lettre} onClick={()=>!submitted&&setAnswers(a=>({...a,[idx]:c.lettre}))}
                  style={{ ...cs(q,idx,c.lettre), borderRadius: 8, padding: "10px 12px", cursor: submitted?"default":"pointer", textAlign: "left", fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start", transition: "all 0.15s", width: "100%" }}>
                  <span style={{ minWidth: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: answers[idx]===c.lettre?color:"#E5E7EB", color: answers[idx]===c.lettre?"white":"#6B7280" }}>{c.lettre}</span>
                  <span style={{ lineHeight: 1.4 }}>{c.texte}</span>
                  {submitted&&c.lettre===q.bonne_reponse&&<span style={{ marginLeft: "auto", flexShrink: 0 }}>✅</span>}
                  {submitted&&answers[idx]===c.lettre&&c.lettre!==q.bonne_reponse&&<span style={{ marginLeft: "auto", flexShrink: 0 }}>❌</span>}
                </button>
              ))}
            </div>
            {submitted&&(
              <div style={{ padding: "10px 14px 14px", background: answers[idx]===q.bonne_reponse?"#F0FDF4":"#FFF7ED", borderTop: `1px solid ${answers[idx]===q.bonne_reponse?"#BBF7D0":"#FED7AA"}` }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: answers[idx]===q.bonne_reponse?"#065F46":"#92400E" }}>{answers[idx]===q.bonne_reponse?"✅ Bonne réponse !":"✅ Bonne réponse : "+q.bonne_reponse}</p>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#374151" }}>{q.explication}</p>
                {q.astuce&&<p style={{ margin: 0, fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>💡 {q.astuce}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        {!submitted ? (
          <button onClick={handleSubmit} disabled={Object.keys(answers).length<total}
            style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: Object.keys(answers).length===total?color:"#D1D5DB", color: "white", fontSize: 14, fontWeight: 700, cursor: Object.keys(answers).length===total?"pointer":"not-allowed" }}>
            {Object.keys(answers).length<total?`Réponds à toutes les questions (${Object.keys(answers).length}/${total})`:"Corriger mes réponses →"}
          </button>
        ) : (
          <div>
            <div style={{ background: sb, border: `1px solid ${sc}40`, borderRadius: 12, padding: "14px 18px", marginBottom: 12, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: sc }}>{score}/{total}</div>
              <div style={{ fontSize: 14, color: sc, marginTop: 4 }}>{sm}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onRetry} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${color}`, background: "white", color, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🔄 Nouveau quiz</button>
              <button onClick={()=>{setAnswers({});setSubmitted(false);}} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: color, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>↩ Recommencer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DISPLAY CARDS ─────────────────────────────────────────────────────────────
function DialogueCard({ data, color }) {
  const [rev, setRev] = useState({});
  const ann = data.annotations || [];
  return (
    <div>
      <h3 style={{ color, marginBottom: 4, fontSize: 17 }}>{data.titre}</h3>
      {data.lieu&&<p style={{ color: "#888", fontSize: 13, marginBottom: 14 }}>📍 {data.lieu}</p>}
      {ann.length > 0 && <p style={{ fontSize: 11, color: "#999", marginBottom: 10, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
      <div style={{ background: "#F8F8F8", borderRadius: 12, padding: 14, marginBottom: 18 }}>
        {data.dialogue.map((line,i)=>(
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ background: color, color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", marginTop: 3, flexShrink: 0 }}>{line.personnage}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
                  <AnnotatedText text={line.texte} annotations={ann} />
                </p>
                {!rev[i]?<button onClick={()=>setRev(r=>({...r,[i]:true}))} style={{ marginTop: 4, fontSize: 12, color, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>💡 Note phonétique</button>
                :<p style={{ margin: "4px 0 0", fontSize: 12, color: "#555", fontStyle: "italic", background: "white", padding: "4px 8px", borderRadius: 6 }}>📢 {line.note_phonetique}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <h4 style={{ color, marginBottom: 10, fontSize: 13 }}>À retenir :</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.explications.map((e,i)=>(
          <div key={i} style={{ background: "white", border: `1px solid ${color}30`, borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              <strong style={{ color, fontSize: 14 }}>« {e.expression} »</strong>
              {e.specifique_au_secteur&&<span style={{ fontSize: 10, background: color, color: "white", borderRadius: 10, padding: "1px 8px" }}>SECTEUR</span>}
            </div>
            <p style={{ margin: "3px 0 1px", fontSize: 12, color: "#666" }}>S'entend comme : <em>« {e.ce_que_ca_sonne} »</em></p>
            <p style={{ margin: 0, fontSize: 12, color: "#444" }}>Standard : <em>{e.traduction_standard}</em></p>
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
          <span style={{ background: rc[e.registre]||color, color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 10, textTransform: "uppercase" }}>{e.registre}</span>
        </div>
        <p style={{ margin: "0 0 4px", fontSize: 12, color: "#444" }}><strong>Contexte :</strong> {e.contexte}</p>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "#333", fontStyle: "italic" }}>« {e.exemple} »</p>
        {e.equivalent_france&&<p style={{ margin: "0 0 3px", fontSize: 11, color: "#777" }}>🇫🇷 En France : <em>{e.equivalent_france}</em></p>}
        {e.piege&&<p style={{ margin: "5px 0 0", fontSize: 11, color: "#c0392b", background: "#fdecea", borderRadius: 6, padding: "3px 8px" }}>⚠️ {e.piege}</p>}
      </div>
    ))}
  </div></div>;
}
function RegistreCard({ data }) {
  const colors=["#1B4332","#7B2D8B","#9E4F00"], bgs=["#F0F7F4","#F5EEF8","#FEF3E2"];
  return <div><h3 style={{ marginBottom: 8, fontSize: 17 }}>{data.titre}</h3>
    <div style={{ background: "#F8F8F8", borderRadius: 10, padding: 12, marginBottom: 16 }}><p style={{ margin: 0, fontSize: 13 }}><strong>Situation :</strong> {data.situation}</p></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
      {data.versions.map((v,i)=>(
        <div key={i} style={{ background: bgs[i], borderLeft: `4px solid ${colors[i]}`, borderRadius: "0 10px 10px 0", padding: 12 }}>
          <div style={{ color: colors[i], fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{v.registre}</div>
          <p style={{ margin: "0 0 6px", fontSize: 14, lineHeight: 1.6, fontStyle: "italic" }}>
            <AnnotatedText text={`« ${v.texte} »`} annotations={data.annotations||[]} />
          </p>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "#666" }}>📍 {v.quand_utiliser}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{v.signes_distinctifs.map((s,j)=><span key={j} style={{ background: "white", border: `1px solid ${colors[i]}40`, borderRadius: 20, padding: "2px 7px", fontSize: 10, color: "#444" }}>{s}</span>)}</div>
        </div>
      ))}
    </div>
    {data.conseil&&<div style={{ background: "#FFFBE6", border: "1px solid #FFD700", borderRadius: 10, padding: 12 }}><p style={{ margin: 0, fontSize: 13 }}>💡 <strong>Conseil :</strong> {data.conseil}</p></div>}
  </div>;
}
function CultureCard({ data, color }) {
  const ann = data.annotations || [];
  return <div>
    <h3 style={{ marginBottom: 8, fontSize: 17 }}>{data.titre}</h3>
    {ann.length > 0 && <p style={{ fontSize: 11, color: "#999", marginBottom: 10, fontStyle: "italic" }}>💡 Survole les mots <span style={{ borderBottom: "2px dotted #D42B2B" }}>soulignés</span> pour voir leur définition</p>}
    <div style={{ background: "#FFF5F5", borderLeft: `4px solid ${color}`, borderRadius: "0 10px 10px 0", padding: 12, marginBottom: 12 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{data.concept}</p></div>
    <p style={{ fontSize: 13, color: "#555", margin: "0 0 5px" }}><strong>😕 Pourquoi ça surprend :</strong> <AnnotatedText text={data.pourquoi_ca_surprend} annotations={ann} /></p>
    <p style={{ fontSize: 13, color: "#333", margin: "0 0 14px" }}><strong>🎯 Comment ça marche :</strong> <AnnotatedText text={data.comment_ca_marche} annotations={ann} /></p>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
      {data.exemples.map((ex,i)=>(
        <div key={i} style={{ background: "#F8F8F8", borderRadius: 10, padding: 12 }}>
          <p style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 600 }}>📌 {ex.situation}</p>
          <p style={{ margin: "0 0 3px", fontSize: 13, color: "#1B4332", fontStyle: "italic" }}>🇨🇦 « <AnnotatedText text={ex.reaction_typique_quebecoise} annotations={ann} /> »</p>
          <p style={{ margin: 0, fontSize: 11, color: "#777" }}>→ {ex.interpretation_possible}</p>
        </div>
      ))}
    </div>
    {data.conseil_pratique&&<div style={{ background: "#FFFBE6", border: "1px solid #FFD700", borderRadius: 10, padding: 12 }}><p style={{ margin: 0, fontSize: 13 }}>💡 <strong>À retenir :</strong> {data.conseil_pratique}</p></div>}
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


// ── DESIGN TOKENS — Option A : Moderne épuré ──────────────────────────────────
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

// ── LEXIQUE CENTRAL ───────────────────────────────────────────────────────────
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
          <button onClick={onBack} style={{ background: "none", border: "none", color: D.gris3, cursor: "pointer", fontSize: 12, padding: 0 }}>←</button>
          <div>
            <h2 style={{ margin: 0, color: D.blanc, fontSize: 17, fontWeight: 500, letterSpacing: -0.3 }}>Lexique québécois</h2>
            <p style={{ margin: "2px 0 0", color: D.gris3, fontSize: 11 }}>{entries.length} expression{entries.length > 1 ? "s" : ""} · se remplit au fil des sessions</p>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 14px 60px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher une expression…"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${D.gris2}`, fontSize: 14, marginBottom: 14, boxSizing: "border-box", outline: "none", background: D.blanc, color: D.noir }} />
        {entries.length === 0 ? (
          <div style={{ background: D.blanc, borderRadius: 10, padding: 28, textAlign: "center", border: `1px solid ${D.gris2}` }}>
            <p style={{ fontWeight: 500, color: D.noir, fontSize: 14, margin: "0 0 6px" }}>Lexique vide pour l'instant</p>
            <p style={{ color: D.gris3, fontSize: 13, margin: 0, lineHeight: 1.6 }}>Explore un module pour alimenter le lexique automatiquement. Les expressions imagées québécoises s'y retrouvent aussi !</p>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color: D.gris3, fontSize: 14, textAlign: "center", padding: 24 }}>Aucun résultat pour « {search} »</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((entry, i) => (
              <div key={i} style={{ background: D.blanc, borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid ${D.rouge}`, border: `1px solid ${D.gris2}`, borderLeft: `3px solid ${D.rouge}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <strong style={{ fontSize: 14, color: D.noir, fontWeight: 500 }}>« {entry.terme} »</strong>
                  {entry.sources?.length > 0 && <span style={{ fontSize: 10, color: D.gris3, whiteSpace: "nowrap" }}>{entry.sources[0]}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: D.gris4, lineHeight: 1.5 }}>{entry.definition}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
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
  const resultRef = useRef(null);

  async function loadModule(mod, sec=secteur, qType=quizType, forceRegen=false) {
    setActiveModule(mod); setContent(null); setError(null); setLoading(true);
    setTimeout(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),100);
    try {
      const subId = mod.id==="quiz" ? `${mod.id}_${qType}` : mod.id;
      if (!forceRegen) {
        const cached = getCached("secteur", sec.id, subId);
        if (cached) { setContent(cached.data); setHistory(h=>({...h,[`${sec.id}-${mod.id}`]:(h[`${sec.id}-${mod.id}`]||0)+1})); setLoading(false); return; }
      }
      const prompt = mod.id==="quiz"?mod.buildPrompt(sec,qType):mod.buildPrompt(sec);
      const parsed = await callClaude([{role:"user",content:prompt}], "Tu es expert de la langue et culture québécoise professionnelle. Tu réponds TOUJOURS en JSON valide uniquement, sans markdown, sans backticks, sans preamble.");
      setCached("secteur", sec.id, parsed, subId);
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
    <div style={{ minHeight: "100vh", background: D.gris0, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: D.noir }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
          <div style={{ minWidth: 64 }}>
            {secteur && <button onClick={()=>{setSecteur(null);setActiveModule(null);setContent(null);setScreen("home");}} style={{ background: "none", border: "none", color: D.gris3, cursor: "pointer", fontSize: 12, padding: 0 }}>← Accueil</button>}
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <h1 style={{ margin: 0, lineHeight: 1, letterSpacing: -0.5 }}>
              <span style={{ color: D.rouge, fontSize: 21, fontWeight: 500 }}>Tu</span>
              <span style={{ color: D.blanc, fontSize: 21, fontWeight: 500 }}> comprends-</span>
              <span style={{ color: D.rouge, fontSize: 21, fontWeight: 500 }}>tu</span>
              <span style={{ color: D.blanc, fontSize: 21, fontWeight: 500 }}> ? </span>
              <span style={{ fontSize: 18 }}>🐿️</span>
            </h1>
            {secteur ? (
              <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 5, background: D.rouge, borderRadius: 4, padding: "2px 8px" }}>
                <span style={{ fontSize: 11 }}>{secteur.icon}</span>
                <span style={{ color: D.blanc, fontSize: 10, fontWeight: 500, letterSpacing: 0.3 }}>{secteur.label}</span>
              </div>
            ) : (
              <p style={{ margin: "3px 0 0", color: D.gris3, fontSize: 10, letterSpacing: 0.5 }}>Le québécois du quotidien · au travail</p>
            )}
          </div>
          <div style={{ minWidth: 64, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={()=>setScreen("progression")}
              style={{ background: "none", border: `1px solid ${D.gris4}`, borderRadius: 6, color: D.gris3, cursor: "pointer", fontSize: 11, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              ↗{sessionCount > 0 && <span style={{ background: D.rouge, color: D.blanc, borderRadius: 8, fontSize: 9, padding: "0 4px", fontWeight: 500, marginLeft: 2 }}>{sessionCount}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Accueil */}
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
                  <div style={{ fontSize: 13, fontWeight: 500, color: D.noir }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: D.gris3, marginTop: 2 }}>{item.sub}</div>
                </div>
                <span style={{ color: D.gris2, fontSize: 16 }}>→</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: D.gris2 }} />
            <span style={{ fontSize: 10, color: D.gris3, letterSpacing: 0.8, textTransform: "uppercase" }}>Ton milieu de travail</span>
            <div style={{ flex: 1, height: 1, background: D.gris2 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
            {SECTEURS.map(s => (
              <button key={s.id} onClick={()=>handleSecteur(s)}
                style={{ background: D.blanc, border: `1px solid ${D.gris2}`, borderRadius: 10, padding: "13px 12px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", position: "relative" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=D.noir; e.currentTarget.style.background=D.gris0; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=D.gris2; e.currentTarget.style.background=D.blanc; }}>
                {!premiumState && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10 }}>🔒</span>}
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: D.noir, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: D.gris3, lineHeight: 1.4 }}>{s.desc}</div>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {s.exemples.slice(0,2).map((ex,i)=><span key={i} style={{ fontSize: 9, background: D.gris1, color: D.gris4, borderRadius: 4, padding: "2px 6px" }}>{ex}</span>)}
                </div>
              </button>
            ))}
          </div>

          <div style={{ background: D.noir, borderRadius: 10, padding: 18 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                <img src="data:image/jpeg;base64,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"
                  alt="Caroline Douret" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <p style={{ margin: "0 0 1px", fontWeight: 500, fontSize: 14, color: D.blanc }}>Caroline Douret</p>
                <p style={{ margin: 0, fontSize: 10, color: D.gris3, letterSpacing: 0.3 }}>Enseignante en immersion québécoise</p>
              </div>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: D.gris3, lineHeight: 1.7, fontStyle: "italic" }}>
              « Depuis des années, j'entends mes élèves me dire : <em>"Je comprends le français mais je ne comprends pas mes collègues québécois !"</em> Cette application est pour eux. »
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 10, color: D.gris3 }}>Cours particuliers · Groupes · En ligne</p>
              <a href="https://carolinedouret.com" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, background: D.rouge, color: D.blanc, borderRadius: 6, padding: "7px 12px", fontSize: 11, fontWeight: 500, textDecoration: "none" }}>
                carolinedouret.com →
              </a>
            </div>
          </div>

          <div style={{ marginTop: 18, textAlign: "center" }}>
            <button onClick={() => setScreen("teacher")} style={{ background: "none", border: "none", color: D.gris2, cursor: "pointer", fontSize: 12, padding: "4px 8px" }}>🔑</button>
          </div>
        </div>
      )}

      {/* Écran secteur */}
      {screen==="app" && secteur && (
        <>
          {/* Header secteur */}
          <div style={{ background: D.noir, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={()=>{setSecteur(null);setActiveModule(null);setContent(null);setScreen("home");}}
              style={{ background: "none", border: "none", color: D.gris3, cursor: "pointer", fontSize: 12, padding: 0 }}>← Accueil</button>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: D.rouge, borderRadius: 4, padding: "2px 8px" }}>
              <span style={{ fontSize: 11 }}>{secteur.icon}</span>
              <span style={{ color: D.blanc, fontSize: 10, fontWeight: 500 }}>{secteur.label}</span>
            </div>
            <div style={{ width: 60 }} />
          </div>

          {/* Mur premium si pas abonné */}
          {!premiumState ? (
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 14px 60px" }}>
              <PremiumWall context="secteur" onUnlock={() => setPremiumState(true)} />
            </div>
          ) : (
            <>
          <div style={{ background: D.blanc, borderBottom: `1px solid ${D.gris2}`, overflowX: "auto" }}>
            <div style={{ display: "flex", padding: "0 14px", minWidth: "max-content" }}>
              {MODULES.map(mod => {
                const isActive = activeModule?.id === mod.id;
                const mc = modColor(mod);
                const count = history[`${secteur.id}-${mod.id}`]||0;
                return (
                  <button key={mod.id} onClick={()=>loadModule(mod)}
                    style={{ padding: "11px 12px 9px", background: "none", border: "none", borderBottom: isActive ? `2px solid ${mc}` : "2px solid transparent", cursor: "pointer", fontSize: 11, fontWeight: isActive ? 500 : 400, color: isActive ? mc : D.gris3, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, transition: "all 0.12s" }}>
                    <span style={{ fontSize: 13 }}>{mod.icon}</span><span>{mod.label}</span>
                    {count>0 && <span style={{ background: isActive?mc:D.gris2, color: isActive?D.blanc:D.gris4, borderRadius: 8, fontSize: 9, padding: "1px 5px" }}>{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ maxWidth: 680, margin: "0 auto", padding: "18px 14px 60px" }}>
            {!activeModule && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 500, color: D.noir }}>{secteur.icon} {secteur.label}</h2>
                  <p style={{ margin: 0, fontSize: 11, color: D.gris3 }}>Contenus générés spécifiquement pour ce milieu</p>
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
                        <div style={{ fontSize: 12, fontWeight: 500, color: D.noir, marginBottom: 2 }}>{mod.label}</div>
                        <div style={{ fontSize: 10, color: D.gris3 }}>{mod.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeModule && (
              <div ref={resultRef}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{activeModule.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: D.noir }}>{activeModule.label}</div>
                      <div style={{ fontSize: 10, color: D.gris3 }}>{activeModule.desc}</div>
                    </div>
                  </div>
                </div>
                <div style={{ background: D.blanc, borderRadius: 10, padding: 16, border: `1px solid ${D.gris2}`, borderTop: `3px solid ${modColor(activeModule)}` }}>
                  {loading && <div style={{ textAlign: "center", padding: "20px 0" }}><LoadingDots color={D.noir}/><p style={{ color: D.gris3, fontSize: 12, marginTop: 8 }}>Génération en cours…</p></div>}
                  {error && !loading && <div style={{ textAlign: "center", padding: 18 }}><p style={{ fontSize: 13, color: D.rouge }}>{error}</p></div>}
                  {!content && !loading && !error && (() => {
                    const subId = activeModule.id==="quiz" ? `${activeModule.id}_${quizType}` : activeModule.id;
                    const cached = getCached("secteur", secteur.id, subId);
                    if (!cached || cached.status !== "validated") return (
                      <div style={{ textAlign: "center", padding: "28px 16px" }}>
                        <p style={{ fontSize: 22, marginBottom: 12 }}>🍁</p>
                        <p style={{ fontWeight: 500, fontSize: 14, color: D.noir, margin: "0 0 6px" }}>Contenu bientôt disponible</p>
                        <p style={{ fontSize: 12, color: D.gris3, lineHeight: 1.6, margin: 0 }}>Caroline prépare ce contenu pour toi. Reviens dans quelques instants !</p>
                      </div>
                    );
                    return null;
                  })()}
                  {content && !loading && !error && <ResultCard moduleId={activeModule.id} data={content} color={modColor(activeModule)} secteur={secteur} onQuizRetry={()=>loadModule(activeModule)} onQuizNewType={handleNewQuizType} onQuizDone={handleQuizDone}/>}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {MODULES.filter(m=>m.id!==activeModule.id).map(m => (
                    <button key={m.id} onClick={()=>loadModule(m)}
                      style={{ background: D.blanc, border: `1px solid ${D.gris2}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, color: D.gris4, transition: "border-color 0.12s" }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=D.noir}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=D.gris2}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </>
      )}
    </div>
  );
}
