/**
 * Script to create a custom email-copy skill via the Anthropic Skills API
 * 
 * Usage: npx tsx scripts/create-email-copy-skill.ts
 * 
 * Requires: ANTHROPIC_API_KEY environment variable
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required');
  console.log('\nSet it with:');
  console.log('  export ANTHROPIC_API_KEY=your-api-key');
  process.exit(1);
}

// The email-copy skill content - this is the SKILL.md content
const SKILL_MD_CONTENT = `---
name: email-copy
description: Expert B2B cold email copywriter that creates high-converting email sequences with A/B variations for outbound campaigns.
---

# Email Copy Generation Skill

You are an expert B2B cold email copywriter. Create high-converting email sequences for outbound campaigns.

## Output Format

For each email, output:

**Subject A:** [subject with spintax]
**Subject B:** [subject with spintax]

---

[Email body with {{variables}} and {spintax}]

---

**Variables needed:** [list]
**Word count:** [number]
**Score:** [0-100]
**Notes:** [personalization guidance]

## Generation Workflow

1. **Campaign Setup:** Define offer, perfect signal sentence, 3-5 features
2. **Research (10 min):** Hunt case studies → custom signals → standard variables
3. **Choose Strategy:** Custom signal, creative ideas, whole offer, or fallback
4. **Draft Variants:** 3 variants with different openers, value props, CTAs
5. **QA:** Run checklist
6. **Output:** JSON with variants, subjects, variables, score

## Copy Guidelines

Your copy must be:
- Conversational and human (5th grade reading level)
- Short and punchy (under 75 words for Email 1)
- Value-focused (what's in it for them)
- Personalized using {{variables}} filled by Clay/data enrichment
- Pre-sale focused (growth, not retention)
- Single CTA per email
- Grammatically correct
- No company name in pain questions

## Variable Syntax

- Use \`{{variable}}\` for personalization (filled by Clay)
- Use \`{option1|option2|option3}\` for spintax variations

## Email Structure

### Email 1 (Opener) - Variations 1A, 1B, 1C
- Under 75 words each
- Different hooks/angles for testing
- Intriguing, personal, creates curiosity

### Email 2 (Follow-up) - Variations 2A, 2B  
- Value-add or context follow-up
- Different value props for testing
- Reference previous email subtly

### Email 3 (Final Touch) - Variations 3A, 3B
- Direct ask or referral request
- Softer close, respect their time
- Clear but not pushy

## CTAs to Use

- "Worth a convo?"
- "Worth sharing some thoughts?"
- "Open to a quick chat?"
- "Worth 15 minutes this week?"

## What to Avoid

- Generic openers ("Hope this email finds you well")
- Company name in pain questions
- Multiple CTAs in one email
- Robotic, formal language
- Long paragraphs
- Retention focus (use growth/acquisition angle)
`;

async function createSkill(): Promise<void> {
  console.log('Creating email-copy skill via Anthropic Skills API...\n');

  try {
    // First, check if skill already exists
    console.log('Checking for existing custom skills...');
    const listResponse = await fetch('https://api.anthropic.com/v1/skills?source=custom', {
      method: 'GET',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'skills-2025-10-02',
      },
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('Existing custom skills:', JSON.stringify(listData, null, 2));
      
      if (listData.data && listData.data.length > 0) {
        const existingSkill = listData.data.find((s: any) => 
          s.name?.toLowerCase().includes('email') || 
          s.name?.toLowerCase().includes('copy') ||
          s.display_title?.toLowerCase().includes('email') ||
          s.display_title?.toLowerCase().includes('copy')
        );
        
        if (existingSkill) {
          console.log('\n═══════════════════════════════════════════════════════════');
          console.log('              EXISTING SKILL FOUND!                          ');
          console.log('═══════════════════════════════════════════════════════════\n');
          console.log(`  Name: ${existingSkill.name || existingSkill.display_title}`);
          console.log(`  ID:   \x1b[32m${existingSkill.id}\x1b[0m`);
          console.log(`  Created: ${existingSkill.created_at}\n`);
          console.log('  Set this in Supabase:');
          console.log(`  \x1b[33msupabase secrets set EMAIL_COPY_SKILL_ID="${existingSkill.id}"\x1b[0m\n`);
          return;
        }
      }
    } else {
      const errorText = await listResponse.text();
      console.log('List skills response:', listResponse.status, errorText);
    }

    // Create the skill using multipart form data
    console.log('\nCreating new skill with multipart upload...');
    
    // Create form data with the SKILL.md file
    const formData = new FormData();
    const skillFile = new Blob([SKILL_MD_CONTENT], { type: 'text/markdown' });
    formData.append('files[]', skillFile, 'email-copy/SKILL.md');
    
    const response = await fetch('https://api.anthropic.com/v1/skills', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'skills-2025-10-02',
      },
      body: formData,
    });

    const responseText = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${responseText}`);

    if (!response.ok) {
      console.error(`\nAPI Error: ${response.status}`);
      
      // If multipart doesn't work, the skill might need to be created in the console
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('           MANUAL SKILL CREATION REQUIRED                   ');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('The Skills API may require creating skills through the Console.');
      console.log('\nAlternative approach - use the system prompt instead:');
      console.log('The edge function already has a fallback that uses a detailed');
      console.log('system prompt when no skill_id is configured.\n');
      console.log('To use this fallback effectively, I can update the system prompt');
      console.log('with your exact skill instructions.\n');
      return;
    }

    const data = JSON.parse(responseText);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('              SKILL CREATED SUCCESSFULLY!                   ');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  Name: ${data.name || data.display_title}`);
    console.log(`  ID:   \x1b[32m${data.id}\x1b[0m`);
    console.log(`  Created: ${data.created_at}\n`);
    console.log('  Now set this in Supabase:');
    console.log(`  \x1b[33msupabase secrets set EMAIL_COPY_SKILL_ID="${data.id}"\x1b[0m\n`);

  } catch (error) {
    console.error('Error creating skill:', error);
    process.exit(1);
  }
}

createSkill();
