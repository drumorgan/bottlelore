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
      console.error("invite-user: method not allowed:", req.method);
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, winery_id, role } = await req.json();
    console.log("invite-user: request received", { email, winery_id, role });

    if (!email || !winery_id || !role) {
      console.error("invite-user: missing fields", { email, winery_id, role });
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
      console.error("invite-user: missing authorization header");
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
      console.error("invite-user: auth failed", authErr?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("invite-user: caller authenticated", caller.id);

    // Check caller is super admin or winery owner
    const { data: isSA, error: saErr } = await callerClient.rpc("is_super_admin");
    if (saErr) console.error("invite-user: is_super_admin RPC error", saErr.message);

    const { data: isOwner, error: ownerErr } = await callerClient.rpc("is_winery_owner", {
      check_winery_id: winery_id,
    });
    if (ownerErr) console.error("invite-user: is_winery_owner RPC error", ownerErr.message);

    console.log("invite-user: permission check", { isSA, isOwner, saErr: saErr?.message, ownerErr: ownerErr?.message });

    if (!isSA && !isOwner) {
      console.error("invite-user: permission denied for user", caller.id);
      return new Response(
        JSON.stringify({ error: "You do not have permission to invite users to this winery" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Owners and super admins can assign any role (owner or staff)

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists
    const { data: existingUsers, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) {
      console.error("invite-user: listUsers failed", listErr.message);
      return new Response(
        JSON.stringify({ error: `Failed to list users: ${listErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log("invite-user: user already exists", userId);

      // Check if already linked to this winery
      const { data: existingLink } = await adminClient
        .from("winery_admins")
        .select("id")
        .eq("user_id", userId)
        .eq("winery_id", winery_id)
        .maybeSingle();

      if (existingLink) {
        console.error("invite-user: user already linked to winery");
        return new Response(
          JSON.stringify({ error: "This user is already assigned to this winery" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Invite new user via email
      console.log("invite-user: inviting new user", email);
      const { data: inviteData, error: inviteErr } =
        await adminClient.auth.admin.inviteUserByEmail(email);

      if (inviteErr) {
        console.error("invite-user: inviteUserByEmail failed", inviteErr.message);
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
      console.error("invite-user: link_user_to_winery failed", linkErr.message);
      return new Response(
        JSON.stringify({ error: `Failed to link user: ${linkErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("invite-user: success", { userId, existed: !!existingUser });
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
    console.error("invite-user: unhandled error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
