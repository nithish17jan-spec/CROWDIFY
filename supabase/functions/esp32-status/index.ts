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

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const device_id = url.searchParams.get("device_id");
    const api_key = url.searchParams.get("api_key");

    if (!device_id || !api_key) {
      return new Response(
        JSON.stringify({ error: "Missing required params: device_id, api_key" }),
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

    // Fetch device with shop info
    const { data: device, error: deviceError } = await supabase
      .from("esp32_devices")
      .select("id, device_name, device_uid, last_seen, shop_id")
      .eq("device_uid", device_id)
      .eq("user_id", keyData.user_id)
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: "Device not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const isOnline = device.last_seen && device.last_seen > fiveMinAgo;

    let shopInfo = null;
    if (device.shop_id) {
      const { data: shop } = await supabase
        .from("shops")
        .select("id, name, location, crowd_count")
        .eq("id", device.shop_id)
        .single();
      if (shop) {
        const crowdStatus =
          shop.crowd_count <= 10 ? "Low" : shop.crowd_count <= 25 ? "Medium" : "High";
        shopInfo = { ...shop, crowd_status: crowdStatus };
      }
    }

    return new Response(
      JSON.stringify({
        device_id: device.device_uid,
        device_name: device.device_name,
        status: isOnline ? "online" : "offline",
        last_seen: device.last_seen,
        shop: shopInfo,
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
