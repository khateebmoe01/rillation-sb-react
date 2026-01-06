// Debug script to check total_leads_contacted in database vs what should be
// Usage: node scripts/debug-leads-contacted.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  try {
    const clientName = "Barakat Transport";
    console.log(`\n=== Debugging total_leads_contacted for ${clientName} ===\n`);

    // Get recent campaign reporting data
    const { data: campaignData, error } = await supabase
      .from("campaign_reporting")
      .select("*")
      .eq("client", clientName)
      .gte("date", "2025-12-16")
      .lte("date", "2025-12-26")
      .order("date", { ascending: false })
      .order("campaign_name", { ascending: true });

    if (error) {
      console.error("Error fetching data:", error);
      return;
    }

    if (!campaignData || campaignData.length === 0) {
      console.log("No campaign data found for this date range");
      return;
    }

    console.log(`Found ${campaignData.length} rows\n`);

    // Group by campaign
    const campaignMap = new Map();
    campaignData.forEach(row => {
      const key = row.campaign_name || 'Unknown';
      if (!campaignMap.has(key)) {
        campaignMap.set(key, []);
      }
      campaignMap.get(key).push(row);
    });

    console.log(`Campaigns found: ${campaignMap.size}\n`);

    // Analyze each campaign
    for (const [campaignName, rows] of campaignMap.entries()) {
      console.log(`\n=== Campaign: ${campaignName} ===`);
      
      const totalEmailsSent = rows.reduce((sum, r) => sum + (r.emails_sent || 0), 0);
      const totalLeadsContacted = rows.reduce((sum, r) => sum + (r.total_leads_contacted || 0), 0);
      
      console.log(`  Total rows: ${rows.length}`);
      console.log(`  Total emails_sent: ${totalEmailsSent.toLocaleString()}`);
      console.log(`  Total leads_contacted (sum): ${totalLeadsContacted.toLocaleString()}`);
      
      // Show breakdown by date
      console.log(`\n  Daily breakdown:`);
      rows.forEach(row => {
        console.log(`    ${row.date}:`);
        console.log(`      - emails_sent: ${(row.emails_sent || 0).toLocaleString()}`);
        console.log(`      - total_leads_contacted: ${(row.total_leads_contacted || 0).toLocaleString()}`);
        
        // Check if sequence_step_stats exists
        if (row.sequence_step_stats && Array.isArray(row.sequence_step_stats)) {
          console.log(`      - sequence_steps: ${row.sequence_step_stats.length}`);
          
          // Calculate what it should be
          let calculated = 0;
          let stepsWithSubject = 0;
          let stepsWithoutSubject = 0;
          
          row.sequence_step_stats.forEach((step, idx) => {
            const subject = step.email_subject || '';
            const leads = parseInt(step.leads_contacted || 0, 10);
            const isRe = subject.toLowerCase().trim().startsWith('re:');
            
            if (subject && !isRe) {
              calculated += leads;
              stepsWithSubject++;
            } else {
              stepsWithoutSubject++;
            }
          });
          
          console.log(`      - Calculated from steps (non-Re: only): ${calculated.toLocaleString()}`);
          console.log(`      - Steps with subject (non-Re:): ${stepsWithSubject}`);
          console.log(`      - Steps excluded (Re: or no subject): ${stepsWithoutSubject}`);
          
          if (calculated !== (row.total_leads_contacted || 0)) {
            console.log(`      ⚠️  MISMATCH: Stored=${row.total_leads_contacted}, Calculated=${calculated}`);
          }
        } else {
          console.log(`      - sequence_step_stats: Not available in row`);
        }
      });
    }

    // Summary
    console.log(`\n=== SUMMARY ===`);
    const allTotalEmails = campaignData.reduce((sum, r) => sum + (r.emails_sent || 0), 0);
    const allTotalLeads = campaignData.reduce((sum, r) => sum + (r.total_leads_contacted || 0), 0);
    console.log(`Total emails_sent (all campaigns): ${allTotalEmails.toLocaleString()}`);
    console.log(`Total leads_contacted (all campaigns): ${allTotalLeads.toLocaleString()}`);
    console.log(`\n`);

  } catch (err) {
    console.error("ERROR:", err.message, err.stack);
  }
}

main();












