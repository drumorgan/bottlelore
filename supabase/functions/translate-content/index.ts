/**
 * Supabase Edge Function: translate-content
 *
 * Translates text fields using the DeepL API Free tier (500K chars/month).
 * DeepL API key must be stored as Supabase secret: DEEPL_API_KEY
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

// Map our locale codes to DeepL language codes
const LOCALE_TO_DEEPL: Record<string, string> = {
  es: "ES",
  en: "EN",
};

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

    const targetLang = LOCALE_TO_DEEPL[target_locale];
    if (!targetLang) {
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

    const deeplApiKey = Deno.env.get("DEEPL_API_KEY");
    if (!deeplApiKey) {
      return new Response(
        JSON.stringify({ error: "DeepL API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Collect non-empty text values to translate
    const fieldKeys: string[] = [];
    const textsToTranslate: string[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === "string" && value.trim()) {
        fieldKeys.push(key);
        textsToTranslate.push(value);
      } else if (Array.isArray(value)) {
        // For arrays (like food_pairings), join with a delimiter for batch translation
        const filtered = value.filter(
          (v: unknown) => typeof v === "string" && (v as string).trim()
        );
        if (filtered.length > 0) {
          fieldKeys.push(key);
          textsToTranslate.push(
            filtered.map((v: string) => v).join("\n---SPLIT---\n")
          );
        }
      }
    }

    if (textsToTranslate.length === 0) {
      return new Response(
        JSON.stringify({ translations: {} }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // DeepL API Free uses api-free.deepl.com
    const deeplUrl = deeplApiKey.endsWith(":fx")
      ? "https://api-free.deepl.com/v2/translate"
      : "https://api.deepl.com/v2/translate";

    // Build form data for DeepL
    const formData = new URLSearchParams();
    for (const text of textsToTranslate) {
      formData.append("text", text);
    }
    formData.append("source_lang", "EN");
    formData.append("target_lang", targetLang);

    const deeplResponse = await fetch(deeplUrl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${deeplApiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!deeplResponse.ok) {
      const errText = await deeplResponse.text();
      return new Response(
        JSON.stringify({
          error: `DeepL API error: ${deeplResponse.status} ${errText}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const deeplData = await deeplResponse.json();

    // Map translated texts back to field keys
    const translations: Record<string, string | string[]> = {};

    for (let i = 0; i < fieldKeys.length; i++) {
      const key = fieldKeys[i];
      const translatedText = deeplData.translations?.[i]?.text || "";

      // Check if original was an array (used delimiter)
      if (Array.isArray(fields[key])) {
        translations[key] = translatedText
          .split("\n---SPLIT---\n")
          .map((s: string) => s.trim())
          .filter((s: string) => s);
      } else {
        translations[key] = translatedText;
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
