// Debug script to test Bison API and see what total_leads_contacted should be
// Usage: deno run --allow-net --allow-env scripts/debug-bison-api.ts

import { createClient } from "npm:@supabase/supabase-js@2.26.0";

// Load environment variables
const env = Deno.env.toObject();

const supabase = createClient(
  env.SUPABASE_URL || Deno.env.get("SUPABASE_URL") || "",
  env.SUPABASE_SERVICE_ROLE_KEY || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const toInt = (val: any) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return typeof val === 'number' ? val : 0;
};

async function getApiKey(clientName: string) {
  if (!clientName) return null;
  try {
    const result = await supabase.from("Clients").select('"Api Key - Bison"').eq("Business", clientName).single();
    if (result.error || !result.data) return null;
    return result.data["Api Key - Bison"] || null;
  } catch (err) {
    console.error("Exception in getApiKey:", err);
    return null;
  }
}

async function fetchSequenceSteps(campaignId: string, apiKey: string) {
  try {
    const res = await fetch(
      `https://send.rillationrevenue.com/api/campaigns/v1.1/${campaignId}/sequence-steps`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        }
      }
    );
    if (!res.ok) {
      if (res.status === 400 || res.status === 404) return [];
      console.error(`Error fetching sequence steps for campaign ${campaignId}: ${res.status}`);
      return [];
    }
    const json = await res.json();
    return json.data?.sequence_steps || [];
  } catch (err) {
    console.error(`Exception fetching sequence steps for campaign ${campaignId}:`, err);
    return [];
  }
}

async function fetchStats(id: string, key: string, date: string, stepCopyMap: any) {
  const res = await fetch(`https://send.rillationrevenue.com/api/campaigns/${id}/stats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      start_date: date,
      end_date: date
    })
  });

  if (res.status === 400) {
    const txt = await res.text();
    if (txt.includes("can only be viewed for campaigns with a sequence")) {
      return null;
    }
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`fetchStats error for campaign ${id} (${date}): ${res.status} - ${txt}`);
  }

  const json = await res.json();
  const statsData = json.data || json;

  if (!statsData || typeof statsData !== 'object') {
    return null;
  }
  
  return {
    raw: statsData,
    sequence_step_stats: statsData.sequence_step_stats || [],
    emails_sent: toInt(statsData.emails_sent),
  };
}

async function main() {
  try {
    const clientName = "Barakat Transport";
    console.log(`\n=== Debugging Bison API for ${clientName} ===\n`);

    // Get API key
    const apiKey = await getApiKey(clientName);
    if (!apiKey) {
      console.error(`No API key found for ${clientName}`);
      return;
    }
    console.log(`✓ API key found\n`);

    // Get recent campaigns for this client
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const { data: campaigns, error } = await supabase
      .from("Campaigns")
      .select("campaign_id, campaign_name, client, created_at")
      .eq("client", clientName)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !campaigns || campaigns.length === 0) {
      console.error("No campaigns found:", error);
      return;
    }

    console.log(`Found ${campaigns.length} recent campaigns:\n`);
    campaigns.forEach(c => {
      console.log(`  - ${c.campaign_name} (${c.campaign_id})`);
    });

    // Test with the first campaign
    const testCampaign = campaigns[0];
    console.log(`\n=== Testing Campaign: ${testCampaign.campaign_name} (${testCampaign.campaign_id}) ===\n`);

    // Get sequence steps
    console.log("Fetching sequence steps...");
    const sequenceSteps = await fetchSequenceSteps(testCampaign.campaign_id, apiKey);
    console.log(`✓ Found ${sequenceSteps.length} sequence steps\n`);

    if (sequenceSteps.length > 0) {
      console.log("Sequence Steps Details:");
      sequenceSteps.forEach((step: any, idx: number) => {
        console.log(`  Step ${idx + 1}:`);
        console.log(`    - ID: ${step.id}`);
        console.log(`    - Order: ${step.order}`);
        console.log(`    - Subject: ${step.email_subject || '(no subject)'}`);
        console.log(`    - Thread Reply: ${step.thread_reply || false}`);
        console.log(`    - Variant: ${step.variant || 'N/A'}`);
        console.log("");
      });
    }

    // Get stats for today and yesterday
    const dates = [];
    for (let i = 0; i < 2; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }

    console.log(`\n=== Fetching Stats for ${dates.length} recent dates ===\n`);

    for (const date of dates) {
      console.log(`\n--- Date: ${date} ---`);
      
      const stats = await fetchStats(testCampaign.campaign_id, apiKey, date, {});
      
      if (!stats) {
        console.log("  No stats (campaign may not have sequence)");
        continue;
      }

      console.log(`  Raw emails_sent from API: ${stats.emails_sent}`);
      console.log(`  Sequence step stats count: ${stats.sequence_step_stats.length}\n`);

      // Show raw sequence step stats
      if (stats.sequence_step_stats.length > 0) {
        console.log("  Sequence Step Stats (from API):");
        let totalLeadsFromAPI = 0;
        stats.sequence_step_stats.forEach((step: any, idx: number) => {
          const leadsContacted = toInt(step.leads_contacted);
          totalLeadsFromAPI += leadsContacted;
          console.log(`    Step ${idx + 1} (ID: ${step.sequence_step_id}):`);
          console.log(`      - leads_contacted: ${leadsContacted}`);
          console.log(`      - sent: ${toInt(step.sent)}`);
          console.log(`      - unique_opens: ${toInt(step.unique_opens)}`);
          console.log(`      - unique_replies: ${toInt(step.unique_replies)}`);
        });
        console.log(`\n  Total leads_contacted (sum of all steps): ${totalLeadsFromAPI}`);
      }

      // Now test the calculation logic
      console.log("\n  Testing Calculation Logic:");
      
      // Create step copy map (like in the actual script)
      const stepCopyMap: any = {};
      for (const step of sequenceSteps) {
        stepCopyMap[step.id] = {
          email_subject: step.email_subject,
          order: parseInt(step.order, 10) || 0,
          thread_reply: step.thread_reply
        };
      }

      // Enrich stats with copy
      const enrichedStats = (stats.sequence_step_stats || []).map((stat: any) => ({
        sequence_step_id: stat.sequence_step_id,
        sent: stat.sent || 0,
        leads_contacted: stat.leads_contacted || 0,
        ...(stepCopyMap[stat.sequence_step_id] || {})
      }));

      let calculatedTotalLeadsContacted = 0;
      console.log("  Steps included in calculation:");
      for (const stepStat of enrichedStats) {
        const emailSubject = stepStat.email_subject || '';
        const isRe = emailSubject.toLowerCase().trim().startsWith('re:');
        const leadsContacted = toInt(stepStat.leads_contacted);
        
        if (emailSubject && !isRe) {
          calculatedTotalLeadsContacted += leadsContacted;
          console.log(`    ✓ Step ${stepStat.sequence_step_id}: "${emailSubject}" - ${leadsContacted} leads`);
        } else {
          console.log(`    ✗ Step ${stepStat.sequence_step_id}: "${emailSubject || '(no subject)'}" - ${leadsContacted} leads (EXCLUDED - starts with "Re:" or no subject)`);
        }
      }

      console.log(`\n  FINAL CALCULATED total_leads_contacted: ${calculatedTotalLeadsContacted}`);
      
      // Check what's in the database
      const { data: dbData } = await supabase
        .from("campaign_reporting")
        .select("total_leads_contacted, emails_sent")
        .eq("campaign_id", testCampaign.campaign_id)
        .eq("client", clientName)
        .eq("date", date)
        .single();

      if (dbData) {
        console.log(`\n  DATABASE VALUES:`);
        console.log(`    - total_leads_contacted: ${dbData.total_leads_contacted}`);
        console.log(`    - emails_sent: ${dbData.emails_sent}`);
        console.log(`\n  COMPARISON:`);
        console.log(`    - API calculated: ${calculatedTotalLeadsContacted}`);
        console.log(`    - Database stored: ${dbData.total_leads_contacted}`);
        if (calculatedTotalLeadsContacted !== dbData.total_leads_contacted) {
          console.log(`    ⚠️  MISMATCH DETECTED!`);
        } else {
          console.log(`    ✓ Values match`);
        }
      } else {
        console.log(`\n  No data in database for this date`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n=== Debug Complete ===\n`);

  } catch (err: any) {
    console.error("ERROR:", err.message, err.stack);
  }
}

main();











