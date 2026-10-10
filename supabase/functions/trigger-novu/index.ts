import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, to, payload, apiKey } = await req.json()

    // We can accept the API key from the frontend for easy testing, 
    // or fallback to a Supabase secret if configured securely.
    const novuApiKey = apiKey || Deno.env.get('NOVU_API_KEY')

    if (!novuApiKey) {
      return new Response(
        JSON.stringify({ error: 'Novu API Key not provided or configured in secrets.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Novu's Trigger Event API
    const novuResponse = await fetch('https://api.novu.co/v1/events/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${novuApiKey}`,
      },
      body: JSON.stringify({
        name,
        to,
        payload,
      }),
    })

    const data = await novuResponse.json()

    if (!novuResponse.ok) {
      return new Response(JSON.stringify(data), {
        status: novuResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
