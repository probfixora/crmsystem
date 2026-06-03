// supabase/functions/analytics/index.ts
// Replaces Express analytics routes — getStats, getPipeline, getPerformance, getOverdue,
// getMonthlySummary, getActivity, employee_stats, dept_overview, lead_tracking
// Deploy: supabase functions deploy analytics

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Visual pipeline stages for lead tracking UI (ordered, display-friendly)
const pipelineStages = [
  { key: "Sent to Sales",                  label: "Sales Review",  dept: "sales" },
  { key: "Registration Done",              label: "Registration",  dept: "registration" },
  { key: "Phone Verification Done",        label: "Verification",  dept: "registration" },
  { key: "Bank & Finance",                 label: "Banking",       dept: "banking" },
  { key: "Sent to Store",                  label: "Inventory",     dept: "inventory" },
  { key: "Installation Started",           label: "Installation",  dept: "field_installation" },
  { key: "Govt Approvals Pending",         label: "Govt Approval", dept: "registration" },
  { key: "Plant Activated",                label: "Plant Active",  dept: "field_installation" },
  { key: "QA Verified",                    label: "QA Check",      dept: "technical_qa" },
  { key: "Accounts Verified",              label: "Accounting",    dept: "accountant" },
  { key: "Sent to Subsidy",                label: "Subsidy",       dept: "subsidy" },
  { key: "Subsidy Registration Completed", label: "Subsidy Done",  dept: "subsidy" },
  { key: "Post-Installation Service",      label: "Completed",     dept: "customer_service" },
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

const roleStageMap: Record<string, string[]> = {};
for (const [stage, roles] of Object.entries(stageToAllowedRole)) {
  for (const role of roles) {
    if (!roleStageMap[role]) roleStageMap[role] = [];
    roleStageMap[role].push(stage);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, status")
    .eq("id", user.id)
    .single();
  if (!profile || profile.status === "inactive") throw new Error("Unauthorized");
  return { ...user, name: profile.name, role: profile.role?.toLowerCase() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const user = await getUser(req, supabase);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "";

    // ── STATS ─────────────────────────────────────────────────────────────
    if (action === "stats") {
      const { data: allCases } = await supabase.from("cases").select("status, current_stage");
      const cases = allCases || [];

      if (user.role === "admin") {
        return jsonResponse({
          totalCases: cases.length,
          inProgressCases: cases.filter((c) => c.status === "In Progress").length,
          completedCases: cases.filter((c) => c.status === "Completed").length,
          delayedCases: cases.filter((c) => c.status === "Delayed").length,
        });
      }

      const assignedStages = (roleStageMap[user.role] || []).map((s) => s.toLowerCase());
      if (assignedStages.length === 0) {
        return jsonResponse({ totalCases: 0, inProgressCases: 0, completedCases: 0, delayedCases: 0 });
      }

      const maxIndex = Math.max(
        ...assignedStages.map((s) => workflowStages.findIndex((ws) => ws.toLowerCase() === s))
      );

      const activePipeline = cases.filter((c) => assignedStages.includes(c.current_stage?.toLowerCase()));
      const completedByDept = cases.filter((c) => {
        const idx = workflowStages.findIndex((s) => s.toLowerCase() === c.current_stage?.toLowerCase());
        return idx > maxIndex;
      });

      return jsonResponse({
        totalCases: activePipeline.length + completedByDept.length,
        inProgressCases: activePipeline.filter((c) => c.status === "In Progress").length,
        completedCases: completedByDept.length,
        delayedCases: activePipeline.filter((c) => c.status === "Delayed").length,
      });
    }

    // ── EMPLOYEE STATS (per-employee, time-filtered) ───────────────────────
    if (action === "employee_stats") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Allow admin to query another employee's stats via body params
      const targetRole = (body.userRole || user.role).toLowerCase();
      const targetName = body.userName || user.name;
      const targetId   = body.userId   || user.id;

      if (targetRole === "sales") {
        // Sales: filter quotations by sales_person name
        const { data: allQuotes } = await supabase
          .from("quotations")
          .select("*")
          .eq("created_by", targetId);
        const quotes = allQuotes || [];

        const todayQuotes = quotes.filter(q => new Date(q.created_at) >= new Date(todayStart));
        const monthQuotes = quotes.filter(q => new Date(q.created_at) >= new Date(monthStart));

        return jsonResponse({
          today: {
            registered: todayQuotes.length,
            processing: todayQuotes.filter(q => q.status === "Processing" || q.status === "Submitted").length,
            completed: todayQuotes.filter(q => q.status === "Approved" || q.status === "Registration Completed").length,
            rejected: todayQuotes.filter(q => q.status === "Rejected").length,
          },
          month: {
            registered: monthQuotes.length,
            processing: monthQuotes.filter(q => q.status === "Processing" || q.status === "Submitted").length,
            completed: monthQuotes.filter(q => q.status === "Approved" || q.status === "Registration Completed").length,
            rejected: monthQuotes.filter(q => q.status === "Rejected").length,
          },
          total: {
            registered: quotes.length,
            processing: quotes.filter(q => q.status === "Processing" || q.status === "Submitted").length,
            completed: quotes.filter(q => q.status === "Approved" || q.status === "Registration Completed").length,
            rejected: quotes.filter(q => q.status === "Rejected").length,
          },
        });
      }

      if (targetRole === "registration") {
        // Registration: cases created_by this user
        const { data: allCases } = await supabase
          .from("cases")
          .select("*")
          .eq("created_by", targetId);
        const cases = allCases || [];

        const todayCases = cases.filter(c => new Date(c.created_at) >= new Date(todayStart));
        const monthCases = cases.filter(c => new Date(c.created_at) >= new Date(monthStart));

        const countStats = (arr: any[]) => ({
          registered: arr.length,
          processing: arr.filter(c => c.status === "In Progress").length,
          completed: arr.filter(c => c.status === "Completed").length,
          rejected: arr.filter(c => c.status === "Rejected").length,
        });

        return jsonResponse({
          today: countStats(todayCases),
          month: countStats(monthCases),
          total: countStats(cases),
        });
      }

      // Other roles: track via case_history where updated_by = targetName
      const { data: myHistory } = await supabase
        .from("case_history")
        .select("case_id, stage, timestamp, remarks")
        .eq("updated_by", targetName)
        .order("timestamp", { ascending: false });

      const history = myHistory || [];

      // Get unique case IDs touched
      const todayHistory = history.filter(h => new Date(h.timestamp) >= new Date(todayStart));
      const monthHistory = history.filter(h => new Date(h.timestamp) >= new Date(monthStart));

      const uniqueCaseIds = (arr: any[]) => [...new Set(arr.map(h => h.case_id))];
      const todayCaseIds  = uniqueCaseIds(todayHistory);
      const monthCaseIds  = uniqueCaseIds(monthHistory);
      const totalCaseIds  = uniqueCaseIds(history);

      // Fetch status for those cases
      const fetchCaseStatuses = async (ids: string[]) => {
        if (ids.length === 0) return [];
        const { data } = await supabase.from("cases").select("case_id, status").in("case_id", ids);
        return data || [];
      };

      const [todayCases, monthCases, totalCases] = await Promise.all([
        fetchCaseStatuses(todayCaseIds),
        fetchCaseStatuses(monthCaseIds),
        fetchCaseStatuses(totalCaseIds),
      ]);

      const countStats = (cases: any[], caseIds: string[]) => ({
        registered: caseIds.length,
        processing: cases.filter(c => c.status === "In Progress").length,
        completed: cases.filter(c => c.status === "Completed").length,
        rejected: cases.filter(c => c.status === "Rejected" || c.status === "Delayed").length,
      });

      return jsonResponse({
        today: countStats(todayCases, todayCaseIds),
        month: countStats(monthCases, monthCaseIds),
        total: countStats(totalCases, totalCaseIds),
      });
    }

    // ── DEPT OVERVIEW (admin only) ─────────────────────────────────────────
    if (action === "dept_overview") {
      if (user.role !== "admin") return jsonResponse({ message: "Admin only" }, 403);

      // Get all profiles (select only guaranteed-existing columns)
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, name, role, status")
        .eq("status", "active");
      if (profErr) console.error("profiles fetch error:", profErr);

      // Get all cases
      const { data: allCases } = await supabase.from("cases").select("current_stage, status, created_by, assigned_team");
      const cases = allCases || [];

      // Get case history for non-sales/registration roles
      const { data: history } = await supabase
        .from("case_history")
        .select("case_id, updated_by, timestamp")
        .order("timestamp", { ascending: false });
      const historyArr = history || [];

      // ── Stage → dept mapping (for "In Queue" count per dept) ──────────
      const stagesByRole: Record<string, string[]> = {
        sales:              [],
        registration:       ["Registration Done", "Phone Verification Done"],
        banking:            ["Bank & Finance"],
        inventory:          ["Sent to Store"],
        field_installation: ["Installation Done", "Plant Activated"],
        subsidy:            ["Subsidy Registration Completed"],
      };

      // ── Auto-discover ALL unique roles from active profiles ──────────────
      // This ensures any future new role/department is included automatically
      const allRoles = [...new Set((profiles || []).map(p => p.role?.toLowerCase()).filter(Boolean))];

      // Pretty-print role key → label
      const roleLabel = (key: string) =>
        key === "field_installation" ? "Installation" :
        key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");

      const result = await Promise.all(allRoles.map(async roleKey => {
        const members    = (profiles || []).filter(p => p.role?.toLowerCase() === roleKey);
        const stages     = stagesByRole[roleKey] || [];
        const queueCount = stages.length > 0
          ? cases.filter(c => stages.includes(c.current_stage)).length
          : 0;

        const memberStats = await Promise.all(members.map(async m => {
          const now        = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          // ── SALES: count quotations created by this person ──────────────
          if (roleKey === "sales") {
            const { data: allQuotes } = await supabase
              .from("quotations")
              .select("id, created_at")
              .eq("created_by", m.id);
            const q = allQuotes || [];
            return {
              id: m.id, name: m.name, employeeId: m.id, role: m.role,
              todayActions:      q.filter(r => new Date(r.created_at) >= todayStart).length,
              monthActions:      q.filter(r => new Date(r.created_at) >= monthStart).length,
              totalCasesTouched: q.length,
            };
          }

          // ── REGISTRATION: count cases created by this person ───────────
          if (roleKey === "registration") {
            const { data: allCases } = await supabase
              .from("cases")
              .select("case_id, created_at")
              .eq("created_by", m.id);
            const c = allCases || [];
            return {
              id: m.id, name: m.name, employeeId: m.id, role: m.role,
              todayActions:      c.filter(r => new Date(r.created_at) >= todayStart).length,
              monthActions:      c.filter(r => new Date(r.created_at) >= monthStart).length,
              totalCasesTouched: c.length,
            };
          }

          // ── OTHER ROLES: count unique cases touched via case_history ───
          // Match by UUID (updated_by_id) first, fallback to name for older records
          const myHistory = historyArr.filter(h => h.updated_by === m.name);

          const uniq        = (arr: any[]) => [...new Set(arr.map(h => h.case_id))];
          const todayHist   = myHistory.filter(h => new Date(h.timestamp) >= todayStart);
          const monthHist   = myHistory.filter(h => new Date(h.timestamp) >= monthStart);

          return {
            id: m.id, name: m.name, employeeId: m.id, role: m.role,
            todayActions:      uniq(todayHist).length,
            monthActions:      uniq(monthHist).length,
            totalCasesTouched: uniq(myHistory).length,
          };
        }));

        return {
          dept: roleKey,
          label: roleLabel(roleKey),
          memberCount: members.length,
          queueCount,
          members: memberStats,
        };
      }));  // end Promise.all(allRoles.map(...))

      return jsonResponse(result);
    }

    // ── LEAD TRACKING ─────────────────────────────────────────────────────
    if (action === "lead_tracking") {
      const targetUserId = body.userId || user.id;
      const targetUserName = body.userName || user.name;

      // Admin can query any user; others can only query themselves
      if (user.role !== "admin" && targetUserId !== user.id) {
        return jsonResponse({ message: "Unauthorized" }, 403);
      }

      if (user.role === "sales" || body.userRole === "sales") {
        // Sales: get quotations by sales person, join with cases
        const { data: quotes } = await supabase
          .from("quotations")
          .select("*")
          .eq("created_by", targetUserId)
          .order("created_at", { ascending: false });

        // For each approved quotation, get the linked case (via quotation_id reference)
        const enriched = await Promise.all((quotes || []).map(async (q: any) => {
          let caseData = null;
          if (q.case_id || q.linked_case_id) {
            const { data: c } = await supabase
              .from("cases")
              .select("case_id, tracking_id, current_stage, status, customer_name, created_at")
              .eq("case_id", q.case_id || q.linked_case_id)
              .single();
            caseData = c;
          }

          const stageIndex = caseData
            ? workflowStages.findIndex(s => s.toLowerCase() === caseData.current_stage?.toLowerCase())
            : -1;

          return {
            id: q.id,
            customerName: q.customer_name || q.customer?.name,
            quotationId: q.quotation_id || q.id,
            trackingId: caseData?.tracking_id,
            status: q.status,
            createdAt: q.created_at,
            currentStage: caseData?.current_stage || (q.status === "Approved" ? "Registration Done" : "Sales"),
            stageIndex: stageIndex >= 0 ? stageIndex : 0,
            caseStatus: caseData?.status || q.status,
            pipeline: pipelineStages.map((ps, i) => ({
              ...ps,
              reached: i <= (stageIndex >= 0 ? stageIndex : -1),
              current: caseData?.current_stage === ps.key,
            })),
          };
        }));

        return jsonResponse(enriched);
      }

      // Other roles: get cases where this employee made updates
      const { data: myHistory } = await supabase
        .from("case_history")
        .select("case_id, stage, timestamp, remarks")
        .eq("updated_by", targetUserName)
        .order("timestamp", { ascending: false });

      const caseIds = [...new Set((myHistory || []).map((h: any) => h.case_id))];

      if (caseIds.length === 0) return jsonResponse([]);

      const { data: myCases } = await supabase
        .from("cases")
        .select("case_id, customer_name, current_stage, status, created_at")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false });

      const enriched = (myCases || []).map((c: any) => {
        const stageIndex = workflowStages.findIndex(
          s => s.toLowerCase() === c.current_stage?.toLowerCase()
        );
        return {
          id: c.case_id,
          customerName: c.customer_name,
          caseId: c.case_id,
          currentStage: c.current_stage,
          caseStatus: c.status,
          createdAt: c.created_at,
          stageIndex,
          pipeline: pipelineStages.map((ps, i) => ({
            ...ps,
            reached: i <= stageIndex,
            current: c.current_stage === ps.key,
            completed: c.status === "Completed" || i < stageIndex,
          })),
        };
      });

      return jsonResponse(enriched);
    }

    // ── PIPELINE ──────────────────────────────────────────────────────────
    if (action === "pipeline") {
      const { data: cases } = await supabase.from("cases").select("current_stage");
      const pipeline = workflowStages.map((stage) => ({
        stage,
        count: (cases || []).filter(
          (c) => c.current_stage?.toLowerCase() === stage.toLowerCase()
        ).length,
      }));
      return jsonResponse(pipeline);
    }

    // ── PERFORMANCE ───────────────────────────────────────────────────────
    if (action === "performance") {
      const { data: allCases } = await supabase.from("cases").select("status, current_stage");
      const { data: history } = await supabase
        .from("case_history")
        .select("case_id, stage, timestamp")
        .order("timestamp", { ascending: true });

      const deptStats: Record<string, { team: string; casesProcessed: number; totalDays: number; delays: number }> = {};
      for (const [stage, team] of Object.entries(stageToTeam)) {
        if (!deptStats[team]) deptStats[team] = { team, casesProcessed: 0, totalDays: 0, delays: 0 };
      }

      const caseMap: Record<string, typeof history> = {};
      for (const h of history || []) {
        if (!caseMap[h.case_id]) caseMap[h.case_id] = [];
        caseMap[h.case_id].push(h);
      }

      for (const entries of Object.values(caseMap)) {
        for (let i = 0; i < entries.length - 1; i++) {
          const from = entries[i];
          const to = entries[i + 1];
          const stageKey = Object.keys(stageToTeam).find(
            (s) => s.toLowerCase() === from.stage?.toLowerCase()
          );
          const team = stageKey ? stageToTeam[stageKey] : null;
          if (!team || !deptStats[team]) continue;
          const start = new Date(from.timestamp);
          const end = new Date(to.timestamp);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
            deptStats[team].casesProcessed++;
            deptStats[team].totalDays += (end.getTime() - start.getTime()) / 86400000;
          }
        }
      }

      for (const c of allCases || []) {
        if (c.status === "Delayed") {
          const stageKey = Object.keys(stageToTeam).find(
            (s) => s.toLowerCase() === c.current_stage?.toLowerCase()
          );
          const team = stageKey ? stageToTeam[stageKey] : null;
          if (team && deptStats[team]) deptStats[team].delays++;
        }
      }

      const result = Object.values(deptStats)
        .map((d) => ({
          team: d.team,
          casesProcessed: d.casesProcessed,
          avgDays: d.casesProcessed > 0 ? Math.max(0, +(d.totalDays / d.casesProcessed).toFixed(1)) : 0,
          delayCount: d.delays,
        }))
        .filter((d) => d.team !== "Admin");

      return jsonResponse(result);
    }

    // ── OVERDUE ───────────────────────────────────────────────────────────
    if (action === "overdue") {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: overdue } = await supabase
        .from("cases")
        .select("*")
        .neq("status", "Completed")
        .lt("stage_start_time", threeDaysAgo);

      const result = (overdue || [])
        .map((c) => {
          const start = new Date(c.stage_start_time);
          return {
            ...c,
            daysStuck: isNaN(start.getTime()) ? 0 : Math.floor((Date.now() - start.getTime()) / 86400000),
          };
        })
        .sort((a, b) => b.daysStuck - a.daysStuck);

      return jsonResponse(result);
    }

    // ── MONTHLY SUMMARY ────────────────────────────────────────────────────
    if (action === "monthly_summary") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: allCases } = await supabase.from("cases").select("status, current_stage, created_at, updated_at");
      const cases = allCases || [];

      const created = cases.filter((c) => new Date(c.created_at) >= new Date(monthStart)).length;
      const completedCases = cases.filter(
        (c) => c.status === "Completed" && new Date(c.updated_at) >= new Date(monthStart)
      );
      const delayed = cases.filter((c) => c.status === "Delayed").length;

      let totalDays = 0;
      let count = 0;
      for (const c of completedCases) {
        const start = new Date(c.created_at);
        const end = new Date(c.updated_at);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          totalDays += (end.getTime() - start.getTime()) / 86400000;
          count++;
        }
      }

      const stageCounts: Record<string, number> = {};
      for (const c of cases.filter((c) => c.status === "Delayed")) {
        if (c.current_stage) stageCounts[c.current_stage] = (stageCounts[c.current_stage] || 0) + 1;
      }
      const topEntry = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0];

      return jsonResponse({
        created,
        completed: completedCases.length,
        delayed,
        avgCycleDays: count > 0 ? Math.max(0, +(totalDays / count).toFixed(1)) : 0,
        topDelayedStage: topEntry ? topEntry[0] : "None",
        totalActive: cases.filter((c) => c.status === "In Progress").length,
      });
    }

    // ── ACTIVITY ──────────────────────────────────────────────────────────
    if (action === "activity") {
      let query = supabase
        .from("case_history")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);

      if (user.role !== "admin") {
        const allowedStages = roleStageMap[user.role] || [];
        if (allowedStages.length > 0) {
          // Construct the IN clause string like ("Stage 1","Stage 2")
          const stagesIn = `(${allowedStages.map(s => `"${s}"`).join(',')})`;
          // Construct the OR filter: either it's in their allowed stages OR they did it
          query = query.or(`stage.in.${stagesIn},updated_by.eq."${user.name}"`);
        } else {
          query = query.eq("updated_by", user.name);
        }
      }

      const { data } = await query;
      const acts = data || [];

      // Manually join cases since case_id in case_history is TEXT and lacks a foreign key
      if (acts.length > 0) {
        const caseIds = [...new Set(acts.map((h: any) => h.case_id))];
        const { data: casesData } = await supabase
          .from("cases")
          .select("id, tracking_id, case_id, customer_name")
          .in("id", caseIds);

        const caseMap = new Map(casesData?.map((c: any) => [c.id, c]) || []);

        for (const act of acts) {
          const c = caseMap.get(act.case_id);
          if (c) {
            act.cases = {
              tracking_id: c.tracking_id || c.case_id,
              customer_name: c.customer_name
            };
          }
        }
      }

      return jsonResponse(acts);
    }


    // ── TREND DATA — Dynamic Registration Count (admin only) ──────────────
    // Supports timeframe: 'daily' (last 30d), 'weekly' (last 12w), 'monthly' (last 12m), 'yearly' (last 5y), 'custom' (startDate to endDate)
    if (action === "trend_data") {
      if (user.role !== "admin") return jsonResponse({ message: "Forbidden" }, 403);

      const timeframe = body.timeframe || "daily";
      let startDateStr = "";
      let endDateStr = new Date().toISOString();
      const now = new Date();

      // Determine date ranges based on timeframe
      if (timeframe === "custom") {
        startDateStr = body.startDate ? new Date(body.startDate).toISOString() : new Date(now.setDate(now.getDate() - 30)).toISOString();
        endDateStr = body.endDate ? new Date(body.endDate).toISOString() : new Date().toISOString();
      } else if (timeframe === "weekly") {
        const d = new Date(now);
        d.setDate(d.getDate() - 12 * 7); // Last 12 weeks
        startDateStr = d.toISOString();
      } else if (timeframe === "monthly") {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 11); // Last 12 months (including current)
        d.setDate(1);
        startDateStr = d.toISOString();
      } else if (timeframe === "yearly") {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 4); // Last 5 years (including current)
        d.setMonth(0, 1);
        startDateStr = d.toISOString();
      } else {
        // default "daily" / "7d"
        const d = new Date(now);
        const daysToSubtract = timeframe === "7d" ? 6 : 29; // daily = 30 days
        d.setDate(d.getDate() - daysToSubtract);
        d.setHours(0, 0, 0, 0);
        startDateStr = d.toISOString();
      }

      // Fetch all cases in range
      const { data: recentCases } = await supabase
        .from("cases")
        .select("created_at")
        .gte("created_at", startDateStr)
        .lte("created_at", endDateStr);

      const cases = recentCases || [];
      const trendData: { date: string; count: number }[] = [];

      // Grouping logic
      if (timeframe === "monthly") {
        const monthCounts: Record<string, number> = {};
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
          monthCounts[key] = 0;
        }
        for (const c of cases) {
          const d = new Date(c.created_at);
          const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
          if (monthCounts[key] !== undefined) monthCounts[key]++;
        }
        for (const [date, count] of Object.entries(monthCounts)) trendData.push({ date, count });

      } else if (timeframe === "yearly") {
        const yearCounts: Record<string, number> = {};
        for (let i = 4; i >= 0; i--) {
          const y = new Date().getFullYear() - i;
          yearCounts[y.toString()] = 0;
        }
        for (const c of cases) {
          const y = new Date(c.created_at).getFullYear().toString();
          if (yearCounts[y] !== undefined) yearCounts[y]++;
        }
        for (const [date, count] of Object.entries(yearCounts)) trendData.push({ date, count });

      } else if (timeframe === "weekly") {
        const weekCounts: Record<string, number> = {};
        const lastDay = new Date();
        lastDay.setDate(lastDay.getDate() + (7 - lastDay.getDay()) % 7);
        lastDay.setHours(23, 59, 59, 999);
        
        for (let i = 11; i >= 0; i--) {
          const end = new Date(lastDay);
          end.setDate(end.getDate() - i * 7);
          const start = new Date(end);
          start.setDate(start.getDate() - 6);
          const key = `${start.getDate()}/${start.getMonth() + 1}`;
          weekCounts[key] = 0;
        }

        for (const c of cases) {
          const d = new Date(c.created_at);
          for (let i = 0; i <= 11; i++) {
            const end = new Date(lastDay);
            end.setDate(end.getDate() - i * 7);
            const start = new Date(end);
            start.setDate(start.getDate() - 6);
            start.setHours(0,0,0,0);
            
            if (d >= start && d <= end) {
              const key = `${start.getDate()}/${start.getMonth() + 1}`;
              if (weekCounts[key] !== undefined) weekCounts[key]++;
              break;
            }
          }
        }
        const orderedKeys = [];
        for (let i = 11; i >= 0; i--) {
          const end = new Date(lastDay);
          end.setDate(end.getDate() - i * 7);
          const start = new Date(end);
          start.setDate(start.getDate() - 6);
          orderedKeys.push(`${start.getDate()}/${start.getMonth() + 1}`);
        }
        for (const key of orderedKeys) trendData.push({ date: key, count: weekCounts[key] || 0 });

      } else {
        // Daily or Custom (group by day)
        const dayCounts: Record<string, number> = {};
        const start = new Date(startDateStr);
        start.setHours(0,0,0,0);
        const end = new Date(endDateStr);
        end.setHours(23,59,59,999);
        
        const cursor = new Date(start);
        const orderedDays = [];
        while (cursor <= end) {
          const key = cursor.toISOString().split("T")[0];
          orderedDays.push(key);
          dayCounts[key] = 0;
          cursor.setDate(cursor.getDate() + 1);
        }

        for (const c of cases) {
          const key = (c.created_at as string).split("T")[0];
          if (dayCounts[key] !== undefined) dayCounts[key]++;
        }
        
        for (const date of orderedDays) {
          const dObj = new Date(date);
          const formatKey = dObj.toLocaleDateString("default", { month: "short", day: "numeric" });
          trendData.push({ date: formatKey, count: dayCounts[date] });
        }
      }

      return jsonResponse(trendData);
    }

    // ── REVENUE PIPELINE — aggregate finance data for active cases (admin) ─
    // Returns: { totalLoan, totalCash, totalDown, activeCases, avgLoan }
    if (action === "revenue_pipeline") {
      if (user.role !== "admin") return jsonResponse({ message: "Forbidden" }, 403);

      const { data: activeCases } = await supabase
        .from("cases")
        .select("loan_amount, cash_amount, down_payment, payment_type, status")
        .neq("status", "Completed");

      const cases = activeCases || [];
      const totalLoan = cases.reduce((s, c) => s + (Number(c.loan_amount) || 0), 0);
      const totalCash = cases.reduce((s, c) => s + (Number(c.cash_amount) || 0), 0);
      const totalDown = cases.reduce((s, c) => s + (Number(c.down_payment) || 0), 0);
      const loanCases = cases.filter(c => c.payment_type?.toLowerCase() === "loan");
      const avgLoan   = loanCases.length > 0 ? Math.round(totalLoan / loanCases.length) : 0;

      return jsonResponse({
        totalLoan,
        totalCash,
        totalDown,
        activeCases: cases.length,
        loanCases: loanCases.length,
        cashCases: cases.filter(c => c.payment_type?.toLowerCase() === "cash").length,
        avgLoan,
        totalPipelineValue: totalLoan + totalCash + totalDown,
      });
    }

    return jsonResponse({ message: `Unknown action: ${action}` }, 400);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ message }, message.includes("Unauthorized") ? 401 : 500);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
