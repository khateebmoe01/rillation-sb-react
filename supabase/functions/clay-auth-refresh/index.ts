import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Clay credentials from secrets
    const clayEmail = Deno.env.get('CLAY_EMAIL')
    const clayPassword = Deno.env.get('CLAY_PASSWORD')

    if (!clayEmail || !clayPassword) {
      throw new Error('CLAY_EMAIL and CLAY_PASSWORD secrets must be configured')
    }

    console.log('Authenticating with Clay API...')

    // Call Clay auth endpoint
    const authResponse = await fetch('https://api.clay.com/v3/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: clayEmail,
        password: clayPassword,
        source: null,
      }),
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      throw new Error(`Clay auth failed: ${authResponse.status} - ${errorText}`)
    }

    // Extract session cookie from Set-Cookie header
    const setCookieHeader = authResponse.headers.get('set-cookie')
    if (!setCookieHeader) {
      throw new Error('No Set-Cookie header in Clay auth response')
    }

    // Parse the claysession cookie value
    // Format: claysession=xxx; Path=/; HttpOnly; Secure; SameSite=None
    const sessionMatch = setCookieHeader.match(/claysession=([^;]+)/)
    if (!sessionMatch) {
      throw new Error('Could not find claysession in Set-Cookie header')
    }

    const sessionCookie = `claysession=${sessionMatch[1]}`
    console.log('Successfully obtained Clay session cookie')

    // Store in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Delete all existing rows and insert new one (singleton pattern)
    await supabase.from('clay_auth').delete().gte('created_at', '1970-01-01')

    const { error: insertError } = await supabase
      .from('clay_auth')
      .insert({
        session_cookie: sessionCookie,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

    if (insertError) {
      throw new Error(`Failed to store session: ${insertError.message}`)
    }

    console.log('Clay session stored successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Clay session refreshed and stored',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Clay auth refresh error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
