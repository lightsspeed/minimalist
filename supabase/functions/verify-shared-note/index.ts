import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for',
};

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

async function checkRateLimit(
  supabase: SupabaseClient,
  shareToken: string,
  _ipAddress: string | null
): Promise<{ allowed: boolean; remainingAttempts: number; lockoutUntil?: Date }> {
  const cutoffTime = new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000);
  
  // Check failed attempts by token
  const { data: tokenAttempts, error: tokenError } = await supabase
    .from('share_access_attempts')
    .select('id')
    .eq('share_token', shareToken)
    .eq('is_success', false)
    .gte('attempted_at', cutoffTime.toISOString());

  if (tokenError) {
    console.error('Error checking rate limit:', tokenError);
    // Fail open but log the error
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const failedCount = tokenAttempts?.length || 0;
  const remaining = Math.max(0, MAX_ATTEMPTS - failedCount);
  
  if (failedCount >= MAX_ATTEMPTS) {
    // Calculate when lockout expires
    const { data: lastAttempt } = await supabase
      .from('share_access_attempts')
      .select('attempted_at')
      .eq('share_token', shareToken)
      .eq('is_success', false)
      .order('attempted_at', { ascending: false })
      .limit(1);
    
    if (lastAttempt && lastAttempt.length > 0) {
      const attemptData = lastAttempt[0] as { attempted_at: string };
      const lastAttemptTime = new Date(attemptData.attempted_at);
      const lockoutUntil = new Date(lastAttemptTime.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      return { allowed: false, remainingAttempts: 0, lockoutUntil };
    }
    
    return { allowed: false, remainingAttempts: 0 };
  }

  return { allowed: true, remainingAttempts: remaining };
}

async function logAttempt(
  supabase: SupabaseClient,
  shareToken: string,
  ipAddress: string | null,
  isSuccess: boolean
): Promise<void> {
  const { error } = await supabase
    .from('share_access_attempts')
    .insert({
      share_token: shareToken,
      ip_address: ipAddress,
      is_success: isSuccess,
    });

  if (error) {
    console.error('Error logging access attempt:', error);
  }
}

async function clearFailedAttempts(
  supabase: SupabaseClient,
  shareToken: string
): Promise<void> {
  // On successful login, clear failed attempts for this token
  const { error } = await supabase
    .from('share_access_attempts')
    .delete()
    .eq('share_token', shareToken)
    .eq('is_success', false);

  if (error) {
    console.error('Error clearing failed attempts:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { share_token, password, note_type } = await req.json();

    if (!share_token || !password || !note_type) {
      return new Response(
        JSON.stringify({ error: 'share_token, password, and note_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP for logging (optional, may not be available)
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit before attempting verification
    const rateLimit = await checkRateLimit(supabase, share_token, ipAddress);
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for token: ${share_token.substring(0, 8)}...`);
      const lockoutMessage = rateLimit.lockoutUntil 
        ? `Too many failed attempts. Please try again after ${rateLimit.lockoutUntil.toISOString()}`
        : `Too many failed attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`;
      
      return new Response(
        JSON.stringify({ 
          error: lockoutMessage,
          rateLimited: true,
          retryAfter: LOCKOUT_DURATION_MINUTES * 60
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(LOCKOUT_DURATION_MINUTES * 60) } }
      );
    }

    if (note_type === 'task') {
      // Fetch shared_notes record with password_hash
      const { data: noteData, error: noteError } = await supabase
        .from('shared_notes')
        .select('id, task_id, title, description, tags, subtasks, expires_at, created_at, password_hash')
        .eq('share_token', share_token)
        .single();

      if (noteError || !noteData) {
        console.log('Note not found:', noteError);
        return new Response(
          JSON.stringify({ error: 'Note not found or expired' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiration
      if (noteData.expires_at && new Date(noteData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Note has expired' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password with bcrypt (constant-time comparison built-in)
      const isValid = await bcrypt.compare(password, noteData.password_hash);
      
      // Log the attempt
      await logAttempt(supabase, share_token, ipAddress, isValid);
      
      if (!isValid) {
        console.log('Password verification failed');
        const newRateLimit = await checkRateLimit(supabase, share_token, ipAddress);
        return new Response(
          JSON.stringify({ 
            error: 'Incorrect password',
            remainingAttempts: newRateLimit.remainingAttempts
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clear failed attempts on success
      await clearFailedAttempts(supabase, share_token);

      // Return note data without password_hash
      const { password_hash, ...safeNoteData } = noteData;
      return new Response(
        JSON.stringify({ note: safeNoteData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (note_type === 'personal') {
      // Fetch shared_personal_notes record with password_hash
      const { data: noteData, error: noteError } = await supabase
        .from('shared_personal_notes')
        .select('id, note_id, title, content, expires_at, is_read, delete_after_reading, created_at, password_hash')
        .eq('share_token', share_token)
        .single();

      if (noteError || !noteData) {
        console.log('Personal note not found:', noteError);
        return new Response(
          JSON.stringify({ error: 'Note not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiration
      if (noteData.expires_at && new Date(noteData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Note has expired' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already read and delete_after_reading
      if (noteData.delete_after_reading && noteData.is_read) {
        return new Response(
          JSON.stringify({ error: 'Note has been deleted after reading' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password with bcrypt (constant-time comparison built-in)
      const isValid = await bcrypt.compare(password, noteData.password_hash);
      
      // Log the attempt
      await logAttempt(supabase, share_token, ipAddress, isValid);
      
      if (!isValid) {
        console.log('Password verification failed');
        const newRateLimit = await checkRateLimit(supabase, share_token, ipAddress);
        return new Response(
          JSON.stringify({ 
            error: 'Incorrect password',
            remainingAttempts: newRateLimit.remainingAttempts
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clear failed attempts on success
      await clearFailedAttempts(supabase, share_token);

      // Mark as read if delete_after_reading (handled here after password verification)
      if (noteData.delete_after_reading && !noteData.is_read) {
        await supabase
          .from('shared_personal_notes')
          .update({ is_read: true })
          .eq('id', noteData.id);
          
        // Delete after marking as read
        await supabase
          .from('shared_personal_notes')
          .delete()
          .eq('id', noteData.id);
      }

      // Return note data without password_hash
      const { password_hash, ...safeNoteData } = noteData;
      return new Response(
        JSON.stringify({ note: safeNoteData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid note_type. Use "task" or "personal"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in verify-shared-note function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
