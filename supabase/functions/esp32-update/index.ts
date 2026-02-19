import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { device_id, people_count, api_key } = body;

    if (!device_id || people_count === undefined || !api_key) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: device_id, people_count, api_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof people_count !== "number" || people_count < 0) {
      return new Response(
        JSON.stringify({ error: "people_count must be a non-negative number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("user_id")
      .eq("api_key", api_key)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the device
    const { data: device, error: deviceError } = await supabase
      .from("esp32_devices")
      .select("id, shop_id, user_id")
      .eq("device_uid", device_id)
      .eq("user_id", keyData.user_id)
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: "Device not found or not associated with this API key" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update device last_seen
    await supabase
      .from("esp32_devices")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", device.id);

    // Update shop crowd count if linked
    if (device.shop_id) {
      const crowdStatus =
        people_count <= 10 ? "Low" : people_count <= 25 ? "Medium" : "High";

      await supabase
        .from("shops")
        .update({ crowd_count: people_count })
        .eq("id", device.shop_id);

      return new Response(
        JSON.stringify({
          success: true,
          device_id,
          people_count,
          crowd_status: crowdStatus,
          shop_id: device.shop_id,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        device_id,
        people_count,
        message: "Device updated but not linked to any shop",
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
