import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface InboxStats {
  email: string;
  domain: string;
  sent_count: number;
  reply_count: number;
  reply_rate: number;
  bounce_count: number;
  health_score: number;
  recommendation: 'keep' | 'watch' | 'rotate' | 'cancel';
}

interface ClientRebatchSummary {
  client: string;
  daily_send_goal: number;
  active_domains: number;
  insurance_domains: number;
  inboxes_analyzed: number;
  avg_reply_rate: number;
  domains_to_cancel: string[];
  domains_to_activate: string[];
  domains_to_buy: number;
}

// Fetch inbox stats from Bison API
async function fetchBisonInboxStats(supabase: any, client: string): Promise<InboxStats[]> {
  // Get client's Bison API key
  const { data: clientData } = await supabase
    .from("Clients")
    .select('"Api Key - Bison"')
    .eq("Business", client)
    .single();

  if (!clientData?.["Api Key - Bison"]) {
    console.log(`No Bison API key for client: ${client}`);
    return [];
  }

  const apiKey = clientData["Api Key - Bison"];

  try {
    // Fetch sender stats from Bison - this endpoint gives inbox-level data
    const response = await fetch("https://app.emailbison.com/api/v1/sender-emails/stats", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Bison API error for ${client}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const senders = data.data || data || [];

    return senders.map((sender: any) => {
      const email = sender.email || sender.sender_email || "";
      const domain = email.split("@")[1] || "";
      const sentCount = sender.sent_count || sender.emails_sent || 0;
      const replyCount = sender.reply_count || sender.replies || 0;
      const bounceCount = sender.bounce_count || sender.bounces || 0;
      const replyRate = sentCount > 0 ? (replyCount / sentCount) * 100 : 0;

      // Calculate health score (0-100)
      // Based on reply rate (higher = better) and bounce rate (lower = better)
      let healthScore = 100;
      if (replyRate < 1) healthScore -= 40;
      else if (replyRate < 2) healthScore -= 20;
      else if (replyRate < 3) healthScore -= 10;
      
      const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
      if (bounceRate > 5) healthScore -= 30;
      else if (bounceRate > 2) healthScore -= 15;
      else if (bounceRate > 1) healthScore -= 5;

      healthScore = Math.max(0, healthScore);

      // Determine recommendation
      let recommendation: 'keep' | 'watch' | 'rotate' | 'cancel' = 'keep';
      if (healthScore < 40) recommendation = 'cancel';
      else if (healthScore < 60) recommendation = 'rotate';
      else if (healthScore < 80) recommendation = 'watch';

      return {
        email,
        domain,
        sent_count: sentCount,
        reply_count: replyCount,
        reply_rate: replyRate,
        bounce_count: bounceCount,
        health_score: healthScore,
        recommendation,
      };
    });
  } catch (error) {
    console.error(`Error fetching Bison stats for ${client}:`, error);
    return [];
  }
}

// Calculate rebatch recommendations for a client
async function calculateClientRebatch(
  supabase: any,
  client: string,
  inboxStats: InboxStats[]
): Promise<ClientRebatchSummary> {
  // Get domain inventory for this client
  const { data: domains } = await supabase
    .from("domain_inventory")
    .select("domain_name, status")
    .eq("client", client);

  const allDomains = domains || [];
  const activeDomains = allDomains.filter((d: any) => d.status === 'active');
  const insuranceDomains = allDomains.filter((d: any) => d.status === 'insurance');

  // Aggregate inbox stats to domain level
  const domainStats: Record<string, { total: number; healthy: number; avgReply: number }> = {};
  
  for (const inbox of inboxStats) {
    if (!domainStats[inbox.domain]) {
      domainStats[inbox.domain] = { total: 0, healthy: 0, avgReply: 0 };
    }
    domainStats[inbox.domain].total++;
    if (inbox.health_score >= 60) domainStats[inbox.domain].healthy++;
    domainStats[inbox.domain].avgReply += inbox.reply_rate;
  }

  // Calculate average reply rate per domain
  for (const domain of Object.keys(domainStats)) {
    if (domainStats[domain].total > 0) {
      domainStats[domain].avgReply /= domainStats[domain].total;
    }
  }

  // Identify domains to cancel (< 1% reply rate or all inboxes unhealthy)
  const domainsToCancel: string[] = [];
  for (const [domain, stats] of Object.entries(domainStats)) {
    if (stats.avgReply < 1 || stats.healthy === 0) {
      domainsToCancel.push(domain);
    }
  }

  // Identify insurance domains to activate
  const domainsToActivate: string[] = [];
  const neededActivations = Math.min(domainsToCancel.length, insuranceDomains.length);
  for (let i = 0; i < neededActivations; i++) {
    domainsToActivate.push(insuranceDomains[i].domain_name);
  }

  // Calculate how many new domains to buy
  // Rule: Keep at least 50% of active count as insurance
  const targetInsurance = Math.ceil(activeDomains.length * 0.5);
  const remainingInsurance = insuranceDomains.length - domainsToActivate.length;
  const domainsToBuy = Math.max(0, targetInsurance - remainingInsurance);

  // Calculate overall average reply rate
  const totalReplies = inboxStats.reduce((sum, i) => sum + i.reply_count, 0);
  const totalSent = inboxStats.reduce((sum, i) => sum + i.sent_count, 0);
  const avgReplyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;

  return {
    client,
    daily_send_goal: activeDomains.length * 30, // Estimate: 30 emails per domain per day
    active_domains: activeDomains.length,
    insurance_domains: insuranceDomains.length,
    inboxes_analyzed: inboxStats.length,
    avg_reply_rate: avgReplyRate,
    domains_to_cancel: domainsToCancel,
    domains_to_activate: domainsToActivate,
    domains_to_buy: domainsToBuy,
  };
}

// Send Slack notification with rebatch preview
async function sendSlackPreview(
  summaries: ClientRebatchSummary[],
  runId: string
): Promise<string | null> {
  const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!slackWebhook) {
    console.log("No Slack webhook configured");
    return null;
  }

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🔄 Global Rebatch Preview",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Run ID:* \`${runId}\`\n*Date:* ${new Date().toLocaleDateString()}`,
      },
    },
    { type: "divider" },
  ];

  for (const summary of summaries) {
    const needsAction = summary.domains_to_cancel.length > 0 || summary.domains_to_buy > 0;
    
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${summary.client}* ${needsAction ? '⚠️' : '✅'}\n` +
          `• Daily Goal: ${summary.daily_send_goal} emails\n` +
          `• Active: ${summary.active_domains} | Insurance: ${summary.insurance_domains}\n` +
          `• Avg Reply Rate: ${summary.avg_reply_rate.toFixed(2)}%\n` +
          `• Cancel: ${summary.domains_to_cancel.length} | Activate: ${summary.domains_to_activate.length} | Buy: ${summary.domains_to_buy}`,
      },
    } as any);
  }

  blocks.push(
    { type: "divider" } as any,
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ Approve & Execute", emoji: true },
          style: "primary",
          value: runId,
          action_id: "approve_rebatch",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "❌ Reject", emoji: true },
          style: "danger",
          value: runId,
          action_id: "reject_rebatch",
        },
      ],
    } as any
  );

  try {
    const response = await fetch(slackWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (response.ok) {
      return "sent";
    }
    console.error("Slack webhook error:", await response.text());
    return null;
  } catch (error) {
    console.error("Slack send error:", error);
    return null;
  }
}

// Execute approved rebatch
async function executeRebatch(supabase: any, runId: string): Promise<{ success: boolean; message: string }> {
  // Get the rebatch run
  const { data: runs, error: fetchError } = await supabase
    .from("rebatch_runs")
    .select("*")
    .eq("id", runId);

  if (fetchError || !runs || runs.length === 0) {
    return { success: false, message: "Rebatch run not found" };
  }

  const run = runs[0];
  if (run.status !== "approved") {
    return { success: false, message: `Cannot execute run with status: ${run.status}` };
  }

  // Update status to executing
  await supabase
    .from("rebatch_runs")
    .update({ status: "executing" })
    .eq("id", runId);

  try {
    // Cancel domains
    if (run.domains_to_cancel?.length > 0) {
      await supabase
        .from("domain_inventory")
        .update({ status: "cancel_pending", cancelled_at: new Date().toISOString() })
        .eq("client", run.client)
        .in("domain_name", run.domains_to_cancel);
    }

    // Activate insurance domains
    if (run.domains_to_activate?.length > 0) {
      await supabase
        .from("domain_inventory")
        .update({ status: "active", activated_at: new Date().toISOString() })
        .eq("client", run.client)
        .in("domain_name", run.domains_to_activate);
    }

    // Update run as executed
    await supabase
      .from("rebatch_runs")
      .update({ 
        status: "executed", 
        executed_at: new Date().toISOString() 
      })
      .eq("id", runId);

    return { success: true, message: `Executed rebatch for ${run.client}` };
  } catch (error) {
    // Mark as failed
    await supabase
      .from("rebatch_runs")
      .update({ 
        status: "failed", 
        error_message: error.message 
      })
      .eq("id", runId);

    return { success: false, message: error.message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, client, run_id } = await req.json();

    if (action === "preview") {
      // Generate rebatch preview for one or all clients
      const { data: clients } = client
        ? { data: [{ Business: client }] }
        : await supabase.from("Clients").select("Business");

      const clientList = clients || [];
      const summaries: ClientRebatchSummary[] = [];

      for (const c of clientList) {
        const clientName = c.Business;
        
        // Fetch inbox stats from Bison
        const inboxStats = await fetchBisonInboxStats(supabase, clientName);
        
        if (inboxStats.length === 0) {
          console.log(`Skipping ${clientName} - no inbox data`);
          continue;
        }

        // Store health checks
        const healthRecords = inboxStats.map(stat => ({
          inbox_email: stat.email,
          domain: stat.domain,
          client: clientName,
          sent_count: stat.sent_count,
          reply_count: stat.reply_count,
          reply_rate: stat.reply_rate,
          bounce_count: stat.bounce_count,
          health_score: stat.health_score,
          recommendation: stat.recommendation,
        }));

        await supabase.from("inbox_health_checks").insert(healthRecords);

        // Calculate recommendations
        const summary = await calculateClientRebatch(supabase, clientName, inboxStats);
        summaries.push(summary);

        // Store rebatch run
        await supabase.from("rebatch_runs").insert({
          client: clientName,
          daily_send_goal: summary.daily_send_goal,
          active_domains: summary.active_domains,
          insurance_domains: summary.insurance_domains,
          domains_to_cancel: summary.domains_to_cancel,
          domains_to_activate: summary.domains_to_activate,
          domains_to_buy: summary.domains_to_buy,
          inboxes_analyzed: summary.inboxes_analyzed,
          avg_reply_rate: summary.avg_reply_rate,
          status: "preview",
        });
      }

      // Send Slack notification
      const batchId = crypto.randomUUID();
      await sendSlackPreview(summaries, batchId);

      return new Response(
        JSON.stringify({ success: true, summaries, batch_id: batchId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "approve") {
      // Approve a rebatch run
      if (!run_id) {
        return new Response(
          JSON.stringify({ error: "run_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("rebatch_runs")
        .update({ status: "approved" })
        .eq("id", run_id);

      return new Response(
        JSON.stringify({ success: true, message: "Rebatch approved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "execute") {
      // Execute an approved rebatch
      if (!run_id) {
        return new Response(
          JSON.stringify({ error: "run_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await executeRebatch(supabase, run_id);

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );

    } else if (action === "list") {
      // List recent rebatch runs
      const { data: runs } = await supabase
        .from("rebatch_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({ success: true, runs }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action", available: ["preview", "approve", "execute", "list"] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Global rebatch error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
