// api/generate.js — version renforcée
// Ce service transmet les demandes de l'application à Claude. Il vérifie maintenant ce qu'il reçoit.

const MODELE = 'claude-sonnet-4-6';   // le seul modèle utilisé par l'application
const MAX_TOKENS = 16000;             // longueur maximale d'une réponse
const MAX_CARACTERES = 60000;         // taille maximale d'une demande
const MAX_MESSAGES = 6;

// Domaines autorisés à appeler ce service (ajoute ton nom de domaine ici quand tu en auras un)
const DOMAINES_AUTORISES = [
  'tu-comprends-tu-rouge.vercel.app',
  // 'mon-domaine.ca',
  // 'www.mon-domaine.ca',
];

function origineAutorisee(req) {
  const source = req.headers.origin || req.headers.referer || '';
  try {
    const hote = new URL(source).hostname;
    if (DOMAINES_AUTORISES.includes(hote)) return true;
    // Adresses de test créées par Vercel pour ce projet
    return hote.startsWith('tu-comprends-tu') && hote.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function demandeValide(body) {
  if (!body || !Array.isArray(body.messages)) return false;
  if (body.messages.length === 0 || body.messages.length > MAX_MESSAGES) return false;
  let total = 0;
  for (const m of body.messages) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') return false;
    total += m.content.length;
  }
  return total <= MAX_CARACTERES;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!origineAutorisee(req)) {
    return res.status(403).json({ error: 'Origine non autorisée' });
  }
  if (!demandeValide(req.body)) {
    return res.status(400).json({ error: 'Demande invalide' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      // On reconstruit la demande nous-mêmes : le modèle et la longueur sont fixés ici, pas par le navigateur
      body: JSON.stringify({
        model: MODELE,
        max_tokens: MAX_TOKENS,
        messages: req.body.messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur du service de génération' });
  }
}
