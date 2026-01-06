/**
 * SmartLead Bulk Lead Deletion Script
 * 
 * This script deletes all leads from SmartLead campaigns,
 * EXCEPT campaigns belonging to client ID 27591 (Parcel Path).
 * 
 * Usage:
 *   npx tsx scripts/delete-smartlead-leads.ts --dry-run    # Preview what would be deleted
 *   npx tsx scripts/delete-smartlead-leads.ts              # Actually delete leads
 */

const API_KEY = 'c4874e0b-2ecd-4714-ab84-35ee82be8be2_7ahhxjz';
const BASE_URL = 'https://server.smartlead.ai/api/v1';
const EXCLUDED_CLIENT_ID = 27591; // Parcel Path client ID

// Rate limiting: SmartLead has rate limits, so we add delays
const DELAY_BETWEEN_REQUESTS_MS = 100;
const DELAY_BETWEEN_CAMPAIGNS_MS = 500;

interface Campaign {
  id: number;
  name: string;
  client_id?: number;
  status?: string;
}

interface Lead {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllCampaigns(): Promise<Campaign[]> {
  console.log('📋 Fetching all campaigns...');
  
  const url = `${BASE_URL}/campaigns?api_key=${API_KEY}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch campaigns: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log(`   Found ${data.length || 0} total campaigns`);
  return data || [];
}

async function fetchLeadsForCampaign(campaignId: number): Promise<Lead[]> {
  const allLeads: Lead[] = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const url = `${BASE_URL}/campaigns/${campaignId}/leads?api_key=${API_KEY}&offset=${offset}&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ⚠️  Failed to fetch leads for campaign ${campaignId}: ${response.status}`);
      break;
    }
    
    const data = await response.json();
    const leads = data.leads || data || [];
    
    if (!leads.length) break;
    
    allLeads.push(...leads);
    
    if (leads.length < limit) break;
    
    offset += limit;
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }
  
  return allLeads;
}

async function deleteLead(campaignId: number, leadId: number): Promise<boolean> {
  const url = `${BASE_URL}/campaigns/${campaignId}/leads/${leadId}?api_key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`   ❌ Failed to delete lead ${leadId}: ${response.status} - ${errorText}`);
    return false;
  }
  
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SmartLead Bulk Lead Deletion Script');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${isDryRun ? '🔍 DRY RUN (no deletions)' : '🗑️  LIVE DELETION'}`);
  console.log(`  Excluding: Client ID ${EXCLUDED_CLIENT_ID} (Parcel Path)`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Fetch all campaigns
    const allCampaigns = await fetchAllCampaigns();
    
    // Step 2: Filter out Parcel Path campaigns
    const campaignsToProcess = allCampaigns.filter(c => c.client_id !== EXCLUDED_CLIENT_ID);
    const excludedCampaigns = allCampaigns.filter(c => c.client_id === EXCLUDED_CLIENT_ID);
    
    console.log(`\n📊 Campaign Summary:`);
    console.log(`   Total campaigns: ${allCampaigns.length}`);
    console.log(`   Excluded (Parcel Path): ${excludedCampaigns.length}`);
    console.log(`   To process: ${campaignsToProcess.length}`);
    
    if (excludedCampaigns.length > 0) {
      console.log(`\n🛡️  Excluded Campaigns (Parcel Path - Client ID ${EXCLUDED_CLIENT_ID}):`);
      excludedCampaigns.forEach(c => {
        console.log(`   - [${c.id}] ${c.name}`);
      });
    }
    
    // Step 3: Collect lead counts for each campaign
    console.log('\n📥 Fetching lead counts for campaigns to process...\n');
    
    interface CampaignLeadData {
      campaign: Campaign;
      leads: Lead[];
    }
    
    const campaignLeadData: CampaignLeadData[] = [];
    let totalLeads = 0;
    
    for (let i = 0; i < campaignsToProcess.length; i++) {
      const campaign = campaignsToProcess[i];
      process.stdout.write(`   [${i + 1}/${campaignsToProcess.length}] ${campaign.name} (ID: ${campaign.id})... `);
      
      const leads = await fetchLeadsForCampaign(campaign.id);
      console.log(`${leads.length} leads`);
      
      campaignLeadData.push({ campaign, leads });
      totalLeads += leads.length;
      
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  TOTAL LEADS TO DELETE: ${totalLeads}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (isDryRun) {
      console.log('🔍 DRY RUN COMPLETE - No leads were deleted.');
      console.log('   Run without --dry-run flag to perform actual deletion.');
      return;
    }
    
    // Step 4: Delete leads
    console.log('🗑️  Starting deletion process...\n');
    
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const { campaign, leads } of campaignLeadData) {
      if (leads.length === 0) continue;
      
      console.log(`\n📧 Processing: ${campaign.name} (${leads.length} leads)`);
      
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const success = await deleteLead(campaign.id, lead.id);
        
        if (success) {
          deletedCount++;
        } else {
          failedCount++;
        }
        
        // Progress update every 10 leads
        if ((i + 1) % 10 === 0 || i === leads.length - 1) {
          process.stdout.write(`\r   Progress: ${i + 1}/${leads.length} leads processed`);
        }
        
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      }
      console.log(); // New line after progress
      
      await sleep(DELAY_BETWEEN_CAMPAIGNS_MS);
    }
    
    // Step 5: Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  DELETION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  ✅ Successfully deleted: ${deletedCount}`);
    console.log(`  ❌ Failed: ${failedCount}`);
    console.log(`  📊 Total processed: ${deletedCount + failedCount}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();




