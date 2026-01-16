// Edge Function: manage-inbox-tags
// CRUD operations for tags - syncs with EmailBison API
// Actions: create, delete, attach, detach

import { createClient } from "npm:@supabase/supabase-js@2.26.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get API key for a client
async function getClientApiKey(clientName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('Clients')
    .select('"Api Key - Bison"')
    .eq('Business', clientName)
    .single();

  if (error || !data) return null;
  return data['Api Key - Bison'];
}

// Create a tag in Bison and locally
async function createTag(apiKey: string, clientName: string, tagName: string) {
  // Create in Bison first
  const res = await fetch('https://send.rillationrevenue.com/api/tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      name: tagName,
      default: false
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Bison API error: ${res.status} - ${errorText}`);
  }

  const json = await res.json();
  const bisonTag = json.data || json;

  // Insert locally
  const { data, error } = await supabase
    .from('inbox_tags')
    .insert({
      bison_tag_id: bisonTag.id,
      name: bisonTag.name,
      client: clientName,
      is_default: false,
      synced_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

// Delete a tag from Bison and locally
async function deleteTag(apiKey: string, tagId: string) {
  // Get the bison_tag_id first
  const { data: tag, error: fetchError } = await supabase
    .from('inbox_tags')
    .select('bison_tag_id')
    .eq('id', tagId)
    .single();

  if (fetchError || !tag) throw new Error('Tag not found');

  // Delete from Bison
  const res = await fetch(`https://send.rillationrevenue.com/api/tags/${tag.bison_tag_id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Bison API error: ${res.status} - ${errorText}`);
  }

  // Delete locally (cascade will remove assignments)
  const { error } = await supabase
    .from('inbox_tags')
    .delete()
    .eq('id', tagId);

  if (error) throw error;

  return { deleted: true };
}

// Attach tags to inboxes
async function attachTags(apiKey: string, tagIds: string[], inboxIds: number[]) {
  // Get bison_tag_ids
  const { data: tags, error: tagsError } = await supabase
    .from('inbox_tags')
    .select('id, bison_tag_id')
    .in('id', tagIds);

  if (tagsError || !tags) throw new Error('Tags not found');

  const bisonTagIds = tags.map(t => t.bison_tag_id);

  // Get bison_inbox_ids
  const { data: inboxes, error: inboxesError } = await supabase
    .from('inboxes')
    .select('id, bison_inbox_id')
    .in('id', inboxIds);

  if (inboxesError || !inboxes) throw new Error('Inboxes not found');

  const bisonInboxIds = inboxes.map(i => i.bison_inbox_id).filter(Boolean);

  if (bisonInboxIds.length === 0) {
    throw new Error('No valid Bison inbox IDs found');
  }

  // Attach in Bison
  const res = await fetch('https://send.rillationrevenue.com/api/tags/attach-to-sender-emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      tag_ids: bisonTagIds,
      sender_email_ids: bisonInboxIds,
      skip_webhooks: true
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Bison API error: ${res.status} - ${errorText}`);
  }

  // Update local assignments
  const assignments = [];
  for (const inboxId of inboxIds) {
    for (const tagId of tagIds) {
      assignments.push({ inbox_id: inboxId, tag_id: tagId });
    }
  }

  await supabase
    .from('inbox_tag_assignments')
    .upsert(assignments, { onConflict: 'inbox_id,tag_id' });

  // Update tags JSONB on inboxes
  for (const inboxId of inboxIds) {
    const { data: existing } = await supabase
      .from('inboxes')
      .select('tags')
      .eq('id', inboxId)
      .single();

    const currentTags = existing?.tags || [];
    const newTags = [...new Set([...currentTags, ...tagIds])];

    await supabase
      .from('inboxes')
      .update({ tags: newTags })
      .eq('id', inboxId);
  }

  return { attached: true, count: assignments.length };
}

// Detach tags from inboxes
async function detachTags(apiKey: string, tagIds: string[], inboxIds: number[]) {
  // Get bison_tag_ids
  const { data: tags, error: tagsError } = await supabase
    .from('inbox_tags')
    .select('id, bison_tag_id')
    .in('id', tagIds);

  if (tagsError || !tags) throw new Error('Tags not found');

  const bisonTagIds = tags.map(t => t.bison_tag_id);

  // Get bison_inbox_ids
  const { data: inboxes, error: inboxesError } = await supabase
    .from('inboxes')
    .select('id, bison_inbox_id')
    .in('id', inboxIds);

  if (inboxesError || !inboxes) throw new Error('Inboxes not found');

  const bisonInboxIds = inboxes.map(i => i.bison_inbox_id).filter(Boolean);

  if (bisonInboxIds.length > 0) {
    // Detach in Bison
    const res = await fetch('https://send.rillationrevenue.com/api/tags/attach-to-sender-emails', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        tag_ids: bisonTagIds,
        sender_email_ids: bisonInboxIds,
        skip_webhooks: true
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Bison API error: ${res.status} - ${errorText}`);
    }
  }

  // Remove local assignments
  await supabase
    .from('inbox_tag_assignments')
    .delete()
    .in('inbox_id', inboxIds)
    .in('tag_id', tagIds);

  // Update tags JSONB on inboxes
  for (const inboxId of inboxIds) {
    const { data: existing } = await supabase
      .from('inboxes')
      .select('tags')
      .eq('id', inboxId)
      .single();

    const currentTags = existing?.tags || [];
    const newTags = currentTags.filter((t: string) => !tagIds.includes(t));

    await supabase
      .from('inboxes')
      .update({ tags: newTags })
      .eq('id', inboxId);
  }

  return { detached: true };
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, client, tag_name, tag_id, tag_ids, inbox_ids } = body;

    if (!client) {
      return new Response(JSON.stringify({ ok: false, error: 'client is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = await getClientApiKey(client);
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'No API key for client' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let result;

    switch (action) {
      case 'create':
        if (!tag_name) throw new Error('tag_name is required');
        result = await createTag(apiKey, client, tag_name);
        break;

      case 'delete':
        if (!tag_id) throw new Error('tag_id is required');
        result = await deleteTag(apiKey, tag_id);
        break;

      case 'attach':
        if (!tag_ids || !inbox_ids) throw new Error('tag_ids and inbox_ids are required');
        result = await attachTags(apiKey, tag_ids, inbox_ids);
        break;

      case 'detach':
        if (!tag_ids || !inbox_ids) throw new Error('tag_ids and inbox_ids are required');
        result = await detachTags(apiKey, tag_ids, inbox_ids);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
