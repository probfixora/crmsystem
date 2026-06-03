// supabase/functions/admin/index.ts
// Admin-only operations: create user, list users, update user, delete user, reset password
// Replaces Express authController.js + userController.js (admin routes)
// Deploy: supabase functions deploy admin

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logoBase64 } from "../quotation/logoBase64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

async function getAdminUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, name, role, status, is_active")
    .eq("id", user.id)
    .single();
  const isActive = profile?.is_active !== false && profile?.status !== "inactive";
  if (!profile || !isActive) throw new Error("Unauthorized");
  if (profile.role?.toLowerCase() !== "admin") throw new Error("Admin access required");
  return { ...user, name: profile.name || profile.full_name, role: profile.role?.toLowerCase() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Admin client — uses service role, bypasses RLS
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    await getAdminUser(req, supabase);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "";

    // ── CREATE USER ────────────────────────────────────────────────────────
    if (action === "create_user") {
      const { name, email, role } = body;

      // Validation
      if (!name || !email || !role) {
        return jsonResponse({ message: "Name, email, and role are required" }, 400);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return jsonResponse({ message: "Invalid email format" }, 400);
      }

      const validRoles = ["admin", "sales", "registration", "banking", "inventory", "field_installation", "subsidy", "electrical", "technical", "accounts", "customer_service"];
      if (!validRoles.includes(role)) {
        return jsonResponse({ message: `Invalid role: ${role}` }, 400);
      }

      // Generate default password and Employee ID
      const password = "RBSCsolar@123";
      const employeeId = "EMP-" + Math.floor(1000 + Math.random() * 9000);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        user_metadata: { name, role },
        email_confirm: true, // skip email verification for internal tool
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
          return jsonResponse({ message: "An employee with this email already exists" }, 400);
        }
        throw authError;
      }

      // Create profile row
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        full_name: name,
        name,
        email: email.toLowerCase().trim(),
        role,
        status: "active",
        is_active: true,
        employee_id: employeeId,
      });

      if (profileError) {
        // Cleanup the auth user since profile creation failed
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      // Send professional onboarding email via Brevo HTTP API
      try {
        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        const gmailEmail = Deno.env.get("GMAIL_EMAIL");
        
        if (!brevoApiKey || !gmailEmail) {
          console.error("BREVO_API_KEY or GMAIL_EMAIL not set. Cannot send onboarding email.");
        } else {
          const joinedDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
          const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Welcome to Probfixora</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;background:#f0f4f8;color:#1a202c}
    .wrapper{max-width:620px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)}
    .header{background:linear-gradient(135deg,#1a1a5e 0%,#16a34a 100%);padding:28px 40px 24px;text-align:center}
    .header-logo{display:block;margin:0 auto 12px;max-height:60px;width:auto}
    .header h1{color:#fff;font-size:20px;font-weight:700;margin:0;letter-spacing:0.3px}
    .header p{color:rgba(255,255,255,0.80);font-size:13px;margin-top:4px}
    .divider-bar{height:4px;background:linear-gradient(90deg,#1a1a5e,#16a34a)}
    .body{padding:36px 40px}
    .greeting{font-size:18px;font-weight:700;color:#1a1a5e;margin-bottom:10px}
    .intro{font-size:14px;color:#4a5568;line-height:1.7;margin-bottom:24px}
    .credentials{background:#f8faff;border:1.5px solid #c7d2fe;border-radius:10px;padding:0;margin-bottom:24px;overflow:hidden}
    .credentials-title{background:#1a1a5e;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:10px 20px}
    .credentials table{width:100%;border-collapse:collapse;font-size:13px}
    .credentials td{padding:12px 20px;border-bottom:1px solid #e2e8f0;color:#374151}
    .credentials tr:last-child td{border-bottom:none}
    .credentials td:first-child{font-weight:600;color:#1a1a5e;width:40%;background:#f1f5fb}
    .password-note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;font-size:13px;color:#78350f;margin-bottom:24px;line-height:1.6}
    .cta-wrap{text-align:center;margin-bottom:28px}
    .cta-btn{display:inline-block;background:linear-gradient(135deg,#1a1a5e,#16a34a);color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:8px;letter-spacing:0.3px}
    .sign{font-size:13px;color:#4a5568;line-height:1.7}
    .footer{background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0}
    .footer-logo{font-size:15px;font-weight:700;color:#1a1a5e;margin-bottom:4px}
    .footer-logo span{color:#16a34a}
    .footer p{font-size:11px;color:#94a3b8;line-height:1.6;margin-top:4px}
    .footer a{color:#4f46e5;text-decoration:none}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <img src="data:image/png;base64,${logoBase64}" alt="Probfixora" class="header-logo"/>
    <h1>Welcome to Probfixora</h1>
    <p>Your employee account is ready</p>
  </div>
  <div class="divider-bar"></div>
  <div class="body">
    <div class="greeting">Dear ${name},</div>
    <p class="intro">
      Congratulations and welcome aboard! Your Probfixora employee account has been successfully created.
      Please find your login credentials below. You will be prompted to change your password on first login.
    </p>
    <div class="credentials">
      <div class="credentials-title">Account Credentials</div>
      <table>
        <tr><td>Employee ID</td><td>${employeeId}</td></tr>
        <tr><td>Email Address</td><td>${email.toLowerCase().trim()}</td></tr>
        <tr><td>Temporary Password</td><td style="font-family:monospace;font-weight:700;color:#1a1a5e">${password}</td></tr>
        <tr><td>Assigned Role</td><td>${role.charAt(0).toUpperCase() + role.slice(1)}</td></tr>
        <tr><td>Joined On</td><td>${joinedDate}</td></tr>
      </table>
    </div>
    <div class="password-note">
      <strong>Security Notice:</strong> The temporary password above must be changed after your first login.
      Do not share your credentials with anyone.
    </div>
    <p class="sign">
      Warm regards,<br/>
      <strong style="color:#1a1a5e">Probfixora — Admin Team</strong><br/>
      <span style="font-size:12px;color:#94a3b8">New Delhi, India</span>
    </p>
  </div>
  <div class="footer">
    <div class="footer-logo">Prob<span>fixora</span></div>
    <p>
      &copy; ${new Date().getFullYear()} Probfixora. All rights reserved.<br/>
      <a href="https://probfixora.com">probfixora.com</a> &nbsp;|&nbsp;
      <a href="mailto:info@probfixora.com">info@probfixora.com</a>
    </p>
    <p style="margin-top:8px;color:#cbd5e1;font-size:10px">This is an automated message. Please do not reply.</p>
  </div>
</div>
</body>
</html>`;

          const payload = {
            sender: { name: "Probfixora", email: gmailEmail },
            to: [{ email: email.toLowerCase().trim() }],
            subject: `Welcome to Probfixora — Your Account Has Been Created`,
            htmlContent: html,
          };

          const res = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const errorData = await res.text();
            console.error(`Brevo API error: ${errorData}`);
          } else {
            const result = await res.json();
            console.log(`✅ Onboarding email sent via Brevo to ${email}, Message ID: ${result.messageId}`);
          }
        }
      } catch (err) {
        console.error("Failed to send onboarding email:", err);
      }

      return jsonResponse({
        message: "User created successfully",
        user: {
          id: authData.user.id,
          name,
          email: authData.user.email,
          role,
          status: "active",
          isFirstLogin: true,
          employeeId,
        },
      }, 201);
    }

    // ── LIST ALL USERS ─────────────────────────────────────────────────────
    if (action === "list_users") {
      // Get from profiles (has role + status + employee_id)
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, name, full_name, role, status, is_active, employee_id, created_at");
      if (error) throw error;

      const profileMap = new Map();
      for (const p of profiles) profileMap.set(p.id, p);

      // Get emails from auth admin
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      
      const users = authUsers.map((u) => {
        const p = profileMap.get(u.id);
        const displayName = p?.name || p?.full_name || "Incomplete Account";
        const isActive = p?.is_active !== false && p?.status !== "inactive";
        return {
          id: u.id,
          name: displayName,
          email: u.email || "",
          role: p?.role || "sales",
          status: isActive ? "active" : "inactive",
          isFirstLogin: false,
          createdAt: u.created_at,
          employeeId: p?.employee_id || "N/A",
        };
      });

      return jsonResponse(users);
    }

    // ── UPDATE USER ────────────────────────────────────────────────────────
    if (action === "update_user") {
      const { userId, name, role, status } = body;
      if (!userId) return jsonResponse({ message: "userId required" }, 400);

      const updatePayload: Record<string, unknown> = {};
      if (name !== undefined) { updatePayload.name = name; updatePayload.full_name = name; }
      if (role !== undefined) updatePayload.role = role;
      if (status !== undefined) {
        updatePayload.status = status;
        updatePayload.is_active = status === "active";
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (error) throw error;

      // Also update auth user metadata if role/name changed
      if (name || role) {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { name, role },
        });
      }

      return jsonResponse({ message: "User updated successfully" });
    }

    // ── DELETE USER ────────────────────────────────────────────────────────
    if (action === "delete_user") {
      const { userId } = body;
      if (!userId) return jsonResponse({ message: "userId required" }, 400);

      // Delete profile first (auth cascade won't automatically delete profile)
      await supabase.from("profiles").delete().eq("id", userId);

      // Delete auth user
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      return jsonResponse({ message: "User deleted" });
    }

    // ── RESET PASSWORD ─────────────────────────────────────────────────────
    if (action === "reset_password") {
      const { userId, newPassword } = body;
      if (!userId || !newPassword) return jsonResponse({ message: "userId and newPassword required" }, 400);

      if (newPassword.length < 6) {
        return jsonResponse({ message: "Password must be at least 6 characters" }, 400);
      }

      const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) throw error;

      // Mark first login again if resetting
      await supabase.from("profiles").update({ is_first_login: true }).eq("id", userId);

      return jsonResponse({ message: "Password reset successfully" });
    }

    // ── MARK FIRST LOGIN COMPLETE ──────────────────────────────────────────
    if (action === "complete_first_login") {
      const authHeader = req.headers.get("Authorization");
      const token = (authHeader || "").replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return jsonResponse({ message: "Unauthorized" }, 401);

      await supabase.from("profiles").update({ is_first_login: false }).eq("id", user.id);
      return jsonResponse({ message: "First login marked complete" });
    }

    // ── UPDATE OWN NAME (any authenticated user) ───────────────────────────
    if (action === "update_own_name") {
      const authHeader = req.headers.get("Authorization");
      const token = (authHeader || "").replace("Bearer ", "");
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) return jsonResponse({ message: "Unauthorized" }, 401);

      const { name } = body;
      if (!name || !name.trim()) return jsonResponse({ message: "Name cannot be empty" }, 400);

      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("id", user.id);

      if (error) throw error;

      return jsonResponse({ message: "Name updated successfully" });
    }

    return jsonResponse({ message: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    const message = err.message || JSON.stringify(err) || "Internal error";
    const status = message.includes("Unauthorized") || message.includes("Admin") ? 403 : 500;
    return jsonResponse({ message, stack: err.stack }, status);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
