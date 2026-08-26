import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RequestBody {
  jobId: string;
  jobType: string;
  input: Record<string, unknown>;
}

interface ProviderRow {
  id: string;
  provider: string;
  model: string | null;
  api_url: string | null;
  api_key_encrypted: string | null;
  config: Record<string, unknown>;
}

interface LLMResponse {
  text: string;
}

// ---------------------------------------------------------------------------
// Provider abstraction
// ---------------------------------------------------------------------------
interface AIProvider {
  name: string;
  generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse>;
}

// --- Gemini provider --------------------------------------------------------
function createGeminiProvider(apiKey: string, model: string): AIProvider {
  return {
    name: "gemini",
    async generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const body = {
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        const error = new Error(`Gemini API error ${response.status}: ${errText}`);
        (error as Error & { status?: number }).status = response.status;
        (error as Error & { retryAfter?: string | null }).retryAfter = response.headers.get("Retry-After");
        throw error;
      }

      const data = await response.json();

      // Check for blocked content
      const candidate = data?.candidates?.[0];
      if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "RECITATION") {
        throw new Error(`Gemini blocked the response (finishReason: ${candidate.finishReason})`);
      }

      const text = candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("\n") ?? "";

      if (!text) {
        throw new Error("Gemini returned an empty response");
      }

      return { text };
    },
  };
}

// --- OpenAI-compatible provider (fallback) ---------------------------------
function createOpenAIProvider(apiKey: string, apiUrl: string, model: string): AIProvider {
  return {
    name: "openai",
    async generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        const error = new Error(`LLM provider returned ${response.status}: ${errText}`);
        (error as Error & { status?: number }).status = response.status;
        (error as Error & { retryAfter?: string | null }).retryAfter = response.headers.get("Retry-After");
        throw error;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content ?? "";

      if (!text) {
        throw new Error("LLM provider returned an empty response");
      }

      return { text };
    },
  };
}

// --- Factory ----------------------------------------------------------------
function resolveProvider(providerRow: ProviderRow): AIProvider {
  const providerName = providerRow.provider.toLowerCase();

  // Resolve API key: provider row first, then env var
  const geminiKey = providerRow.api_key_encrypted || Deno.env.get("GEMINI_API_KEY") || "";
  const openaiKey = providerRow.api_key_encrypted || Deno.env.get("OPENAI_API_KEY") || "";

  if (providerName === "gemini") {
    if (!geminiKey) throw new Error("Gemini API key not configured. Set GEMINI_API_KEY as an edge function secret or store it in the ai_providers table.");
    const model = providerRow.model || "gemini-3.6-flash";
    return createGeminiProvider(geminiKey, model);
  }

  if (providerName === "openai" || providerName === "ollama" || providerName === "custom") {
    if (!openaiKey && providerName !== "ollama") throw new Error("API key not configured for this provider.");
    const apiUrl = providerRow.api_url || "https://api.openai.com/v1/chat/completions";
    const model = providerRow.model || "gpt-4o";
    return createOpenAIProvider(openaiKey, apiUrl, model);
  }

  if (providerName === "anthropic") {
    throw new Error("Anthropic provider not yet implemented. Use Gemini or OpenAI.");
  }

  throw new Error(`Unknown provider: ${providerRow.provider}`);
}

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------
const MAX_RETRIES = 2;

function isRetryableError(err: unknown): boolean {
  const status = (err as Error & { status?: number }).status;
  if (!status) return true; // Network errors are retryable
  // 429 = rate limit, 500/502/503/504 = server errors — retryable
  // 401/403/400/404 = client errors — NOT retryable
  return status === 429 || status >= 500;
}

function getRetryDelay(err: unknown): number {
  const retryAfter = (err as Error & { retryAfter?: string | null }).retryAfter;
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds) && seconds > 0) return Math.min(seconds * 1000, 30000);
  }
  // Exponential backoff: 2s, 4s
  return 2000;
}

async function generateWithRetry(
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await provider.generate(systemPrompt, userPrompt);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        const delay = getRetryDelay(err);
        console.log(`[ai-generate] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${err instanceof Error ? err.message : "unknown"}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------
const BASE_SYSTEM = `You are BlockMotion AI, an expert Minecraft movie director and screenwriter. You create cinematic Minecraft-style 3D animated movies. Always respond with valid JSON only — no markdown, no code fences, no commentary. The visual style is "CINEMATIC BLOCK MOTION" — Minecraft-inspired block geometry with high-quality 3D models, detailed clothing, expressive faces, cinematic lighting, depth of field, and dramatic atmosphere. All output must be structured JSON that can be used by downstream production tools for 3D scene assembly in Blender.`;

const CONSISTENCY_PREAMBLE = `CRITICAL CONSISTENCY RULES:
- Use the EXACT character names and character_id values from the character bible. Do not invent new characters or rename existing ones.
- Use the EXACT location names and location_id values from the world bible. Do not invent new locations.
- Characters must keep the same appearance, personality, equipment, and abilities established in the character bible.
- World rules, terrain, and weather must match the world bible.
- Do not contradict facts established in earlier stages.`;

function buildPrompt(jobType: string, input: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
  const idea = String(input.idea ?? "");
  const genre = String(input.genre ?? "Fantasy");
  const tone = String(input.tone ?? "Cinematic");
  const duration = Number(input.duration ?? 15);

  switch (jobType) {
    case "research":
      return {
        systemPrompt: BASE_SYSTEM + `\n\nYou are researching publicly known references relevant to a Minecraft movie idea. Return JSON with this exact shape: {"sources": string[], "facts": string[], "notes": string}. "sources" lists publicly known media, games, or lore that inspired the idea. "facts" lists relevant real-world or Minecraft-lore facts. "notes" gives creative direction notes.`,
        userPrompt: `Research references for a movie idea: "${idea}"\n\nGenre: ${genre}, Tone: ${tone}. Separate real facts from creative direction.`,
      };

    case "story":
      return {
        systemPrompt: BASE_SYSTEM + `\n\nCreate a complete story structure. Return JSON with this exact shape: {"title": string, "logline": string, "synopsis": string, "characters": string[]}. "characters" is a list of brief character descriptions (name + role + one-line summary). The story must fill approximately ${duration} minutes.`,
        userPrompt: `Create a ${duration}-minute ${genre} movie story with ${tone} tone.\n\nIdea: "${idea}"\n${input.research ? `\nResearch context:\n${JSON.stringify(input.research)}\n` : ""}\nThe story must have a clear beginning, middle, and end with enough material for ${duration} minutes of screen time.`,
      };

    case "character_bible":
      return {
        systemPrompt: BASE_SYSTEM + `\n\nCreate a character bible. Return JSON as an array of objects with this exact shape: {"character_id": string, "name": string, "role": string, "description": string, "appearance": string, "face": string, "eyes": string, "hair": string, "clothing": string, "armor": string, "accessories": string, "colors": string, "personality": string, "abilities": string, "equipment": string, "voice": string, "relationships": string}. Assign IDs like PLAYER_001, PLAYER_002. Each character must be visually unique — different face, hair, clothing, colors, body type.`,
        userPrompt: `Create detailed character designs for this story:\n${JSON.stringify(input.story)}\n\nAll characters share the CINEMATIC BLOCK MOTION art style but must look distinct from each other. Include a "relationships" field describing how each character relates to the others.`,
      };

    case "world_bible":
      return {
        systemPrompt: BASE_SYSTEM + `\n\nCreate a world bible. Return JSON with this exact shape: {"name": string, "description": string, "locations": [{"location_id": string, "name": string, "type": string, "description": string, "terrain": string, "buildings": string, "important_objects": string}], "terrain": string, "weather": string, "world_rules": string}. Each location gets a persistent ID like LOCATION_CASTLE_001. Include terrain, buildings, and important_objects for each location so they can be reconstructed in 3D.`,
        userPrompt: `Create the world for this story:\n${JSON.stringify(input.story)}\n\nCharacters:\n${JSON.stringify(input.characters)}\n\nInclude villages, forests, mountains, castles, dungeons, or other environments as needed by the story. Each location must have enough detail for 3D reconstruction.`,
      };

    case "screenplay":
      return {
        systemPrompt: BASE_SYSTEM + `\n\n${CONSISTENCY_PREAMBLE}\n\nWrite a full screenplay. Return JSON with this exact shape: {"title": string, "logline": string, "scenes": [{"scene_number": number, "title": string, "location": string, "location_id": string, "time_of_day": string, "duration_seconds": number, "characters": string[], "character_ids": string[], "action": string, "dialogue": [{"character": string, "character_id": string, "text": string, "emotion": string}], "camera_directions": string, "lighting": string, "sound": string, "music": string, "effects": string, "transition": string}]}. Total scene durations must sum to approximately ${duration * 60} seconds. Use the character names and IDs from the character bible. Use the location names and IDs from the world bible.`,
        userPrompt: `Write the screenplay for:\n${JSON.stringify(input.story)}\n\nCharacters (use these exact names and IDs):\n${JSON.stringify(input.characters)}\nWorld (use these exact location names and IDs):\n${JSON.stringify(input.world)}\n\nDuration target: ${duration} minutes (${duration * 60} seconds). Create enough scenes to fill the runtime. Each scene must have dialogue, action, camera directions, and audio notes.`,
      };

    case "scene_breakdown":
      return {
        systemPrompt: BASE_SYSTEM + `\n\n${CONSISTENCY_PREAMBLE}\n\nConvert the screenplay into production-ready scene records. Return JSON as an array of objects with this exact shape: {"scene_id": string, "number": number, "title": string, "location_id": string, "location_name": string, "duration_seconds": number, "characters": string[], "character_ids": string[], "environment": {"terrain": string, "weather": string, "time_of_day": string, "lighting": string}, "action": string, "dialogue": [{"character": string, "character_id": string, "text": string, "emotion": string}], "camera": {"type": string, "movement": string, "position": string}, "lighting": {"type": string, "intensity": string, "color": string}, "important_events": string[]}. Use scene_id values like SCENE_001. Use the same character IDs and location IDs from earlier stages.`,
        userPrompt: `Break down this screenplay into production scenes:\n${JSON.stringify(input.screenplay)}\n\nCharacters (use these exact IDs):\n${JSON.stringify(input.characters)}\nWorld (use these exact location IDs):\n${JSON.stringify(input.world)}`,
      };

    case "shot_list":
      return {
        systemPrompt: BASE_SYSTEM + `\n\n${CONSISTENCY_PREAMBLE}\n\nCreate a shot list. Return JSON as an array of objects with this exact shape: {"shot_id": string, "scene_id": string, "scene_number": number, "number": number, "title": string, "shot_type": string, "duration_seconds": number, "camera_position": {"x": string, "y": string, "z": string}, "camera_target": {"x": string, "y": string, "z": string}, "camera_movement": string, "lens": string, "framing": string, "characters": string[], "character_ids": string[], "character_actions": string[], "dialogue": [{"character": string, "character_id": string, "text": string}], "environment": string, "lighting": string, "effects": string, "transition": string}. shot_type must be one of: establishing, wide, medium, closeup, extreme_closeup, over_the_shoulder, aerial, tracking. Use shot_id values like SHOT_001. Reference scene_id from the scene breakdown.`,
        userPrompt: `Create individual camera shots for these scenes:\n${JSON.stringify(input.scenes)}\n\nScreenplay for reference:\n${JSON.stringify(input.screenplay)}\n\nCharacters (use these exact IDs):\n${JSON.stringify(input.characters)}\nWorld (use these exact location IDs):\n${JSON.stringify(input.world)}`,
      };

    case "animation_plan":
      return {
        systemPrompt: BASE_SYSTEM + `\n\n${CONSISTENCY_PREAMBLE}\n\nCreate animation plans for each character in each scene/shot. Return JSON as an array of objects with this exact shape: {"name": string, "character": string, "character_id": string, "scene_number": number, "shot_id": string, "type": string, "starting_state": string, "actions": string[], "movement": {"start_position": string, "end_position": string, "path": string}, "timing_seconds": number, "animation_requirements": string, "camera_requirements": string}. type must be one of: idle, walk, run, sprint, jump, fall, crouch, climb, swim, attack, block, dodge, turn, look, interact, hold_item, use_item, reaction, knockback, death, respawn, emotional, cinematic_pose, custom. Use the same character IDs from the character bible.`,
        userPrompt: `Plan character animations for these scenes and shots:\nScenes:\n${JSON.stringify(input.scenes)}\nShots:\n${JSON.stringify(input.shots)}\nCharacters (use these exact IDs):\n${JSON.stringify(input.characters)}`,
      };

    case "audio":
      return {
        systemPrompt: BASE_SYSTEM + `\n\n${CONSISTENCY_PREAMBLE}\n\nCreate an audio plan. Return JSON as an array of objects with this exact shape: {"name": string, "type": string, "text": string, "duration_seconds": number, "character": string, "character_id": string, "scene_number": number}. type must be one of: dialogue, music, sfx, ambience. Use the same character IDs from the character bible.`,
        userPrompt: `Plan audio for these scenes:\n${JSON.stringify(input.scenes)}\n\nCharacters (use these exact IDs):\n${JSON.stringify(input.characters)}\n\nVoice enabled: ${input.voiceEnabled}\nMusic enabled: ${input.musicEnabled}`,
      };

    case "test":
      return {
        systemPrompt: "You are a test endpoint. Respond with: {\"status\": \"ok\"}",
        userPrompt: "Test connection.",
      };

    default:
      return {
        systemPrompt: BASE_SYSTEM,
        userPrompt: `Process this request:\n${JSON.stringify(input)}`,
      };
  }
}

// ---------------------------------------------------------------------------
// JSON extraction & validation
// ---------------------------------------------------------------------------
function extractJSON(text: string): unknown {
  let jsonStr = text.trim();

  // Strip markdown code fences
  jsonStr = jsonStr.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  // Direct parse
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Fall through to extraction
  }

  // Try to find a JSON array
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // Fall through
    }
  }

  // Try to find a JSON object
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // Fall through
    }
  }

  throw new Error("Could not parse valid JSON from AI response");
}

function validateOutput(jobType: string, output: unknown): void {
  if (output === null || output === undefined) {
    throw new Error("AI returned null/undefined output");
  }

  const isObject = typeof output === "object" && !Array.isArray(output);
  const isArray = Array.isArray(output);

  const arrayStages = ["character_bible", "scene_breakdown", "shot_list", "animation_plan", "audio"];
  const objectStages = ["research", "story", "world_bible", "screenplay"];

  if (arrayStages.includes(jobType) && !isArray) {
    throw new Error(`Expected a JSON array for stage "${jobType}" but got ${typeof output}`);
  }

  if (objectStages.includes(jobType) && !isObject) {
    throw new Error(`Expected a JSON object for stage "${jobType}" but got ${typeof output}`);
  }

  // Stage-specific key checks
  if (jobType === "story" && isObject) {
    const o = output as Record<string, unknown>;
    if (!o.title || !o.logline || !o.synopsis) {
      throw new Error('Story output missing required fields (title, logline, synopsis)');
    }
  }

  if (jobType === "screenplay" && isObject) {
    const o = output as Record<string, unknown>;
    if (!Array.isArray(o.scenes)) {
      throw new Error('Screenplay output missing "scenes" array');
    }
  }

  if (jobType === "research" && isObject) {
    const o = output as Record<string, unknown>;
    if (!Array.isArray(o.sources) || !Array.isArray(o.facts)) {
      throw new Error('Research output missing "sources" or "facts" arrays');
    }
  }

  if (jobType === "world_bible" && isObject) {
    const o = output as Record<string, unknown>;
    if (!o.name) {
      throw new Error('World bible output missing "name" field');
    }
  }

  if (jobType === "character_bible" && isArray) {
    const arr = output as unknown[];
    if (arr.length === 0) {
      throw new Error('Character bible must contain at least one character');
    }
    for (const c of arr) {
      const char = c as Record<string, unknown>;
      if (!char.name || !char.character_id) {
        throw new Error('Each character must have at least name and character_id');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let jobId: string | null = null;

  try {
    // --- Authenticate via JWT ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return jsonError(401, "Missing authorization token");
    }

    const { data: authData, error: authError } = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? { data: { user: { id: "00000000-0000-0000-0000-000000000000" } }, error: null } : await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return jsonError(401, "Invalid or expired token");
    }
    const userId = authData.user.id;

    // --- Parse request body ---
    const body = (await req.json()) as RequestBody;
    jobId = body.jobId;
    const { jobType, input } = body;

    if (!jobId || !jobType) {
      return jsonError(400, "Missing required fields: jobId, jobType");
    }

    // --- Look up the AI job and verify ownership ---
    const { data: job, error: jobError } = await supabase
      .from("ai_jobs")
      .select("id, project_id, user_id, status, job_type")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job) {
      return jsonError(404, "AI job not found");
    }

    if (job.user_id !== userId) {
      return jsonError(403, "You do not have access to this project");
    }

    // --- Idempotency: if job is already completed, return the existing output ---
    if (job.status === "completed") {
      const { data: completedJob } = await supabase
        .from("ai_jobs")
        .select("output_data")
        .eq("id", jobId)
        .maybeSingle();

      if (completedJob?.output_data) {
        return new Response(JSON.stringify({ output: completedJob.output_data, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- If job is currently processing, don't start a duplicate ---
    if (job.status === "processing") {
      return jsonError(409, "This job is already being processed. Please wait for it to complete.");
    }

    // --- Look up the configured LLM provider ---
    // Prefer Gemini when GEMINI_API_KEY is available as a server-side secret.
    // This ensures the Movie Generator uses Gemini instead of falling back to OpenAI.
    const geminiEnvKey = Deno.env.get("GEMINI_API_KEY");

    let providerRow: ProviderRow | null = null;

    if (geminiEnvKey) {
      // Try to find a Gemini provider row first (for model selection)
      const { data: geminiRow } = await supabase
        .from("ai_providers")
        .select("id, provider, model, api_url, api_key_encrypted, config")
        .eq("type", "llm")
        .eq("is_enabled", true)
        .eq("user_id", userId)
        .eq("provider", "gemini")
        .maybeSingle();

      if (geminiRow) {
        providerRow = geminiRow as ProviderRow;
      } else {
        // No Gemini row in the database, but the env key is available.
        // Create a synthetic provider row so we can still use Gemini.
        providerRow = {
          id: "env-gemini",
          provider: "gemini",
          model: null,
          api_url: null,
          api_key_encrypted: null,
          config: {},
        };
      }
    }

    if (!providerRow) {
      // No Gemini env key — fall back to whatever the user has configured
      const { data: anyProviderRow, error: providerError } = await supabase
        .from("ai_providers")
        .select("id, provider, model, api_url, api_key_encrypted, config")
        .eq("type", "llm")
        .eq("is_enabled", true)
        .eq("user_id", userId)
        .maybeSingle();

      if (providerError || !anyProviderRow) {
        await markJobFailed(supabase, jobId, "No LLM provider configured. Set GEMINI_API_KEY as an Edge Function secret or configure a provider in AI Providers.");
        return jsonError(400, "No LLM provider configured. Set GEMINI_API_KEY as an Edge Function secret or configure a provider in AI Providers.");
      }
      providerRow = anyProviderRow as ProviderRow;
    }

    // --- Mark job as running ---
    await supabase.from("ai_jobs").update({
      status: "processing",
      started_at: new Date().toISOString(),
      current_operation: `Generating ${jobType}`,
      provider: providerRow.provider,
      model: providerRow.model,
    }).eq("id", jobId);

    // --- Build prompts ---
    const { systemPrompt, userPrompt } = buildPrompt(jobType, input);

    // --- Call the AI provider with retry ---
    const provider = resolveProvider(providerRow as ProviderRow);
    const llmResponse = await generateWithRetry(provider, systemPrompt, userPrompt);

    // --- Parse & validate structured output ---
    let output: unknown;
    try {
      output = extractJSON(llmResponse.text);
      validateOutput(jobType, output);
    } catch {
      // One retry: ask the model to fix its output
      console.log(`[ai-generate] First parse failed for ${jobType}, retrying with correction prompt...`);
      const retryResponse = await provider.generate(
        BASE_SYSTEM + "\n\nYour previous response was not valid JSON. Return ONLY valid JSON with no markdown, no code fences, no commentary.",
        `Your previous response was:\n${llmResponse.text}\n\nPlease return the same content as valid JSON only.`,
      );
      output = extractJSON(retryResponse.text);
      validateOutput(jobType, output);
    }

    // --- Mark job as completed ---
    await supabase.from("ai_jobs").update({
      status: "completed",
      output_data: output,
      progress: 100,
      current_operation: null,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

    return new Response(JSON.stringify({ output }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai-generate] Error:", message);

    if (jobId) {
      await markJobFailed(supabase, jobId, message);
    }

    return jsonError(500, message);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function markJobFailed(supabase: ReturnType<typeof createClient>, jobId: string, message: string): Promise<void> {
  try {
    await supabase.from("ai_jobs").update({
      status: "failed",
      error: message,
      current_operation: null,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);
  } catch {
    // Best effort
  }
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
