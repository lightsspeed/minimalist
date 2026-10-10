import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailPayload {
  to: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: string;
  timeLabel: string;
  appUrl: string;
}

function buildEmailHtml(payload: EmailPayload): string {
  const { taskTitle, taskDescription, dueDate, timeLabel, appUrl } = payload;

  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not specified";

  const isOverdue = timeLabel.toLowerCase().includes("overdue");
  const isCritical = timeLabel.toLowerCase().includes("minute");

  const urgencyColor = isOverdue ? "#ef4444" : isCritical ? "#f97316" : "#3b82f6";
  const urgencyLabel = isOverdue ? "OVERDUE" : isCritical ? "CRITICAL" : "UPCOMING";
  const urgencyBg = isOverdue ? "#fef2f2" : isCritical ? "#fff7ed" : "#eff6ff";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Task Due Alert - Minimalist</title></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;"><tr><td align="center"><table width="100%" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%);padding:32px 40px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Minimalist</div><div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Task Due Alert</div></td></tr><tr><td style="padding:0 40px;"><div style="margin-top:28px;display:inline-block;background:${urgencyBg};border:1px solid ${urgencyColor}30;border-radius:20px;padding:4px 14px;"><span style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:${urgencyColor};text-transform:uppercase;">${urgencyLabel}</span></div></td></tr><tr><td style="padding:16px 40px 0;"><h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${taskTitle}</h1>${taskDescription ? `<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">${taskDescription}</p>` : ""}</td></tr><tr><td style="padding:16px 40px;"><div style="background:${urgencyBg};border-left:4px solid ${urgencyColor};border-radius:8px;padding:16px 20px;"><div style="font-size:12px;font-weight:600;letter-spacing:0.5px;color:${urgencyColor};text-transform:uppercase;margin-bottom:6px;">Time Remaining</div><div style="font-size:20px;font-weight:700;color:#111827;">${timeLabel}</div><div style="font-size:13px;color:#6b7280;margin-top:4px;">Due: ${dueDateStr}</div></div></td></tr><tr><td style="padding:8px 40px 32px;text-align:center;"><a href="${appUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:14px;font-weight:600;">Open Minimalist</a></td></tr><tr><td style="padding:0 40px;"><div style="border-top:1px solid #f3f4f6;"></div></td></tr><tr><td style="padding:24px 40px;text-align:center;"><p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">This notification was sent by <strong>Minimalist</strong> because you have task due-date alerts enabled. You can manage notification preferences inside the app.</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured in Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.to.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payload.taskTitle) {
      return new Response(JSON.stringify({ error: "taskTitle is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildEmailHtml(payload);
    const isOverdue = payload.timeLabel.toLowerCase().includes("overdue");
    const isCritical = payload.timeLabel.toLowerCase().includes("minute");
    const subjectPrefix = isOverdue ? "OVERDUE" : isCritical ? "Action Required" : "Reminder";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Minimalist <notifications@resend.dev>",
        to: [payload.to],
        subject: `${subjectPrefix}: ${payload.taskTitle} - ${payload.timeLabel}`,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({ error: resendData.message || "Failed to send via Resend" }),
        { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
