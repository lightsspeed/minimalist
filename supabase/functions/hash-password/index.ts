import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { hashSync, compareSync, genSaltSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to record metrics
async function recordMetric(
  metricName: string,
  labels: Record<string, string> = {},
  value: number = 1
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.rpc('increment_metric', {
      p_metric_name: metricName,
      p_labels: labels,
      p_increment: value
    });
  } catch (error) {
    console.error('Error recording metric:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { action, password, hash } = await req.json();

    // Record API request metric
    await recordMetric('api_requests_total', { endpoint: 'hash-password', action: action || 'unknown' });

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'hash') {
      // Hash the password with bcrypt using sync methods (no Worker required)
      const salt = genSaltSync(12);
      const hashedPassword = hashSync(password, salt);
      console.log('Password hashed successfully');
      
      await recordMetric('password_hashed_total', {});
      
      const duration = (Date.now() - startTime) / 1000;
      await recordMetric('api_request_duration_seconds', { endpoint: 'hash-password', action: 'hash' }, duration);
      
      return new Response(
        JSON.stringify({ hash: hashedPassword }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    if (action === 'verify') {
      if (!hash) {
        return new Response(
          JSON.stringify({ error: 'Hash is required for verification' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the password against the hash using sync method
      const isValid = compareSync(password, hash);
      console.log('Password verification:', isValid ? 'success' : 'failed');
      
      await recordMetric(isValid ? 'password_verification_success_total' : 'password_verification_failed_total', { source: 'hash-password' });
      
      const duration = (Date.now() - startTime) / 1000;
      await recordMetric('api_request_duration_seconds', { endpoint: 'hash-password', action: 'verify' }, duration);
      
      return new Response(
        JSON.stringify({ valid: isValid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "hash" or "verify"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in hash-password function:', error);
    await recordMetric('api_errors_total', { endpoint: 'hash-password' });
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
