const SUPABASE_URL = "https://phiqzfrybptqobbdgrbn.supabase.co";

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

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY est manquante dans les variables d'environnement Vercel");
    return res.status(500).json({ error: "Configuration serveur incomplète" });
  }

  try {
    const event = req.body;

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

    console.log("Webhook PayPal reçu:", event.event_type);

    if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      return res.status(200).json({ received: true, ignored: event.event_type });
    }

    const resource = event.resource;
    const email = resource?.payer?.email_address || resource?.payee?.email_address || null;

    const code = generateCode();

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/access_codes`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json", "Prefer": "return=minimal"
      },
      body: JSON.stringify({ code, email })
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("Échec de l'enregistrement du code dans Supabase:", insertRes.status, errText);
      return res.status(500).json({ error: "Échec enregistrement Supabase", details: errText });
    }

    if (email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Tu comprends-tu ? <onboarding@resend.dev>",
          to: email,
          subject: "Ton code d'accès — Tu comprends-tu ?",
          html: `<p>Merci pour ton achat !</p><p>Voici ton code d'accès complet à l'application :</p><h2 style="letter-spacing:2px;">${code}</h2><p>Entre-le dans l'application (bouton 🔒 accès complet) pour débloquer tout le contenu. Il fonctionne sur jusqu'à 3 appareils.</p>`
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
