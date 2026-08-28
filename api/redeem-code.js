const SUPABASE_URL = "https://phiqzfrybptqobbdgrbn.supabase.co";
const MAX_USES = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ valid: false, error: "Method not allowed" });
  }

  const { code } = req.body || {};
  if (!code || typeof code !== "string") {
    return res.status(400).json({ valid: false });
  }
  const entered = code.trim().toUpperCase();
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY est manquante dans les variables d'environnement Vercel");
    return res.status(500).json({ valid: false });
  }

  try {
    const lookup = await fetch(`${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(entered)}&select=*`, {
      headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}` }
    });
    if (!lookup.ok) {
      const errText = await lookup.text();
      console.error("Échec de la recherche du code dans Supabase:", lookup.status, errText);
      return res.status(500).json({ valid: false });
    }
    const rows = await lookup.json();

    if (rows && rows.length > 0 && (rows[0].use_count || 0) < MAX_USES) {
      await fetch(`${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(entered)}`, {
        method: "PATCH",
        headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ use_count: (rows[0].use_count || 0) + 1, used: true, used_at: new Date().toISOString() })
      });
      return res.status(200).json({ valid: true });
    }
    return res.status(200).json({ valid: false });
  } catch (error) {
    console.error("Erreur redeem-code:", error);
    return res.status(500).json({ valid: false });
  }
}
