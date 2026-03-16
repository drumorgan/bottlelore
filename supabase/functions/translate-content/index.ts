/**
 * Supabase Edge Function: translate-content
 *
 * Translates text fields using the MyMemory API (free, no API key required).
 * Anonymous usage: 5,000 chars/day. Set MYMEMORY_EMAIL secret for 30,000 chars/day.
 *
 * Request body:
 *   { fields: { name: "Red Wine", description: "..." }, target_locale: "es" }
 *
 * Response:
 *   { translations: { name: "Vino Tinto", description: "..." } }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map our locale codes to MyMemory language pairs (source|target)
const LOCALE_MAP: Record<string, string> = {
  es: "en|es",
  en: "es|en",
};

async function translateText(
  text: string,
  langPair: string,
  email?: string
): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    langpair: langPair,
  });
  if (email) {
    params.set("de", email);
  }

  const res = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error(`MyMemory API error: ${res.status}`);
  }

  const data = await res.json();

  if (data.responseStatus !== 200) {
    throw new Error(
      data.responseDetails || `MyMemory error: ${data.responseStatus}`
    );
  }

  return data.responseData.translatedText;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { fields, target_locale } = await req.json();

    if (!fields || typeof fields !== "object" || !target_locale) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: fields (object) and target_locale (string)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const langPair = LOCALE_MAP[target_locale];
    if (!langPair) {
      return new Response(
        JSON.stringify({
          error: `Unsupported target locale: ${target_locale}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Optional: set MYMEMORY_EMAIL for higher rate limits (30K chars/day)
    const email = Deno.env.get("MYMEMORY_EMAIL") || undefined;

    // Collect non-empty fields to translate
    const translations: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === "string" && value.trim()) {
        translations[key] = await translateText(value, langPair, email);
      } else if (Array.isArray(value)) {
        const filtered = value.filter(
          (v: unknown) => typeof v === "string" && (v as string).trim()
        );
        if (filtered.length > 0) {
          // Translate each array item individually for accuracy
          const translated: string[] = [];
          for (const item of filtered) {
            translated.push(await translateText(item, langPair, email));
          }
          translations[key] = translated;
        }
      }
    }

    return new Response(JSON.stringify({ translations }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
