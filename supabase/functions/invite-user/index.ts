import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, winery_id, role } = await req.json();

    if (!email || !winery_id || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, winery_id, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["owner", "staff"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Role must be 'owner' or 'staff'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the caller's JWT to check authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity and permissions using their JWT
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller is super admin or winery owner
    const { data: isSA } = await callerClient.rpc("is_super_admin");
    const { data: isOwner } = await callerClient.rpc("is_winery_owner", {
      check_winery_id: winery_id,
    });

    if (!isSA && !isOwner) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to invite users to this winery" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Owners can only invite staff, not other owners
    if (!isSA && role === "owner") {
      return new Response(
        JSON.stringify({ error: "Only super admins can assign the owner role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      // Check if already linked to this winery
      const { data: existingLink } = await adminClient
        .from("winery_admins")
        .select("id")
        .eq("user_id", userId)
        .eq("winery_id", winery_id)
        .maybeSingle();

      if (existingLink) {
        return new Response(
          JSON.stringify({ error: "This user is already assigned to this winery" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Invite new user via email
      const { data: inviteData, error: inviteErr } =
        await adminClient.auth.admin.inviteUserByEmail(email);

      if (inviteErr) {
        return new Response(
          JSON.stringify({ error: `Failed to invite user: ${inviteErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = inviteData.user.id;
    }

    // Link user to winery using the DB function (respects authorization checks)
    const { error: linkErr } = await callerClient.rpc("link_user_to_winery", {
      target_user_id: userId,
      target_winery_id: winery_id,
      target_role: role,
    });

    if (linkErr) {
      return new Response(
        JSON.stringify({ error: `Failed to link user: ${linkErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        existed: !!existingUser,
        message: existingUser
          ? `${email} has been added to this winery as ${role}.`
          : `Invitation sent to ${email}. They will be added as ${role} once they accept.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
