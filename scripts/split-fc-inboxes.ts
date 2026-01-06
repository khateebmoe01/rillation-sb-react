/**
 * Split First Capital inboxes into two sets
 * 
 * This script:
 * 1. Creates two tags: "FC - 12/18 - Set 1" and "FC - 12/18 - Set 2"
 * 2. Fetches all sender emails from the First Capital workspace
 * 3. Groups them by domain and provider type (Google vs Custom/IMAP)
 * 4. Splits domains into two sets (half Google + half Custom in each)
 * 5. Attaches the appropriate tag to each inbox
 * 
 * Requirements:
 * - Set INSTANTLY_API_TOKEN environment variable with your API token
 * - The API token must be for the First Capital workspace
 */

const API_BASE = 'https://send.rillationrevenue.com/api';

// Get API token from environment
const API_TOKEN = process.env.INSTANTLY_API_TOKEN;

if (!API_TOKEN) {
  console.error('Error: INSTANTLY_API_TOKEN environment variable is required');
  console.error('Usage: INSTANTLY_API_TOKEN=your_token npx ts-node scripts/split-fc-inboxes.ts');
  process.exit(1);
}

interface SenderEmail {
  id: number;
  name: string;
  email: string;
  imap_server: string | null;
  smtp_server: string | null;
  type: string;
  status: string;
  daily_limit: number;
  provider?: string;
  // Add other fields as needed
}

interface Tag {
  id: number;
  name: string;
  default: boolean;
}

interface DomainGroup {
  domain: string;
  provider: 'google' | 'custom' | 'outlook' | 'other';
  inboxes: SenderEmail[];
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${error}`);
  }

  return response.json();
}

async function getSenderEmails(): Promise<SenderEmail[]> {
  console.log('Fetching sender emails...');
  
  let allEmails: SenderEmail[] = [];
  let page = 1;
  const limit = 100;
  
  while (true) {
    const response = await apiRequest<{ data: SenderEmail[] }>(
      `/sender-emails?limit=${limit}&skip=${(page - 1) * limit}`
    );
    
    if (!response.data || response.data.length === 0) {
      break;
    }
    
    allEmails = [...allEmails, ...response.data];
    console.log(`  Fetched page ${page}: ${response.data.length} emails (total: ${allEmails.length})`);
    
    if (response.data.length < limit) {
      break;
    }
    
    page++;
  }
  
  console.log(`Total sender emails: ${allEmails.length}`);
  return allEmails;
}

async function createTag(name: string): Promise<Tag> {
  console.log(`Creating tag: "${name}"...`);
  
  try {
    const response = await apiRequest<{ data: Tag }>('/tags', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        default: false,
      }),
    });
    
    console.log(`  Created tag with ID: ${response.data.id}`);
    return response.data;
  } catch (error: any) {
    // Tag might already exist, try to find it
    console.log(`  Tag creation failed, checking if it already exists...`);
    const tagsResponse = await apiRequest<{ data: Tag[] }>('/tags');
    const existingTag = tagsResponse.data.find(t => t.name === name);
    
    if (existingTag) {
      console.log(`  Found existing tag with ID: ${existingTag.id}`);
      return existingTag;
    }
    
    throw error;
  }
}

async function attachTagsToEmails(
  senderEmailIds: number[],
  tagIds: number[]
): Promise<void> {
  console.log(`Attaching tags ${tagIds} to ${senderEmailIds.length} sender emails...`);
  
  await apiRequest('/tags/attach-to-sender-emails', {
    method: 'POST',
    body: JSON.stringify({
      sender_email_ids: senderEmailIds,
      tag_ids: tagIds,
      skip_webhooks: true,
    }),
  });
  
  console.log('  Tags attached successfully');
}

function determineProvider(email: SenderEmail): 'google' | 'custom' | 'outlook' | 'other' {
  const emailLower = email.email.toLowerCase();
  const imapServer = (email.imap_server || '').toLowerCase();
  const smtpServer = (email.smtp_server || '').toLowerCase();
  
  // Check for Google
  if (
    emailLower.endsWith('@gmail.com') ||
    imapServer.includes('gmail') ||
    imapServer.includes('google') ||
    smtpServer.includes('gmail') ||
    smtpServer.includes('google')
  ) {
    return 'google';
  }
  
  // Check for Outlook/Microsoft
  if (
    emailLower.endsWith('@outlook.com') ||
    emailLower.endsWith('@hotmail.com') ||
    emailLower.endsWith('@live.com') ||
    imapServer.includes('outlook') ||
    imapServer.includes('office365') ||
    smtpServer.includes('outlook') ||
    smtpServer.includes('office365')
  ) {
    return 'outlook';
  }
  
  // If has IMAP/SMTP server configured, it's custom
  if (email.imap_server && email.smtp_server) {
    return 'custom';
  }
  
  return 'other';
}

function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts[1] || '';
}

function groupByDomain(emails: SenderEmail[]): DomainGroup[] {
  const domainMap = new Map<string, DomainGroup>();
  
  for (const email of emails) {
    const domain = extractDomain(email.email);
    const provider = determineProvider(email);
    
    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        domain,
        provider,
        inboxes: [],
      });
    }
    
    domainMap.get(domain)!.inboxes.push(email);
  }
  
  return Array.from(domainMap.values());
}

function splitDomainGroups(groups: DomainGroup[]): { set1: DomainGroup[]; set2: DomainGroup[] } {
  // Separate by provider type
  const googleDomains = groups.filter(g => g.provider === 'google');
  const customDomains = groups.filter(g => g.provider === 'custom');
  const outlookDomains = groups.filter(g => g.provider === 'outlook');
  const otherDomains = groups.filter(g => g.provider === 'other');
  
  console.log('\nDomain breakdown:');
  console.log(`  Google domains: ${googleDomains.length}`);
  console.log(`  Custom domains: ${customDomains.length}`);
  console.log(`  Outlook domains: ${outlookDomains.length}`);
  console.log(`  Other domains: ${otherDomains.length}`);
  
  // Split each category in half
  const halfGoogle = Math.ceil(googleDomains.length / 2);
  const halfCustom = Math.ceil(customDomains.length / 2);
  const halfOutlook = Math.ceil(outlookDomains.length / 2);
  const halfOther = Math.ceil(otherDomains.length / 2);
  
  const set1: DomainGroup[] = [
    ...googleDomains.slice(0, halfGoogle),
    ...customDomains.slice(0, halfCustom),
    ...outlookDomains.slice(0, halfOutlook),
    ...otherDomains.slice(0, halfOther),
  ];
  
  const set2: DomainGroup[] = [
    ...googleDomains.slice(halfGoogle),
    ...customDomains.slice(halfCustom),
    ...outlookDomains.slice(halfOutlook),
    ...otherDomains.slice(halfOther),
  ];
  
  return { set1, set2 };
}

function getInboxIdsFromGroups(groups: DomainGroup[]): number[] {
  return groups.flatMap(g => g.inboxes.map(inbox => inbox.id));
}

async function main() {
  console.log('='.repeat(60));
  console.log('Split First Capital Inboxes into Two Sets');
  console.log('='.repeat(60));
  console.log('');
  
  // Step 1: Create tags
  console.log('Step 1: Creating tags...');
  const tag1 = await createTag('FC - 12/18 - Set 1');
  const tag2 = await createTag('FC - 12/18 - Set 2');
  console.log('');
  
  // Step 2: Get all sender emails
  console.log('Step 2: Fetching sender emails...');
  const emails = await getSenderEmails();
  console.log('');
  
  if (emails.length === 0) {
    console.log('No sender emails found. Make sure the API token is for the correct workspace.');
    return;
  }
  
  // Step 3: Group by domain
  console.log('Step 3: Grouping by domain...');
  const domainGroups = groupByDomain(emails);
  console.log(`Found ${domainGroups.length} unique domains`);
  
  // Print domain details
  console.log('\nDomain details:');
  for (const group of domainGroups) {
    console.log(`  ${group.domain} (${group.provider}): ${group.inboxes.length} inboxes`);
  }
  console.log('');
  
  // Step 4: Split into two sets
  console.log('Step 4: Splitting into two sets...');
  const { set1, set2 } = splitDomainGroups(domainGroups);
  
  const set1Ids = getInboxIdsFromGroups(set1);
  const set2Ids = getInboxIdsFromGroups(set2);
  
  console.log(`\nSet 1: ${set1.length} domains, ${set1Ids.length} inboxes`);
  for (const group of set1) {
    console.log(`  - ${group.domain} (${group.provider}): ${group.inboxes.length} inboxes`);
  }
  
  console.log(`\nSet 2: ${set2.length} domains, ${set2Ids.length} inboxes`);
  for (const group of set2) {
    console.log(`  - ${group.domain} (${group.provider}): ${group.inboxes.length} inboxes`);
  }
  console.log('');
  
  // Step 5: Attach tags
  console.log('Step 5: Attaching tags...');
  
  if (set1Ids.length > 0) {
    await attachTagsToEmails(set1Ids, [tag1.id]);
  } else {
    console.log('  No inboxes for Set 1, skipping tag attachment');
  }
  
  if (set2Ids.length > 0) {
    await attachTagsToEmails(set2Ids, [tag2.id]);
  } else {
    console.log('  No inboxes for Set 2, skipping tag attachment');
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Done!');
  console.log('='.repeat(60));
  console.log(`\nSummary:`);
  console.log(`  Tag "${tag1.name}" (ID: ${tag1.id}) -> ${set1Ids.length} inboxes`);
  console.log(`  Tag "${tag2.name}" (ID: ${tag2.id}) -> ${set2Ids.length} inboxes`);
}

main().catch(console.error);



















