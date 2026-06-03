// supabase/functions/workflow/index.ts
// Handles ALL case operations — replaces Express caseController.js + caseRoutes.js
// Deploy: supabase functions deploy workflow

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logoBase64 } from "../quotation/logoBase64.ts";

// ─── Workflow configuration ───────────────────────────────────────────────────

const workflowStages = [
  "Sent to Sales",
  "Registration Done",
  "Phone Verification Done",
  "Bank & Finance",
  "Sent to Store",
  "Installation Started",
  "Govt Approvals Pending",
  "Plant Activated",
  "QA Verified",
  "Accounts Verified",
  "Sent to Subsidy",
  "Subsidy Registration Completed",
  "Post-Installation Service",
];

const stageToTeam: Record<string, string> = {
  "Sent to Sales": "Sales",
  "Registration Done": "Registration",
  "Phone Verification Done": "Registration",
  "Bank & Finance": "Banking",
  "Sent to Store": "Store",
  "Installation Started": "Field Installation",
  "Govt Approvals Pending": "Registration",
  "Plant Activated": "Field Installation",
  "QA Verified": "Quality Assurance",
  "Accounts Verified": "Accounts",
  "Sent to Subsidy": "Subsidy",
  "Subsidy Registration Completed": "Subsidy",
  "Post-Installation Service": "Customer Service",
};

const stageToAllowedRole: Record<string, string[]> = {
  "Sent to Sales": ["sales", "admin"],
  "Registration Done": ["registration", "admin"],
  "Phone Verification Done": ["registration", "admin"],
  "Bank & Finance": ["banking", "admin"],
  "Sent to Store": ["inventory", "admin"],
  "Installation Started": ["field_installation", "admin"],
  "Govt Approvals Pending": ["registration", "electrical", "admin"],
  "Plant Activated": ["field_installation", "admin"],
  "QA Verified": ["technical", "admin"],
  "Accounts Verified": ["accounts", "admin"],
  "Sent to Subsidy": ["subsidy", "admin"],
  "Subsidy Registration Completed": ["subsidy", "admin"],
  "Post-Installation Service": ["customer_service", "admin"],
};

// Build role → allowed stages map
const roleStageMap: Record<string, string[]> = {};
for (const [stage, roles] of Object.entries(stageToAllowedRole)) {
  for (const role of roles) {
    if (!roleStageMap[role]) roleStageMap[role] = [];
    roleStageMap[role].push(stage);
  }
}

// ─── CORS headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ─── Helper: verify JWT and get user profile ──────────────────────────────────
async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");

  // Get role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, status")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  if (profile.status === "inactive") throw new Error("Account is inactive");

  return { ...user, name: profile.name, role: profile.role?.toLowerCase() };
}

// ─── Document Masking Helper ────────────────────────────────────────────────────
function maskDocumentsForRole(role: string, docsObj: any) {
  if (!docsObj || typeof docsObj !== 'object') return {};
  const restrictedRoles = ['inventory', 'field_installation', 'electrical', 'store'];
  if (!restrictedRoles.includes(role)) return docsObj;

  const sensitiveKeywords = ['aadhar', 'pan', 'itr', 'salary', 'bank', 'form 16', 'gst', 'kyc'];
  const maskedDocs: any = {};

  for (const [key, value] of Object.entries(docsObj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeywords.some(kw => keyLower.includes(kw));
    if (!isSensitive) {
      maskedDocs[key] = value;
    }
  }
  return maskedDocs;
}

// ─── Case-Level Data Masking ─────────────────────────────────────────────────
// Strips fields from the case row that the given role is not authorized to see.
// Approved rules (2026-05-24):
//   inventory        → Customer Name ✓, Tracking ID, Load Required, Dispatch; NO phone, address, financials
//   field_installation → Customer Name ✓, Tracking ID, Address, Phone; NO financials, NO KYC docs
//   subsidy          → Customer Name, Subsidy fields, Aadhar/Bank Passbook/Electricity Bill; NO loan financials
//   banking / admin / registration → full access
function maskCaseDataForRole(role: string, caseRow: any): any {
  if (!caseRow || typeof caseRow !== 'object') return caseRow;
  // Full access roles — return as-is
  if (['admin', 'registration', 'banking', 'sales'].includes(role)) return caseRow;

  // Fields that are ALWAYS redacted for restricted roles
  const alwaysHidden: string[] = [];

  if (role === 'inventory') {
    // Inventory sees: customer_name, tracking_id, id, current_stage, assigned_team,
    //                 load_required, status, created_at, stage_start_time,
    //                 dispatch_items, handoff_note, documents (already masked by maskDocumentsForRole)
    // Hidden: phone, alternate_phone, address, pin_code, reference, consumer_id,
    //         all finance fields, subsidy fields
    alwaysHidden.push(
      'phone', 'alternate_phone', 'address', 'pin_code', 'reference', 'consumer_id',
      'payment_type', 'payment_mode', 'cash_amount', 'down_payment', 'loan_amount',
      'emi_amount', 'bank_name', 'lender_name', 'marked_delayed_by', 'marked_delayed_at',
      'delay_reason', 'loan_account_number', 'loan_tenure',
      'subsidy_ref_number', 'subsidy_phase1_amount', 'subsidy_phase2_amount', 'subsidy_note',
      'installation_note', 'site_visit_date',
    );
  } else if (role === 'field_installation') {
    // Installation sees: customer_name, tracking_id, id, current_stage, assigned_team,
    //                    load_required, status, address, phone, geo_location,
    //                    site_visit_date, installation_note, documents (masked)
    // Hidden: financials, subsidy, alternate_phone, pin_code, reference, consumer_id
    alwaysHidden.push(
      'alternate_phone', 'pin_code', 'reference', 'consumer_id',
      'payment_type', 'payment_mode', 'cash_amount', 'down_payment', 'loan_amount',
      'emi_amount', 'bank_name', 'lender_name', 'loan_account_number', 'loan_tenure',
      'marked_delayed_by', 'marked_delayed_at', 'delay_reason',
      'subsidy_ref_number', 'subsidy_phase1_amount', 'subsidy_phase2_amount', 'subsidy_note',
    );
  } else if (role === 'subsidy') {
    // Subsidy sees: customer_name, tracking_id, id, current_stage, status,
    //              consumer_id, load_required, subsidy_ref_number, subsidy amounts,
    //              documents (subsidy team needs Aadhar, Bank Passbook, Electricity Bill)
    // Hidden: internal loan financials, phone, address
    alwaysHidden.push(
      'phone', 'alternate_phone', 'address', 'pin_code', 'reference',
      'payment_type', 'payment_mode', 'cash_amount', 'down_payment', 'loan_amount',
      'emi_amount', 'bank_name', 'lender_name', 'loan_account_number', 'loan_tenure',
      'marked_delayed_by', 'marked_delayed_at', 'delay_reason',
      'installation_note', 'site_visit_date', 'dispatch_items', 'handoff_note',
    );
  }

  const masked: any = { ...caseRow };
  for (const field of alwaysHidden) {
    if (field in masked) masked[field] = null;
  }
  return masked;
}

// ─── Main server ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Create Supabase admin client (bypasses RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── PUBLIC: debug_schema ─────────────────────────────────────────────────
  const rawBody = await req.json().catch(() => ({}));
  if (rawBody.action === "debug_schema") {
    const { data, error } = await supabase.from('case_history').select('*').limit(2);
    // Let's just fix the bug! Remove updated_by_id!
    return new Response(JSON.stringify({ rows: data }), { headers: corsHeaders });
  }

  // ── PUBLIC: track_status ─────────────────────────────────────────────────
  if (rawBody.action === "track_status") {
    const trackingId = (rawBody.trackingId || rawBody.caseId || "").trim().toUpperCase();
    if (!trackingId) {
      return new Response(JSON.stringify({ message: "Tracking ID is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try tracking_id column first (RBSC-RAME-94721 format), fallback to case_id (CASE-0001)
    let data: any = null;
    let error: any = null;

    const byTrackingId = await supabase
      .from("cases")
      .select("id, tracking_id, current_stage, status")
      .eq("tracking_id", trackingId)
      .maybeSingle();

    if (byTrackingId.data) {
      data = byTrackingId.data;
    } else {
      const byCaseId = await supabase
        .from("cases")
        .select("id, tracking_id, current_stage, status")
        .eq("id", trackingId)
        .maybeSingle();
      data = byCaseId.data;
      error = byCaseId.error;
    }

    if (!data) {
      return new Response(JSON.stringify({ message: "Tracking ID not found. Please check the ID from your email and try again." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        case_id: data.id,
        tracking_id: data.tracking_id || data.id,
        current_stage: data.current_stage,
        status: data.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const user = await getUser(req, supabase);
    const body = rawBody;
    const action = body.action || "";

    // ── GET ALL CASES ──────────────────────────────────────────────────────
    if (action === "get_all") {
      let query = supabase.from("cases").select("*").order("created_at", { ascending: false });

      // Admin simulating an employee role — filter by that role's stages
      const effectiveRole = (user.role === "admin" && body.viewAsRole)
        ? body.viewAsRole.toLowerCase()
        : user.role;

      if (effectiveRole !== "admin") {
        if (effectiveRole === "registration" || effectiveRole === "banking" ||
            effectiveRole === "inventory"     || effectiveRole === "field_installation" ||
            effectiveRole === "subsidy"       || effectiveRole === "sales") {
          // These departments need full pipeline visibility:
          //   • Registration  — creates all cases, needs to track the whole journey
          //   • Banking       — tracks loan/cash approvals even after hand-off
          //   • Inventory     — dispatches goods; needs to see dispatched+completed cases too
          //   • Field Install — installs plants; needs to see installed+completed cases
          //   • Subsidy       — registers subsidies; needs to see subsidy+completed cases
          //   • Sales         — creates quotations; needs to see their customers progress
          // Sensitive docs are still masked per-role via maskDocumentsForRole.
          // No stage restriction here — all cases are visible.
        } else {
          // All other depts: strict stage-based — see only cases at their active stage
          const allowedStages = roleStageMap[effectiveRole] || [];
          if (allowedStages.length === 0) return jsonResponse([]);
          query = query.in("current_stage", allowedStages);
        }
      }

      if (body.stage) query = query.eq("current_stage", body.stage);
      if (body.team) query = query.eq("assigned_team", body.team);
      if (body.search) {
        query = query.or(`customer_name.ilike.%${body.search}%,id.ilike.%${body.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const maskedData = data.map((caseObj: any) => {
        const withMaskedDocs = {
          ...caseObj,
          documents: maskDocumentsForRole(effectiveRole, caseObj.documents),
        };
        return maskCaseDataForRole(effectiveRole, withMaskedDocs);
      });

      return jsonResponse(maskedData);
    }

    // ── GET ONE CASE ───────────────────────────────────────────────────────
    if (action === "get_one") {
      const { data: caseData, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", body.caseId)
        .single();
      if (error) return jsonResponse({ message: "Case not found" }, 404);

      // RBAC check:
      // - Admin: unrestricted
      // - Registration: can READ any case (full pipeline visibility); write enforced in update_stage
      // - Others: can read cases AT their stage OR that have already PASSED their last stage
      //   (so departments can open the drawer for cases in their "Completed" tab)
      if (user.role !== "admin" && user.role !== "registration") {
        const myStages = (roleStageMap[user.role] || []);
        const myLastStageIdx = Math.max(
          ...myStages.map((s: string) => workflowStages.indexOf(s))
        );
        const caseStageIdx = workflowStages.indexOf(caseData.current_stage);
        // Allow access if:
        //   a) case is currently at one of my stages, OR
        //   b) case has passed my last stage (I've already handed it off — read-only)
        const canRead = myStages.includes(caseData.current_stage) ||
                        (myLastStageIdx >= 0 && caseStageIdx > myLastStageIdx);
        if (!canRead) {
          return jsonResponse({ message: "Access restricted to your department's cases." }, 403);
        }
      }

      const { data: history } = await supabase
        .from("case_history")
        .select("*")
        .eq("case_id", body.caseId)
        .order("timestamp", { ascending: true });  // chronological order

      const { data: comments } = await supabase
        .from("case_comments")
        .select("*")
        .eq("case_id", body.caseId)
        .order("created_at", { ascending: false });

      caseData.documents = maskDocumentsForRole(user.role, caseData.documents);
      const maskedCase   = maskCaseDataForRole(user.role, caseData);

      return jsonResponse({ case: maskedCase, history: history || [], comments: comments || [] });
    }

    // ── CREATE CASE ────────────────────────────────────────────────────────
    if (action === "create_case") {
      if (user.role !== "registration" && user.role !== "admin") {
        return jsonResponse({ message: "Only Registration department can create cases" }, 403);
      }

      const { data: newCase, error } = await supabase
        .from("cases")
        .insert({
          customer_name: body.customerName,
          phone: body.phone,
          alternate_phone: body.alternatePhone || "",
          address: body.address,
          reference: body.reference || "",
          consumer_id: body.consumerId || "",
          pin_code: body.pinCode || "",
          load_required: body.loadRequired,
          payment_type: body.paymentType || 'cash',
          current_stage: "Registration Done",
          assigned_team: "Registration",
          stage_start_time: new Date().toISOString(),
          created_by: user.id,
          sales_person: body.salesPerson || user.name,
          system_specs: body.systemSpecs || {},
          documents: body.documents || {}
        })
        .select()
        .single();

      if (error) throw error;

      // ── Generate & save branded tracking_id ──────────────────────────────
      const customerName   = body.customerName || "";
      const nameSlug       = customerName.replace(/\s+/g, "").toUpperCase().replace(/[^A-Z]/g, "").substring(0, 4).padEnd(4, "X");
      const randomDigits   = String(Math.floor(10000 + Math.random() * 90000));
      const trackingIdVal  = `RBSC-${nameSlug}-${randomDigits}`; // e.g. RBSC-RAME-94721

      // ── Generate Customer ID: [NAME4]-[DDMMYYYY]-[XXXXX] ─────────────────
      const now            = new Date();
      const dd   = String(now.getDate()).padStart(2, "0");
      const mm   = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = String(now.getFullYear());
      const custRandom     = String(Math.floor(10000 + Math.random() * 90000));
      const customerIdVal  = `${nameSlug}-${dd}${mm}${yyyy}-${custRandom}`; // e.g. RAME-23052026-94721
      // ─────────────────────────────────────────────────────────────────────

      // Store tracking_id and customer_id in the cases table
      await supabase.from("cases").update({
        tracking_id: trackingIdVal,
        customer_id: customerIdVal,
      }).eq("id", newCase.id);
      // ─────────────────────────────────────────────────────────────────────

      // Create history entry with department
      await supabase.from("case_history").insert({
        case_id: newCase.id,
        stage: "Registration Done",
        department: "Registration",
        updated_by: user.name,
        action_type: "case_created",
        remarks: "Customer Registered",
      });

      // ── NOTE: Tracking ID email is NOT sent here. ─────────────────────────
      // It will be sent automatically when Registration department moves the
      // case from "Registration Done" → "Phone Verification Done" (after they
      // verify documents and are about to call the customer).
      // ─────────────────────────────────────────────────────────────────────

      return jsonResponse(newCase, 201);
    }

    // ── UPDATE STAGE ───────────────────────────────────────────────────────
    if (action === "update_stage") {
      const { data: caseObj, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", body.caseId)
        .single();
      if (error) return jsonResponse({ message: "Case not found" }, 404);

      const currentStageRaw = caseObj.current_stage?.trim();
      const normalizedStage = workflowStages.find(
        (s) => s.toLowerCase() === currentStageRaw.toLowerCase()
      );
      if (!normalizedStage) return jsonResponse({ message: `Invalid workflow state: "${currentStageRaw}"` }, 400);

      const currentIndex = workflowStages.indexOf(normalizedStage);

      // ── DOCUMENT GATE: Registration Done → next stage requires all docs Verified ──
      if (normalizedStage === "Registration Done" || normalizedStage === "Phone Verification Done") {
        const docStatuses = caseObj.document_statuses || {};
        const docs = caseObj.documents || {};
        const unverified = Object.keys(docs).filter(
          (docName) => (docStatuses[docName] || "Yellow") !== "Green"
        );
        if (unverified.length > 0) {
          return jsonResponse({
            message: "Document not verified kindly verify first then proceed",
            unverifiedDocs: unverified,
          }, 400);
        }
      }
      // ──────────────────────────────────────────────────────────────────────


      // RBAC check
      const allowedRoles = stageToAllowedRole[normalizedStage] || [];
      if (user.role !== "admin" && !allowedRoles.includes(user.role)) {
        return jsonResponse({
          message: `Unauthorized: Your role (${user.role}) cannot update cases at "${normalizedStage}"`,
        }, 403);
      }

      if (currentIndex === workflowStages.length - 1) {
        return jsonResponse({ message: "Case is already at final stage" }, 400);
      }

      const expectedNextStage = workflowStages[currentIndex + 1];
      if (expectedNextStage.toLowerCase() !== body.newStage?.trim().toLowerCase()) {
        return jsonResponse({
          message: `Invalid transition. From ${normalizedStage}, you can only move to ${expectedNextStage}`,
        }, 400);
      }

      const isSubsidyComplete = expectedNextStage === "Subsidy Registration Completed";

      const newStatus = (expectedNextStage === "Post-Installation Service" || isSubsidyComplete)
        ? "Completed"
        : (caseObj.status === "Delayed" && caseObj.marked_delayed_at ? "Delayed" : "In Progress");

      const finalStage = isSubsidyComplete ? "Post-Installation Service" : expectedNextStage;
      const finalTeam  = stageToTeam[finalStage] || "Admin";

      const { data: updated, error: updateError } = await supabase
        .from("cases")
        .update({
          current_stage:   finalStage,
          assigned_team:   finalTeam,
          stage_start_time: new Date().toISOString(),
          status:          newStatus,
          // ── Escalation timer reset ───────────────────────────────────────────
          // Reset stage_entered_at so the pg_cron escalation job calculates
          // staleness from when the case arrived at this new stage, not creation.
          // Also reset escalation_level to 0 (clean slate for new department).
          stage_entered_at:  new Date().toISOString(),
          escalation_level:  0,
          // ────────────────────────────────────────────────────────────────────
        })
        .eq("id", body.caseId)
        .select()
        .single();

      if (updateError) throw updateError;

      // History: log the stage transition with department info
      const historyStage = isSubsidyComplete ? "Subsidy Registration Completed" : caseObj.current_stage;
      const historyDept  = stageToTeam[historyStage] || "Unknown";
      await supabase.from("case_history").insert({
        case_id:        caseObj.id,
        stage:          historyStage,
        department:     historyDept,
        updated_by:     user.name,
        action_type:    "stage_update",
        remarks:        isSubsidyComplete
          ? (body.remarks || "Subsidy Registration Completed")
          : body.remarks,
      });

      // If subsidy complete, add a second history entry marking as Completed
      if (isSubsidyComplete) {
        await supabase.from("case_history").insert({
          case_id:        caseObj.id,
          stage:          "Post-Installation Service",
          department:     "Customer Service",
          updated_by:     "System (Auto)",
          action_type:    "system_auto",
          remarks:        "Customer automatically handed over to Post-Installation Service after Subsidy Registration",
        });
      }

      // ── SEND TRACKING ID EMAIL when Registration verifies docs (Registration Done → Phone Verification Done) ──
      if (normalizedStage === "Registration Done" && finalStage === "Phone Verification Done") {
        const sendTrackingEmail = async (): Promise<void> => {
          try {
            const brevoApiKey  = Deno.env.get("BREVO_API_KEY");
            const senderEmail  = Deno.env.get("GMAIL_EMAIL");
            const customerEmail = caseObj.email || "";

            if (!brevoApiKey || !senderEmail || !customerEmail) {
              console.warn(`[tracking_email] Missing config or email for case ${caseObj.id} — skipping.`);
              return;
            }

            const trackingId   = updated.tracking_id || caseObj.tracking_id || "";
            const customerName = caseObj.customer_name || "Customer";
            const registeredOn = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
            const trackingUrl  = `https://internship-project-nu-bay.vercel.app/track?id=${encodeURIComponent(trackingId)}`;

            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Registration Successful — RBSC Solar</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;background:#f0f4f8;color:#1a202c}
    .wrapper{max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)}
    .header{background:linear-gradient(135deg,#1a1a5e,#2563EB);padding:32px 24px;text-align:center}
    .logo{font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px}
    .logo span{color:#60a5fa}
    .header h1{color:#fff;font-size:20px;font-weight:700;margin-top:12px;line-height:1.3}
    .body{padding:32px 28px}
    .tracking-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #3b82f6;border-radius:10px;padding:20px;text-align:center;margin:24px 0}
    .tracking-id{font-size:28px;font-weight:800;color:#1d4ed8;letter-spacing:2px;font-family:monospace}
    .track-btn{display:inline-block;margin-top:14px;background:#2563EB;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
    .steps{width:100%;border-collapse:collapse;margin:24px 0;table-layout:fixed}
    .step{text-align:center;padding:0 2px}
    .step-dot{width:32px;height:32px;border-radius:50%;background:#2563EB;color:#fff;font-weight:700;font-size:13px;line-height:32px;margin:0 auto 6px}
    .step-label{font-size:11px;color:#64748b;font-weight:600;word-wrap:break-word}
    .help{background:#f8fafc;border-radius:8px;padding:16px;font-size:13px;color:#475569;margin-top:20px;line-height:1.6}
    .footer{background:#1e293b;padding:20px 24px;text-align:center}
    .footer-logo{font-size:16px;font-weight:800;color:#fff;margin-bottom:8px}
    .footer-logo span{color:#60a5fa}
    .footer p{color:#94a3b8;font-size:12px;line-height:1.7}
    .footer a{color:#60a5fa;text-decoration:none}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo">RBSC <span>Solar</span></div>
    <h1>🎉 Registration Successful!</h1>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#334155;line-height:1.7">Dear <strong>${customerName}</strong>,</p>
    <p style="font-size:14px;color:#475569;margin-top:12px;line-height:1.7">
      Your solar project has been registered with RBSC Solar. Our team has verified your documents and your case is now officially in our system.
    </p>
    <div class="tracking-box">
      <p style="font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Your Tracking ID</p>
      <div class="tracking-id">${trackingId}</div>
      <p style="font-size:12px;color:#6b7280;margin-top:8px">Registered on ${registeredOn}</p>
      <a href="${trackingUrl}" class="track-btn">Track My Project →</a>
    </div>
    <p style="font-size:13px;color:#475569;line-height:1.7">You can use this Tracking ID anytime to check the real-time status of your solar installation project.</p>
    <table class="steps">
      <tr>
        <td class="step"><div class="step-dot">1</div><div class="step-label">Registered</div></td>
        <td class="step"><div class="step-dot">2</div><div class="step-label">Finance</div></td>
        <td class="step"><div class="step-dot">3</div><div class="step-label">Material</div></td>
        <td class="step"><div class="step-dot">4</div><div class="step-label">Installation</div></td>
        <td class="step"><div class="step-dot">5</div><div class="step-label">Subsidy</div></td>
        <td class="step"><div class="step-dot">6</div><div class="step-label">Completed</div></td>
      </tr>
    </table>
    <div class="help">
      <strong>Need Help?</strong> Contact us at <strong>info@rbscsolar.com</strong> and quote your Tracking ID <strong>${trackingId}</strong>.
    </div>
    <p style="font-size:13px;color:#4a5568;line-height:1.7;margin-top:24px">Warm regards,<br/><strong style="color:#1a1a5e">RBSC Solar Team</strong><br/><span style="color:#94a3b8;font-size:12px">Lucknow, Uttar Pradesh, India</span></p>
  </div>
  <div class="footer">
    <div class="footer-logo">RBSC <span>Solar</span></div>
    <p>© ${new Date().getFullYear()} RBSC Associates. All rights reserved.<br/>Office No. 11, Bhopal House Lalbagh, Hazratganj, Lucknow 226001<br/><a href="https://rbscsolar.com">rbscsolar.com</a> &nbsp;|&nbsp; <a href="mailto:info@rbscsolar.com">info@rbscsolar.com</a></p>
    <p style="margin-top:8px;color:#cbd5e1;font-size:10px">This is an automated message. Please do not reply to this email.</p>
  </div>
</div>
</body>
</html>`;

            const payload = {
              sender:      { name: "RBSC Solar", email: senderEmail },
              to:          [{ email: customerEmail, name: customerName }],
              subject:     `Registration Confirmed — Your Tracking ID: ${trackingId}`,
              htmlContent,
            };

            const res = await fetch("https://api.brevo.com/v3/smtp/email", {
              method:  "POST",
              headers: { "api-key": brevoApiKey, "Content-Type": "application/json", "Accept": "application/json" },
              body:    JSON.stringify(payload),
            });

            if (!res.ok) {
              console.error(`[tracking_email] Brevo API error for case ${caseObj.id}: ${await res.text()}`);
            } else {
              const result = await res.json();
              console.log(`[tracking_email] ✅ Tracking ID email sent to ${customerEmail}. messageId: ${result.messageId}`);
            }
          } catch (emailErr) {
            console.error(`[tracking_email] Failed for case ${caseObj.id}:`, emailErr);
          }
        };

        // @ts-ignore
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(sendTrackingEmail());
        } else {
          sendTrackingEmail();
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      // ── AUTO-INVENTORY DEDUCTION FOR "Sent to Store" ────────────────────
      if (finalStage === "Sent to Store") {
        try {
          let specs = caseObj.system_specs;
          if (!specs || Object.keys(specs).length === 0) {
            const { data: quot } = await supabase
              .from("quotations")
              .select("*")
              .ilike("customer_name", caseObj.customer_name)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (quot) {
              specs = {
                productCategory: quot.product_category,
                panelCount: quot.panel_count,
                inverterBrand: quot.inverter_brand,
                inverterKw: quot.inverter_kw,
                batteryBrand: quot.battery_brand,
                batteryCount: quot.battery_count,
                structure: quot.structure,
                bos: quot.bos,
              };
            }
          }

          if (specs) {
            // Find inventory items roughly matching the specs
            const { data: invItems } = await supabase.from("inventory").select("*").eq("is_active", true);
            const itemsToDeduct = [];
            
            if (invItems) {
              // 1. Panels
              if (specs.panelCount) {
                const panel = invItems.find((i: any) => i.category?.toLowerCase() === 'solar panel');
                if (panel) itemsToDeduct.push({ item: panel, qty: Number(specs.panelCount) });
              }
              // 2. Inverter
              if (specs.inverterBrand) {
                const inv = invItems.find((i: any) => i.category?.toLowerCase() === 'inverter' && i.brand?.toLowerCase() === specs.inverterBrand?.toLowerCase())
                            || invItems.find((i: any) => i.category?.toLowerCase() === 'inverter');
                if (inv) itemsToDeduct.push({ item: inv, qty: 1 }); // usually 1 inverter
              }
              // 3. Battery
              if (specs.batteryBrand && specs.batteryCount) {
                const bat = invItems.find((i: any) => i.category?.toLowerCase() === 'battery' && i.brand?.toLowerCase() === specs.batteryBrand?.toLowerCase())
                            || invItems.find((i: any) => i.category?.toLowerCase() === 'battery');
                if (bat) itemsToDeduct.push({ item: bat, qty: Number(specs.batteryCount) });
              }

              // Deduct and log
              for (const { item, qty } of itemsToDeduct) {
                if (qty > 0) {
                  const newStock = Math.max(0, (item.stock || 0) - qty);
                  const newRes = (item.reserved_quantity || 0) + qty;
                  await supabase.from("inventory").update({ stock: newStock, reserved_quantity: newRes }).eq("id", item.id);
                  
                  // Transaction log
                  await supabase.from("inventory_transactions").insert({
                    inventory_id: item.id,
                    inventory_name: item.name,
                    case_id: caseObj.id,
                    transaction_type: "reservation",
                    quantity: -qty,
                    stock_before: item.stock,
                    stock_after: newStock,
                    notes: `Auto-reserved for case ${caseObj.id}`,
                    created_by: "System (Auto)",
                    created_by_role: "system",
                  });
                }
              }

              // Log auto-deduction in case history
              if (itemsToDeduct.length > 0) {
                await supabase.from("case_history").insert({
                  case_id: caseObj.id,
                  stage: "Sent to Store",
                  department: "Inventory",
                  updated_by: "System (Auto)",
                  action_type: "system_auto",
                  remarks: "Inventory automatically calculated and reserved based on system specs.",
                });
              }
            }
          }
        } catch (e) {
          console.error("Auto inventory deduction failed:", e);
        }
      }
      // ── SEND COMPLETION EMAIL ───────────────────────────────────────────────
      if (finalStage === "Completed") {
        const sendCompletionEmail = async () => {
          const brevoApiKey = Deno.env.get("BREVO_API_KEY");
          const senderEmail = Deno.env.get("GMAIL_EMAIL");
          const customerEmail = caseObj.email;
          const customerName = caseObj.customer_name;
          
          if (!brevoApiKey || !senderEmail || !customerEmail) return;

          const htmlContent = `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;font-family:'Inter',sans-serif;background-color:#f8fafc;">
            <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
              <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:40px 20px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:24px;">Project Completed Successfully!</h1>
              </div>
              <div style="padding:40px 32px;">
                <p style="font-size:16px;color:#334155;margin-top:0;">Dear ${customerName},</p>
                <p style="font-size:15px;color:#475569;line-height:1.6;">
                  We are thrilled to announce that your solar plant installation and all associated processes (including Govt Approvals and Subsidy Registration) have been successfully completed!
                </p>
                <p style="font-size:15px;color:#475569;line-height:1.6;">
                  Thank you for choosing RBSC Solar. You are now officially generating clean, renewable energy. Our Customer Service team will reach out to you every 3 months for a routine check-in and feedback.
                </p>
                <p style="font-size:15px;color:#475569;line-height:1.6;">
                  If you have any questions or require support, please don't hesitate to contact us.
                </p>
                <p style="font-size:13px;color:#4a5568;line-height:1.7;margin-top:30px;">
                  Warm regards,<br/>
                  <strong style="color:#1a1a5e">RBSC Solar Team</strong><br/>
                  Lucknow, Uttar Pradesh, India
                </p>
              </div>
            </div>
          </body>
          </html>`;

          try {
            await fetch("https://api.brevo.com/v3/smtp/email", {
              method: "POST",
              headers: { "api-key": brevoApiKey, "Content-Type": "application/json", "Accept": "application/json" },
              body: JSON.stringify({
                sender: { name: "RBSC Solar", email: senderEmail },
                to: [{ email: customerEmail, name: customerName }],
                subject: `Congratulations! Your RBSC Solar Project is Complete`,
                htmlContent,
              }),
            });
          } catch (e) {
            console.error("Completion email failed:", e);
          }
        };

        // @ts-ignore
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(sendCompletionEmail());
        } else {
          sendCompletionEmail();
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      return jsonResponse(updated);
    }


    // ── MARK / UNMARK DELAYED ─────────────────────────────────────────────
    if (action === "mark_delayed") {
      const { data: caseObj, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", body.caseId)
        .single();
      if (error) return jsonResponse({ message: "Case not found" }, 404);

      let updatePayload: Record<string, unknown>;
      if (body.unmark) {
        updatePayload = {
          status: "In Progress",
          delay_reason: "",
          marked_delayed_by: "",
          marked_delayed_at: null,
        };
      } else {
        if (!body.reason?.trim()) return jsonResponse({ message: "A delay reason is required." }, 400);
        updatePayload = {
          status: "Delayed",
          delay_reason: body.reason.trim(),
          marked_delayed_by: user.name,
          marked_delayed_at: new Date().toISOString(),
        };
      }

      const { data: updated, error: updateError } = await supabase
        .from("cases")
        .update(updatePayload)
        .eq("id", body.caseId)
        .select()
        .single();

      if (updateError) throw updateError;

      await supabase.from("case_history").insert({
        case_id: caseObj.id,
        stage: caseObj.current_stage,
        updated_by: user.name,
        action_type: body.unmark ? "delay_cleared" : "delay_flagged",
        remarks: body.unmark ? "Delay flag removed" : `Marked as Delayed: ${body.reason.trim()}`,
      });

      return jsonResponse(updated);
    }

    // ── ADD COMMENT ────────────────────────────────────────────────────────
    if (action === "add_comment") {
      if (!body.text?.trim()) return jsonResponse({ message: "Comment text is required." }, 400);

      const insertPayload: Record<string, unknown> = {
        case_id:      body.caseId,
        text:         body.text.trim(),
        author:       user.name,
        role:         user.role,
        // New fields — both optional; defaults handled by migration column defaults
        comment_type: body.comment_type || "note",
        parent_id:    body.parent_id || null,
      };

      const { data: comment, error } = await supabase
        .from("case_comments")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(comment, 201);
    }

    // ── GET COMMENTS ───────────────────────────────────────────────────────
    if (action === "get_comments") {
      const { data, error } = await supabase
        .from("case_comments")
        .select("*")
        .eq("case_id", body.caseId)   // Fixed: was filtering by id, now by case_id
        .order("created_at", { ascending: true }); // Oldest first so thread tree builds correctly
      if (error) throw error;
      return jsonResponse(data || []);
    }

    // ── LOG DOWNLOAD (audit trail for PDF downloads) ────────────────────────
    if (action === "log_download") {
      if (!body.caseId) return jsonResponse({ message: "caseId is required" }, 400);
      const { error } = await supabase.from("case_history").insert({
        case_id:     body.caseId,
        stage:       body.stage    || "N/A",
        department:  body.dept     || user.role,
        updated_by:  user.name,
        action_type: "download_details",
        remarks:     `PDF case details downloaded by ${user.name} (${user.role})`,
      });
      if (error) throw error;
      return jsonResponse({ ok: true });
    }


    // ── UPDATE CASE DETAILS ────────────────────────────────────────────────
    if (action === "update_details") {
      const allowedFields: Record<string, string> = {
        loanAmount: "loan_amount",
        handoffNote: "handoff_note",
        assignedTo: "assigned_to",
        siteVisitDate: "site_visit_date",
        installationNote: "installation_note",
        subsidyRefNumber: "subsidy_ref_number",
        subsidyNote: "subsidy_note",
        documentStatuses: "document_statuses",
      };

      const updatePayload: Record<string, unknown> = {};
      for (const [jsKey, dbKey] of Object.entries(allowedFields)) {
        if (body[jsKey] !== undefined) {
           if (body[jsKey] === "" && dbKey === "site_visit_date") {
              updatePayload[dbKey] = null;
           } else {
              updatePayload[dbKey] = body[jsKey];
           }
        }
      }

      const { data: updated, error } = await supabase
        .from("cases")
        .update(updatePayload)
        .eq("id", body.caseId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(updated);
    }


    // ── UPDATE FINANCE ─────────────────────────────────────────────────────
    if (action === "update_finance") {
      if (user.role !== "admin" && user.role !== "banking") {
        return jsonResponse({ message: "Unauthorized: Only Banking & Finance or Admin can update finance details." }, 403);
      }

      const allowedFields: Record<string, string> = {
        paymentType: "payment_type",
        downPayment: "down_payment",
        cashAmount: "cash_amount",
        paymentMode: "payment_mode",
        loanAmount: "loan_amount",
        emiAmount: "emi_amount",
        bankName: "bank_name",
        bankVisitedDate: "bank_visited_date",
        financeFormStatus: "finance_form_status",
        financeFinalStatus: "finance_final_status",
        disbursementDetails: "disbursement_details",
        financeNotes: "finance_notes",
      };

      const updatePayload: Record<string, unknown> = {};
      for (const [jsKey, dbKey] of Object.entries(allowedFields)) {
        if (body[jsKey] !== undefined) {
          if (body[jsKey] === "") {
             if (dbKey === "bank_visited_date") {
                updatePayload[dbKey] = null;
             } else {
                updatePayload[dbKey] = ["down_payment", "cash_amount", "loan_amount", "emi_amount"].includes(dbKey) ? 0 : "";
             }
          } else if (dbKey === "payment_type") {
             updatePayload[dbKey] = String(body[jsKey]).toLowerCase();
          } else {
             updatePayload[dbKey] = ["down_payment", "cash_amount", "loan_amount", "emi_amount"].includes(dbKey) 
               ? Number(body[jsKey]) 
               : body[jsKey];
          }
        }
      }

      const pType = String(body.paymentType || "").toLowerCase();
      if (pType === "cash") {
        updatePayload.loan_amount = 0;
        updatePayload.emi_amount = 0;
        updatePayload.bank_name = "";
      } else if (pType === "loan") {
        updatePayload.cash_amount = 0;
        updatePayload.payment_mode = "";
      }

      const { data: updated, error } = await supabase
        .from("cases")
        .update(updatePayload)
        .eq("id", body.caseId)
        .select()
        .single();

      if (error) throw error;
      
      await supabase.from("case_history").insert({
        case_id: body.caseId,
        stage: updated.current_stage,
        updated_by: user.name,
        action_type: "finance_update",
        remarks: body.remarks || `Updated financial details.`,
      });
      
      return jsonResponse(updated);
    }

    // ── GET INVENTORY ───────────────────────────────────────────
    if (action === "get_inventory") {
      const { data: invData, error: invErr } = await supabase
        .from("inventory").select("*").order("name");
      if (invErr) throw invErr;

      // Also fetch quotation specs for the given case (to auto-populate dispatch)
      let quotationSpecs = null;
      const { caseId: qCaseId } = body;
      if (qCaseId) {
        const { data: caseRow } = await supabase
          .from("cases")
          .select("customer_name, system_specs")
          .or(`id.eq.${qCaseId},case_id.eq.${qCaseId}`)
          .maybeSingle();

        if (caseRow) {
          // Prefer system_specs if already filled
          const ss = caseRow.system_specs;
          if (ss && typeof ss === 'object' && Object.keys(ss).length > 0) {
            quotationSpecs = ss;
          } else if (caseRow.customer_name) {
            // Fall back to quotations table (most recent quotation for this customer)
            const { data: quot } = await supabase
              .from("quotations")
              .select("product_name, panel_count, panel_unit, inverter_brand, inverter_kw, battery_brand, battery_count, battery_capacity, structure, bos, product_category")
              .ilike("customer_name", caseRow.customer_name)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (quot) {
              quotationSpecs = {
                productName:     quot.product_name,
                productCategory: quot.product_category,
                panelCount:      quot.panel_count,
                panelUnit:       quot.panel_unit,
                inverterBrand:   quot.inverter_brand,
                inverterKw:      quot.inverter_kw,
                batteryBrand:    quot.battery_brand,
                batteryCount:    quot.battery_count,
                batteryCapacity: quot.battery_capacity,
                structure:       quot.structure,
                bos:             quot.bos,
              };
            }
          }
        }
      }

      return jsonResponse({ inventory: invData, quotationSpecs });
    }

    // ── DISPATCH MATERIALS ──────────────────────────────────────────────────
    if (action === "dispatch_materials") {
      if (user.role !== "admin" && user.role !== "store" && user.role !== "inventory") {
        return jsonResponse({ message: "Unauthorized: Only Store/Inventory or Admin can dispatch materials." }, 403);
      }

      const { caseId, items, vehicleNumber, driverName, notes } = body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return jsonResponse({ message: "No items to dispatch." }, 400);
      }

      for (const item of items) {
        const { data: invItem } = await supabase.from("inventory").select("stock").eq("id", item.id).single();
        if (invItem) {
          const newStock = Math.max(0, invItem.stock - item.quantity);
          await supabase.from("inventory").update({ stock: newStock }).eq("id", item.id);
        }
      }

      const { data: dispatchRecord, error: dispatchError } = await supabase
        .from("inventory_dispatches")
        .insert({
          case_id: caseId,
          dispatched_by: user.name,
          dispatched_by_role: user.role,
          status: "Dispatched",
          vehicle_number: vehicleNumber || "",
          driver_name: driverName || "",
          notes: notes || "",
          dispatched_items: items
        })
        .select()
        .single();

      if (dispatchError) throw dispatchError;

      await supabase.from("case_history").insert({
        case_id: caseId,
        stage: "Sent to Store",
        updated_by: user.name,
        action_type: "dispatch",
        remarks: `Dispatched materials via vehicle ${vehicleNumber || 'N/A'}.`,
      });

      return jsonResponse(dispatchRecord);
    }

    // ── ASSIGN CASE ────────────────────────────────────────────────────────
    if (action === "assign") {
      const { data: caseObj } = await supabase
        .from("cases")
        .select("id, current_stage")
        .eq("id", body.caseId)
        .single();
      if (!caseObj) return jsonResponse({ message: "Case not found." }, 404);

      const { data: updated, error } = await supabase
        .from("cases")
        .update({ assigned_to: body.assignedTo || "" })
        .eq("id", body.caseId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("case_history").insert({
        case_id: body.caseId,
        stage: caseObj.current_stage,
        updated_by: user.name,
        action_type: "assignment_changed",
        remarks: body.assignedTo ? `Case assigned to ${body.assignedTo}` : "Assignment removed",
      });

      return jsonResponse(updated);
    }

    // ── TOGGLE PRIORITY ────────────────────────────────────────────────────
    if (action === "toggle_priority") {
      const { data: caseObj } = await supabase
        .from("cases")
        .select("priority")
        .eq("id", body.caseId)
        .single();
      if (!caseObj) return jsonResponse({ message: "Case not found." }, 404);

      const newPriority = caseObj.priority === "urgent" ? "normal" : "urgent";
      await supabase.from("cases").update({ priority: newPriority }).eq("id", body.caseId);
      return jsonResponse({ priority: newPriority });
    }

    // ── DELETE CASE ────────────────────────────────────────────────────────
    if (action === "delete") {
      const { data: caseObj } = await supabase
        .from("cases")
        .select("current_stage, created_by")
        .eq("id", body.caseId)
        .single();
      if (!caseObj) return jsonResponse({ message: "Case not found." }, 404);

      if (caseObj.current_stage !== "Registration Done") {
        return jsonResponse({ message: "Case can only be deleted at the Registration Done stage." }, 403);
      }

      const isAdmin = user.role === "admin";
      const isCreator = caseObj.created_by === user.id;
      if (!isAdmin && !isCreator) {
        return jsonResponse({ message: "Only the admin or the case creator can delete this case." }, 403);
      }

      await supabase.from("cases").delete().eq("id", body.caseId);
      await supabase.from("case_history").delete().eq("case_id", body.caseId);
      await supabase.from("case_comments").delete().eq("case_id", body.caseId);
      return jsonResponse({ message: "Case deleted." });
    }

    // ── TOGGLE CHECKLIST ──────────────────────────────────────────────────
    if (action === "toggle_checklist") {
      const { data: caseObj } = await supabase
        .from("cases")
        .select("*")
        .eq("id", body.caseId)
        .single();
      if (!caseObj) return jsonResponse({ message: "Case not found." }, 404);

      const listName = body.listName;
      const itemId = body.itemId;
      const checklist = caseObj[listName] || [];
      const updatedList = checklist.map((item: any) =>
        item._id === itemId
          ? { ...item, checked: !item.checked, checkedBy: !item.checked ? user.name : null }
          : item
      );

      await supabase.from("cases").update({ [listName]: updatedList }).eq("id", body.caseId);
      return jsonResponse(updatedList);
    }

    // ── SUBMIT CUSTOMER FEEDBACK (admin only) ──────────────────────────────
    if (action === "submit_feedback") {
      if (user.role !== "admin") return jsonResponse({ message: "Forbidden" }, 403);

      const { caseId, customerName, rating, feedback_text, installation_quality,
              team_behavior, timeline_satisfaction, submitted_by } = body;

      if (!caseId)             return jsonResponse({ message: "caseId required" }, 400);
      if (!rating || rating < 1 || rating > 5)
        return jsonResponse({ message: "rating must be 1-5" }, 400);

      const { data, error } = await supabase
        .from("customer_feedback")
        .insert({
          case_id:               caseId,
          customer_name:         customerName || "",
          rating:                Number(rating),
          feedback_text:         feedback_text || "",
          installation_quality:  installation_quality ? Number(installation_quality) : null,
          team_behavior:         team_behavior ? Number(team_behavior) : null,
          timeline_satisfaction: timeline_satisfaction ? Number(timeline_satisfaction) : null,
          submitted_by:          submitted_by || "admin",
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return jsonResponse(data);
    }

    // ── GET FEEDBACK FOR A CASE (admin only) ───────────────────────────────
    if (action === "get_feedback") {
      if (user.role !== "admin") return jsonResponse({ message: "Forbidden" }, 403);

      const { caseId } = body;
      if (!caseId) return jsonResponse({ message: "caseId required" }, 400);

      const { data, error } = await supabase
        .from("customer_feedback")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return jsonResponse(data || []);
    }

    return jsonResponse({ message: "Unknown action" }, 400);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : (err as any).message || "Internal error";
    const status = message.includes("Unauthorized") || message.includes("inactive") ? 401 : 500;
    return jsonResponse({ message, details: err }, status);
  }
});

// ─── JSON response helper ──────────────────────────────────────────────────────
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
