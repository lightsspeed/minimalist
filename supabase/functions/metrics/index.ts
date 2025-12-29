import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
};

// Helper to format metrics in Prometheus exposition format
function formatMetric(name: string, value: number, labels: Record<string, string> = {}, help?: string, type?: string): string {
  let result = '';
  
  if (help) {
    result += `# HELP ${name} ${help}\n`;
  }
  if (type) {
    result += `# TYPE ${name} ${type}\n`;
  }
  
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  
  result += labelStr ? `${name}{${labelStr}} ${value}\n` : `${name} ${value}\n`;
  
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    console.log('[Metrics] Fetching Prometheus metrics');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let metricsOutput = '';
    
    // Add app info metric
    metricsOutput += formatMetric(
      'app_info',
      1,
      { version: '1.0.0', app: 'task_notes_app' },
      'Application information',
      'gauge'
    );

    // ============ DATABASE METRICS ============
    console.log('[Metrics] Fetching database stats');
    const { data: dbStats, error: dbError } = await supabase.rpc('get_database_stats');
    
    if (!dbError && dbStats) {
      metricsOutput += '\n# HELP db_table_rows_total Total number of rows in each table\n';
      metricsOutput += '# TYPE db_table_rows_total gauge\n';
      
      for (const row of dbStats) {
        metricsOutput += `db_table_rows_total{table="${row.table_name}"} ${row.row_count}\n`;
      }
    } else {
      console.error('[Metrics] Error fetching database stats:', dbError);
    }

    // ============ USER ACTIVITY METRICS ============
    console.log('[Metrics] Fetching user activity stats');
    const { data: activityStats, error: activityError } = await supabase.rpc('get_user_activity_stats');
    
    if (!activityError && activityStats && activityStats.length > 0) {
      const stats = activityStats[0];
      
      metricsOutput += formatMetric(
        'users_total',
        stats.total_users || 0,
        {},
        'Total number of registered users',
        'gauge'
      );
      
      metricsOutput += formatMetric(
        'tasks_created_today_total',
        stats.tasks_created_today || 0,
        {},
        'Number of tasks created today',
        'gauge'
      );
      
      metricsOutput += formatMetric(
        'tasks_completed_today_total',
        stats.tasks_completed_today || 0,
        {},
        'Number of tasks completed today',
        'gauge'
      );
      
      metricsOutput += formatMetric(
        'notes_created_today_total',
        stats.notes_created_today || 0,
        {},
        'Number of notes created today',
        'gauge'
      );
      
      metricsOutput += formatMetric(
        'active_users_today_total',
        stats.active_users_today || 0,
        {},
        'Number of active users today',
        'gauge'
      );
    } else {
      console.error('[Metrics] Error fetching activity stats:', activityError);
    }

    // ============ API METRICS ============
    console.log('[Metrics] Fetching aggregated API metrics');
    const { data: apiMetrics, error: apiError } = await supabase.rpc('get_aggregated_metrics');
    
    if (!apiError && apiMetrics) {
      // Group metrics by name
      const metricsByName: Record<string, Array<{ labels: Record<string, string>, value: number, count: number }>> = {};
      
      for (const row of apiMetrics) {
        if (!metricsByName[row.metric_name]) {
          metricsByName[row.metric_name] = [];
        }
        metricsByName[row.metric_name].push({
          labels: row.labels || {},
          value: row.total_value,
          count: row.count
        });
      }
      
      // Output each metric type
      for (const [metricName, values] of Object.entries(metricsByName)) {
        const cleanName = metricName.replace(/[^a-zA-Z0-9_]/g, '_');
        
        if (metricName.includes('_total') || metricName.includes('_count')) {
          metricsOutput += `# HELP ${cleanName} Counter metric\n`;
          metricsOutput += `# TYPE ${cleanName} counter\n`;
        } else if (metricName.includes('_duration') || metricName.includes('_seconds')) {
          metricsOutput += `# HELP ${cleanName} Duration metric in seconds\n`;
          metricsOutput += `# TYPE ${cleanName} gauge\n`;
        } else {
          metricsOutput += `# HELP ${cleanName} Application metric\n`;
          metricsOutput += `# TYPE ${cleanName} gauge\n`;
        }
        
        for (const { labels, value } of values) {
          const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
          metricsOutput += labelStr ? `${cleanName}{${labelStr}} ${value}\n` : `${cleanName} ${value}\n`;
        }
      }
    } else {
      console.error('[Metrics] Error fetching API metrics:', apiError);
    }

    // ============ SHARE ACCESS METRICS ============
    console.log('[Metrics] Fetching share access attempt stats');
    const { data: accessStats, error: accessError } = await supabase
      .from('share_access_attempts')
      .select('is_success')
      .gte('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (!accessError && accessStats) {
      const successCount = accessStats.filter(a => a.is_success).length;
      const failureCount = accessStats.filter(a => !a.is_success).length;
      
      metricsOutput += formatMetric(
        'share_access_attempts_total',
        successCount,
        { status: 'success' },
        'Total share access attempts in last 24h',
        'counter'
      );
      
      metricsOutput += `share_access_attempts_total{status="failure"} ${failureCount}\n`;
    }

    // ============ TASK COMPLETION METRICS ============
    console.log('[Metrics] Fetching task completion stats');
    const { data: taskStats, error: taskError } = await supabase
      .from('tasks')
      .select('is_completed, is_pinned, is_template');
    
    if (!taskError && taskStats) {
      const completedTasks = taskStats.filter(t => t.is_completed).length;
      const pendingTasks = taskStats.filter(t => !t.is_completed).length;
      const pinnedTasks = taskStats.filter(t => t.is_pinned).length;
      const templateTasks = taskStats.filter(t => t.is_template).length;
      
      metricsOutput += formatMetric(
        'tasks_by_status',
        completedTasks,
        { status: 'completed' },
        'Tasks by completion status',
        'gauge'
      );
      metricsOutput += `tasks_by_status{status="pending"} ${pendingTasks}\n`;
      
      metricsOutput += formatMetric(
        'tasks_pinned_total',
        pinnedTasks,
        {},
        'Total number of pinned tasks',
        'gauge'
      );
      
      metricsOutput += formatMetric(
        'tasks_template_total',
        templateTasks,
        {},
        'Total number of template tasks',
        'gauge'
      );
    }

    // ============ SUBTASK METRICS ============
    console.log('[Metrics] Fetching subtask stats');
    const { data: subtaskStats, error: subtaskError } = await supabase
      .from('subtasks')
      .select('is_completed');
    
    if (!subtaskError && subtaskStats) {
      const completedSubtasks = subtaskStats.filter(s => s.is_completed).length;
      const pendingSubtasks = subtaskStats.filter(s => !s.is_completed).length;
      
      metricsOutput += formatMetric(
        'subtasks_by_status',
        completedSubtasks,
        { status: 'completed' },
        'Subtasks by completion status',
        'gauge'
      );
      metricsOutput += `subtasks_by_status{status="pending"} ${pendingSubtasks}\n`;
    }

    // ============ NOTES METRICS ============
    console.log('[Metrics] Fetching notes stats');
    const { data: noteStats, error: noteError } = await supabase
      .from('notes')
      .select('is_pinned, folder');
    
    if (!noteError && noteStats) {
      const pinnedNotes = noteStats.filter(n => n.is_pinned).length;
      const foldersSet = new Set(noteStats.map(n => n.folder).filter(Boolean));
      
      metricsOutput += formatMetric(
        'notes_pinned_total',
        pinnedNotes,
        {},
        'Total number of pinned notes',
        'gauge'
      );
      
      metricsOutput += formatMetric(
        'notes_folders_total',
        foldersSet.size,
        {},
        'Total number of unique folders',
        'gauge'
      );
    }

    // ============ SCRAPE METRICS ============
    const duration = (Date.now() - startTime) / 1000;
    metricsOutput += formatMetric(
      'metrics_scrape_duration_seconds',
      duration,
      {},
      'Time taken to collect metrics',
      'gauge'
    );
    
    metricsOutput += formatMetric(
      'metrics_scrape_success',
      1,
      {},
      'Whether the metrics scrape was successful',
      'gauge'
    );

    console.log(`[Metrics] Successfully generated metrics in ${duration}s`);

    return new Response(metricsOutput, {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error) {
    console.error('[Metrics] Error generating metrics:', error);
    
    const errorMetrics = formatMetric(
      'metrics_scrape_success',
      0,
      {},
      'Whether the metrics scrape was successful',
      'gauge'
    );

    return new Response(errorMetrics, {
      headers: corsHeaders,
      status: 200, // Prometheus expects 200 even on partial failure
    });
  }
});
