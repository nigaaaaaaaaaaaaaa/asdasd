import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const checks: Record<string, string> = {};

    // Database check
    const { error: dbError } = await supabase.from("projects").select("id").limit(1);
    checks.database = dbError ? "error" : "connected";

    // Storage check
    const { error: storageError } = await supabase.storage.from("videos").list("", { limit: 1 });
    checks.storage = storageError ? "error" : "connected";

    // Queue check
    const { error: queueError } = await supabase.from("render_jobs").select("id").limit(1);
    checks.queue = queueError ? "error" : "connected";

    // AI providers check
    const { data: providers } = await supabase.from("ai_providers").select("type").eq("is_enabled", true);
    const enabledTypes = (providers ?? []).map((p) => p.type);
    checks.llm = enabledTypes.includes("llm") ? "connected" : "not_configured";
    checks.voice = enabledTypes.includes("voice") ? "connected" : "not_configured";
    checks.music = enabledTypes.includes("music") ? "connected" : "not_configured";
    checks.video = enabledTypes.includes("video") ? "connected" : "not_configured";

    // FFmpeg & Blender - not available in serverless
    checks.ffmpeg = "not_configured";
    checks.blender = "not_configured";
    checks.worker = "not_configured";

    const allHealthy = Object.values(checks).every((v) => v === "connected" || v === "not_configured");

    return new Response(
      JSON.stringify({
        status: allHealthy ? "healthy" : "degraded",
        checks,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
