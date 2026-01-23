/**
 * Script to list all Claude Skills in your Anthropic workspace
 * and find the skill_id for your custom skills.
 * 
 * Usage: npx tsx scripts/list-claude-skills.ts
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

interface Skill {
  id: string;
  name: string;
  description?: string;
  source: 'anthropic' | 'custom';
  created_at?: string;
  updated_at?: string;
}

interface ListSkillsResponse {
  data: Skill[];
  has_more: boolean;
}

async function listSkills(): Promise<void> {
  console.log('Fetching Claude Skills from Anthropic API...\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/skills', {
      method: 'GET',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'skills-2025-10-02',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);
      process.exit(1);
    }

    const data: ListSkillsResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log('No skills found in your workspace.');
      return;
    }

    // Separate Anthropic and custom skills
    const anthropicSkills = data.data.filter(s => s.source === 'anthropic');
    const customSkills = data.data.filter(s => s.source === 'custom');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    ANTHROPIC SKILLS                        ');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (anthropicSkills.length > 0) {
      for (const skill of anthropicSkills) {
        console.log(`  Name: ${skill.name}`);
        console.log(`  ID:   ${skill.id}`);
        console.log(`  Type: anthropic (pre-built)`);
        if (skill.description) {
          console.log(`  Desc: ${skill.description}`);
        }
        console.log('');
      }
    } else {
      console.log('  No Anthropic pre-built skills available.\n');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                     CUSTOM SKILLS                          ');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (customSkills.length > 0) {
      for (const skill of customSkills) {
        console.log(`  Name: ${skill.name}`);
        console.log(`  ID:   ${skill.id}`);
        console.log(`  Type: custom`);
        if (skill.description) {
          console.log(`  Desc: ${skill.description}`);
        }
        if (skill.created_at) {
          console.log(`  Created: ${skill.created_at}`);
        }
        console.log('');
      }

      // Highlight email-copy skill if found
      const emailCopySkill = customSkills.find(s => 
        s.name.toLowerCase().includes('email') || 
        s.name.toLowerCase().includes('copy')
      );

      if (emailCopySkill) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('                  EMAIL-COPY SKILL FOUND!                   ');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log(`  Use this skill_id in your edge function:`);
        console.log(`  \x1b[32m${emailCopySkill.id}\x1b[0m\n`);
        console.log(`  Set as environment variable:`);
        console.log(`  \x1b[33mexport EMAIL_COPY_SKILL_ID="${emailCopySkill.id}"\x1b[0m\n`);
      }
    } else {
      console.log('  No custom skills found.\n');
    }

  } catch (error) {
    console.error('Error fetching skills:', error);
    process.exit(1);
  }
}

listSkills();
