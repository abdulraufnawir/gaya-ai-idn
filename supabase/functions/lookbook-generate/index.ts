// Lookbook generator: pose & background variations using Lovable AI Nano Banana edit.
// Subject-preserving image edit fits this use case better than try-on engines.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---- Pose presets ----
const POSE_PROMPTS: Record<string, { label: string; prompt: string }> = {
  front: {
    label: "Tampak Depan",
    prompt:
      "Show the same person and outfit in a clean front-facing standing pose, looking straight at the camera, arms relaxed at the sides. Keep the EXACT same face, hair, skin tone, body proportions, and outfit colors/patterns.",
  },
  side: {
    label: "Tampak Samping",
    prompt:
      "Show the same person and outfit in a side-profile standing pose (90 degrees), arms naturally at the sides. Keep the EXACT same face, hair, skin tone, body proportions, and outfit details.",
  },
  three_quarter: {
    label: "3/4 Angle",
    prompt:
      "Show the same person and outfit in a 3/4 angle standing pose (about 45 degrees), confident editorial fashion stance. Keep the EXACT same face, hair, skin tone, body proportions, and outfit details.",
  },
  walking: {
    label: "Walking Pose",
    prompt:
      "Show the same person and outfit in a natural mid-step walking pose, captured as if walking towards the camera. Keep the EXACT same face, hair, skin tone, body proportions, and outfit details.",
  },
  hand_pocket: {
    label: "Tangan di Saku",
    prompt:
      "Show the same person and outfit standing relaxed with one hand in the pocket, slight smile, casual editorial vibe. Keep the EXACT same face, hair, skin tone, body proportions, and outfit details.",
  },
  back: {
    label: "Tampak Belakang",
    prompt:
      "Show the same person and outfit from the back view, head slightly turned over the shoulder. Keep the EXACT same hair, body proportions, and outfit colors/patterns/details visible from behind.",
  },
};

// ---- Background presets ----
const BG_PROMPTS: Record<string, { label: string; prompt: string }> = {
  studio_white: {
    label: "Studio Putih",
    prompt:
      "Replace the background ONLY with a clean seamless white studio backdrop with soft even lighting. Keep the person, outfit, pose, lighting on the subject, and all garment details EXACTLY the same. Preserve realistic shadow under the feet.",
  },
  studio_grey: {
    label: "Studio Abu",
    prompt:
      "Replace the background ONLY with a seamless neutral grey studio backdrop with soft directional studio lighting. Keep the person, outfit, pose, and all garment details EXACTLY the same.",
  },
  bali_outdoor: {
    label: "Outdoor Bali",
    prompt:
      "Replace the background ONLY with a tropical Bali outdoor scene: lush green palm trees, soft golden-hour sunlight, blurred natural depth-of-field. Keep the person, outfit, pose, and all garment details EXACTLY the same. Match the lighting on the subject to the warm outdoor tone subtly.",
  },
  jakarta_street: {
    label: "Jalanan Jakarta",
    prompt:
      "Replace the background ONLY with an urban Jakarta street scene at golden hour: blurred cityscape, low-rise buildings, warm late-afternoon light. Keep the person, outfit, pose, and all garment details EXACTLY the same. Match subject lighting subtly to the warm urban tone.",
  },
  cafe_lifestyle: {
    label: "Cafe Lifestyle",
    prompt:
      "Replace the background ONLY with a cozy modern cafe interior: warm tungsten lighting, blurred wooden tables and plants in the background. Keep the person, outfit, pose, and all garment details EXACTLY the same.",
  },
  beach: {
    label: "Pantai",
    prompt:
      "Replace the background ONLY with a serene tropical beach: soft sand, turquoise sea, blurred horizon, golden-hour sunlight. Keep the person, outfit, pose, and all garment details EXACTLY the same. Subtly match subject lighting to warm beach tone.",
  },
  rooftop_night: {
    label: "Rooftop Malam",
    prompt:
      "Replace the background ONLY with a stylish rooftop scene at night: blurred Jakarta city lights, bokeh, cinematic moody tone. Keep the person, outfit, pose, and all garment details EXACTLY the same. Add subtle warm rim-light to match the night-city ambient.",
  },
};

type Body = {
  userId: string;
  sourceProjectId: string;
  sourceImageUrl: string;
  variations: Array<{ type: "pose" | "background"; key: string }>;
};

async function callLovableImageEdit(
  imageUrl: string,
  instruction: string,
): Promise<string> {
  const resp = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: instruction },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    if (resp.status === 402) {
      throw new Error("AI_CREDITS_EXHAUSTED");
    }
    console.error("[lookbook] AI gateway error", resp.status, text);
    throw new Error(`AI gateway ${resp.status}`);
  }

  const data = await resp.json();
  const url =
    data.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
  if (!url) throw new Error("No image returned from AI");
  return url;
}

async function uploadDataUrlToStorage(
  supabase: any,
  userId: string,
  dataUrl: string,
): Promise<string> {
  // dataUrl: "data:image/png;base64,...."
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid AI image data URL");
  const mime = match[1];
  const ext = mime.split("/")[1] || "png";
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));

  const path = `lookbook/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("tryon-images")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("tryon-images").getPublicUrl(path);
  return pub.publicUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // AuthN: validate JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const supaAuth = createClient(SUPABASE_URL, SERVICE_ROLE);
    const {
      data: { user },
      error: userErr,
    } = await supaAuth.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (
      !body?.sourceImageUrl ||
      !body?.sourceProjectId ||
      !Array.isArray(body.variations) ||
      body.variations.length === 0
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (body.variations.length > 6) {
      return new Response(
        JSON.stringify({ error: "Max 6 variations per call" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const userId = user.id;

    // Credit check (1 credit per variation)
    const requiredCredits = body.variations.length;
    const { data: credits, error: cErr } = await supabase
      .from("user_credits")
      .select("credits_balance")
      .eq("user_id", userId)
      .single();
    if (cErr || !credits) {
      return new Response(JSON.stringify({ error: "Credits not initialized" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((credits.credits_balance ?? 0) < requiredCredits) {
      return new Response(
        JSON.stringify({
          error: "Kredit tidak cukup",
          needed: requiredCredits,
          have: credits.credits_balance,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: any[] = [];

    for (const v of body.variations) {
      const preset =
        v.type === "pose" ? POSE_PROMPTS[v.key] : BG_PROMPTS[v.key];
      if (!preset) {
        results.push({ ...v, status: "failed", error: "Unknown preset" });
        continue;
      }

      // Insert a processing row first so the client can show progress
      const { data: row, error: insErr } = await supabase
        .from("lookbook_variations")
        .insert({
          user_id: userId,
          source_project_id: body.sourceProjectId,
          variation_type: v.type,
          variation_key: v.key,
          variation_label: preset.label,
          source_image_url: body.sourceImageUrl,
          status: "processing",
          credits_used: 1,
        })
        .select()
        .single();
      if (insErr) {
        console.error("[lookbook] insert row failed", insErr);
        results.push({ ...v, status: "failed", error: insErr.message });
        continue;
      }

      try {
        const dataUrl = await callLovableImageEdit(
          body.sourceImageUrl,
          preset.prompt,
        );
        const publicUrl = await uploadDataUrlToStorage(
          supabase,
          userId,
          dataUrl,
        );
        await supabase
          .from("lookbook_variations")
          .update({ status: "completed", result_image_url: publicUrl })
          .eq("id", row.id);

        // Deduct 1 credit + log txn
        const newBalance = (credits.credits_balance ?? 0) - 1;
        credits.credits_balance = newBalance;
        await supabase
          .from("user_credits")
          .update({
            credits_balance: newBalance,
            total_used: (credits as any).total_used
              ? (credits as any).total_used + 1
              : 1,
          })
          .eq("user_id", userId);
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          transaction_type: "usage",
          credits_amount: -1,
          credits_before: newBalance + 1,
          credits_after: newBalance,
          description: `Lookbook ${v.type}: ${preset.label}`,
          reference_id: row.id,
        });

        results.push({
          ...v,
          status: "completed",
          id: row.id,
          label: preset.label,
          resultUrl: publicUrl,
        });
      } catch (err: any) {
        console.error("[lookbook] variation failed", v, err);
        await supabase
          .from("lookbook_variations")
          .update({
            status: "failed",
            error_message: err?.message || "Unknown error",
          })
          .eq("id", row.id);
        results.push({
          ...v,
          status: "failed",
          id: row.id,
          error: err?.message,
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[lookbook] fatal", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
