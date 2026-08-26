const SUPABASE_URL = "https://wdgoksaepdbxevzoootz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZ29rc2FlcGRieGV2em9vb3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDM0MjIsImV4cCI6MjA5OTg3OTQyMn0.m6_PaZkqfxvC-2ipX5-9nUPVbxgZ_qMXN-gUr_v9_sM";

function generateCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TCT-${part()}-${part()}`;
}

async function getPayPalAccessToken() {
  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = req.body;

    // 1. Vérifier que ce webhook vient vraiment de PayPal (pas un faux appel)
    const accessToken = await getPayPalAccessToken();
    const verifyRes = await fetch("https://api-m.paypal.com/v1/notifications/verify-webhook-signature", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: req.headers["paypal-auth-algo"],
        cert_url: req.headers["paypal-cert-url"],
        transmission_id: req.headers["paypal-transmission-id"],
        transmission_sig: req.headers["paypal-transmission-sig"],
        transmission_time: req.headers["paypal-transmission-time"],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: event
      })
    });
    const verifyData = await verifyRes.json();

    if (verifyData.verification_status !== "SUCCESS") {
      console.error("Signature webhook invalide", verifyData);
      return res.status(400).json({ error: "Signature invalide" });
    }

    // Log complet pour debug lors du premier vrai test — à surveiller dans les logs Vercel
    console.log("Webhook PayPal reçu:", event.event_type, JSON.stringify(event.resource));

    // 2. Ne traiter que les paiements réellement complétés
    if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      return res.status(200).json({ received: true, ignored: event.event_type });
    }

    const resource = event.resource;
    const email = resource?.payer?.email_address || resource?.payee?.email_address || null;

    // 3. Générer un code unique
    const code = generateCode();

    // 4. Enregistrer dans Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/access_codes`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json", "Prefer": "return=minimal"
      },
      body: JSON.stringify({ code, email })
    });

    // 5. Envoyer le code par courriel via Resend
    if (email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Tu comprends-tu ? <onboarding@resend.dev>",
          to: email,
          subject: "Ton code d'accès — Tu comprends-tu ?",
          html: `<p>Merci pour ton achat !</p><p>Voici ton code d'accès complet à l'application :</p><h2 style="letter-spacing:2px;">${code}</h2><p>Entre-le dans l'application (bouton 🔒 accès complet) pour débloquer tout le contenu.</p>`
        })
      });
    } else {
      console.error("Aucun courriel trouvé dans l'événement PayPal — code généré mais non envoyé:", code);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erreur webhook PayPal:", error);
    return res.status(500).json({ error: error.message });
  }
}
