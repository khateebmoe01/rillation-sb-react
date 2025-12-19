// get-campaign-summary (today + yesterday)

import { createClient } from "npm:@supabase/supabase-js@2.26.0";

const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

// --------------------------------------------------

async function getRecent() {

  try {
    const since = new Date();

    since.setDate(since.getDate() - 60);

    const result = await supabase.from("Campaigns").select("campaign_id, campaign_name, client, created_at").gte("created_at", since.toISOString());

    if (!result) {
      console.error("No result from campaigns query");
      return [];
    }

    if (result.error) {
      console.error("Error fetching campaigns:", result.error);
      return [];
    }

    return result.data || [];

  } catch (err) {
    console.error("Exception in getRecent:", err);
    return [];
  }

}

// --------------------------------------------------

async function getApiKey(clientName) {

  if (!clientName) return null;

  try {
    const result = await supabase.from("Clients").select('"Api Key - Bison"').eq("Business", clientName).single();

    if (!result) {
      return null;
    }

    if (result.error || !result.data) {
      return null;
    }

    return result.data["Api Key - Bison"] || null;

  } catch (err) {
    console.error("Exception in getApiKey:", err);
    return null;
  }

}

// --------------------------------------------------

async function fetchSequenceSteps(campaignId, apiKey) {
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
      // If campaign has no sequence, return empty array
      if (res.status === 400 || res.status === 404) {
        return [];
      }
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

// --------------------------------------------------

// Helper functions (moved outside for reuse)
const toInt = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return typeof val === 'number' ? val : 0;
};

const toFloat = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return typeof val === 'number' ? val : 0;
};

const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  // Clean up multiple spaces and newlines
  text = text.replace(/\s+/g, ' ').trim();
  return text;
};

async function fetchStats(id, key, date, stepCopyMap) {

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

  // === SKIP IF NO SEQUENCE ===

  if (res.status === 400) {

    const txt = await res.text();

    if (txt.includes("can only be viewed for campaigns with a sequence")) {

      return null; // skip

    }

  }

  if (!res.ok) {

    const txt = await res.text();

    throw new Error(`fetchStats error for campaign ${id} (${date}): ${res.status} - ${txt}`);

  }

  const json = await res.json();

  // Extract data from response - ensure we get the correct structure
  const statsData = json.data || json;

  if (!statsData || typeof statsData !== 'object') {
    return null;
  }
  
  // Merge stats with copy (using cached stepCopyMap)
  const enrichedStats = (statsData.sequence_step_stats || []).map(stat => ({
    // Stats from stats API
    sequence_step_id: stat.sequence_step_id,
    sent: stat.sent || 0,
    leads_contacted: stat.leads_contacted || 0,
    unique_opens: stat.unique_opens || 0,
    unique_replies: stat.unique_replies || 0,
    unsubscribed: stat.unsubscribed || 0,
    bounced: stat.bounced || 0,
    interested: stat.interested || 0,
    // Copy from sequence-steps API (cached)
    ...(stepCopyMap[stat.sequence_step_id] || {})
  }));

  // Extract and convert all fields properly
  const emailsSent = toInt(statsData.emails_sent);
  
  // Calculate total_leads_contacted from first emails only (exclude "Re:" subjects)
  let calculatedTotalLeadsContacted = 0;
  for (const stepStat of enrichedStats) {
    const emailSubject = stepStat.email_subject || '';
    // Only count steps that don't start with "Re:" (case-insensitive)
    if (emailSubject && !emailSubject.toLowerCase().trim().startsWith('re:')) {
      calculatedTotalLeadsContacted += toInt(stepStat.leads_contacted);
    }
  }
  
  // Log to verify calculation (for debugging)
  console.log(`Campaign ${id} on ${date}: emails_sent=${emailsSent}, calculated_total_leads_contacted=${calculatedTotalLeadsContacted} (from first emails only)`);

  return {
    emails_sent: emailsSent,
    total_leads_contacted: calculatedTotalLeadsContacted,
    opened: toInt(statsData.opened),
    opened_percentage: toFloat(statsData.opened_percentage),
    unique_opens_per_contact: toInt(statsData.unique_opens_per_contact),
    unique_opens_per_contact_percentage: toFloat(statsData.unique_opens_per_contact_percentage),
    unique_replies_per_contact: toInt(statsData.unique_replies_per_contact),
    unique_replies_per_contact_percentage: toFloat(statsData.unique_replies_per_contact_percentage),
    bounced: toInt(statsData.bounced),
    bounced_percentage: toFloat(statsData.bounced_percentage),
    unsubscribed: toInt(statsData.unsubscribed),
    unsubscribed_percentage: toFloat(statsData.unsubscribed_percentage),
    interested: toInt(statsData.interested),
    interested_percentage: toFloat(statsData.interested_percentage),
    sequence_step_stats: enrichedStats
  };

}

// --------------------------------------------------

async function storeSummary(c, data, date) {

  try {
    const row = {

      campaign_id: c.campaign_id,

      campaign_name: c.campaign_name,

      client: c.client,

      date,

      emails_sent: data.emails_sent || 0,

      total_leads_contacted: data.total_leads_contacted || 0,

      opened: data.opened || 0,

      opened_percentage: data.opened_percentage || 0,

      unique_opens_per_contact: data.unique_opens_per_contact || 0,

      unique_opens_per_contact_percentage: data.unique_opens_per_contact_percentage || 0,

      unique_replies_per_contact: data.unique_replies_per_contact || 0,

      unique_replies_per_contact_percentage: data.unique_replies_per_contact_percentage || 0,

      bounced: data.bounced || 0,

      bounced_percentage: data.bounced_percentage || 0,

      unsubscribed: data.unsubscribed || 0,

      unsubscribed_percentage: data.unsubscribed_percentage || 0,

      interested: data.interested || 0,

      interested_percentage: data.interested_percentage || 0,

      sequence_step_stats: data.sequence_step_stats || []

    };

    const result = await supabase.from("campaign_reporting").upsert(row, {

      onConflict: "campaign_id,client,date"

    });

    if (result.error) {
      console.error(`Error storing summary for campaign ${c.campaign_id} on ${date}:`, result.error);
      throw result.error;
    }

  } catch (err) {
    console.error(`Exception in storeSummary for campaign ${c.campaign_id} on ${date}:`, err);
    throw err;
  }

}

// --------------------------------------------------

async function checkExistingData(campaignId, client, date) {
  try {
    const { data, error } = await supabase
      .from("campaign_reporting")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("client", client)
      .eq("date", date)
      .single();
    
    return !error && data !== null;
  } catch (err) {
    return false;
  }
}

// --------------------------------------------------

async function processCampaigns() {

  try {

    console.log("Starting campaign-stats worker...");

    

    // Check env vars

    if (!Deno.env.get("SUPABASE_URL")) {

      throw new Error("SUPABASE_URL not set");

    }

    if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {

      throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");

    }

    

    // Generate dates for the past 7 days (including today) - reduced to prevent timeouts
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }

    

    console.log(`Fetching campaigns from last 60 days...`);

    const campaigns = await getRecent();

    console.log(`Found ${campaigns.length} campaigns`);

    console.log(`Processing last 7 days (${dates.length} dates)`);

    

    const results = [];

    for (const c of campaigns){

      console.log(`Processing campaign: ${c.campaign_id} - ${c.campaign_name}`);

      

      const apiKey = await getApiKey(c.client);

      if (!apiKey) {

        console.log(`No API key for client: ${c.client}`);

        continue;

      }

      // Fetch sequence steps ONCE per campaign (cache it)
      console.log(`  Fetching sequence steps for campaign ${c.campaign_id}...`);
      const sequenceSteps = await fetchSequenceSteps(c.campaign_id, apiKey);
      
      // Create lookup map for copy by step ID (cached for all dates)
      const stepCopyMap = {};
      for (const step of sequenceSteps) {
        stepCopyMap[step.id] = {
          email_subject: step.email_subject,
          email_body: stripHtml(step.email_body),
          order: parseInt(step.order, 10) || 0,
          wait_in_days: parseInt(step.wait_in_days, 10) || 0,
          variant: step.variant,
          thread_reply: step.thread_reply
        };
      }
      console.log(`  Cached ${Object.keys(stepCopyMap).length} sequence steps`);

      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      for (const d of dates){

        try {
          // Skip if data already exists
          const exists = await checkExistingData(c.campaign_id, c.client, d);
          if (exists) {
            console.log(`  Skipping ${d} - data already exists`);
            continue;
          }

          const stats = await fetchStats(c.campaign_id, apiKey, d, stepCopyMap);

          // skip campaigns with no sequence

          if (!stats) {

            results.push({

              campaign_id: c.campaign_id,

              skipped: true,

              reason: "no sequence"

            });

            continue;

          }

          await storeSummary(c, stats, d);

          results.push({

            campaign_id: c.campaign_id,

            campaign_name: c.campaign_name,

            client: c.client,

            date: d,

            stats

          });

          console.log(`  ✓ Stored stats for ${c.campaign_id} on ${d} - total_leads_contacted: ${stats.total_leads_contacted}, sequence_steps: ${stats.sequence_step_stats?.length || 0}`);

          // Add delay between API calls to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (err) {

          console.error(`  Error processing campaign ${c.campaign_id} on ${d}:`, err.message);

          results.push({

            campaign_id: c.campaign_id,

            date: d,

            error: err.message

          });

          // Add delay even on error
          await new Promise(resolve => setTimeout(resolve, 300));

        }

      }

      // Add delay between campaigns
      await new Promise(resolve => setTimeout(resolve, 1000));

    }

    

    console.log(`Completed processing ${results.length} results`);

  } catch (err) {

    console.error("FATAL ERROR:", err.message, err.stack);

  }

}

// --------------------------------------------------

Deno.serve(async ()=>{

  // Start processing in background and return immediately
  processCampaigns().catch(err => {
    console.error("Background processing error:", err);
  });

  return new Response(JSON.stringify({

    ok: true,

    message: "Processing started in background"

  }, null, 2), {

    status: 200,

    headers: {

      "Content-Type": "application/json"

    }

  });

});
