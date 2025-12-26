import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

      // Verify password with bcrypt
      const isValid = await bcrypt.compare(password, noteData.password_hash);
      
      if (!isValid) {
        console.log('Password verification failed');
        return new Response(
          JSON.stringify({ error: 'Incorrect password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      // Verify password with bcrypt
      const isValid = await bcrypt.compare(password, noteData.password_hash);
      
      if (!isValid) {
        console.log('Password verification failed');
        return new Response(
          JSON.stringify({ error: 'Incorrect password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark as read if delete_after_reading
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
