import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface MilestoneAlert {
  client: string;
  order_id: string;
  provider: string;
  milestone: '30d' | '60d' | '90d' | 'renewal' | 'cancelled';
  days_active: number;
  renewal_date?: string;
}

// Send Slack notification
async function sendSlackAlert(alerts: MilestoneAlert[]): Promise<boolean> {
  const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!slackWebhook) {
    console.log("No Slack webhook configured");
    return false;
  }

  // Group alerts by milestone type
  const grouped: Record<string, MilestoneAlert[]> = {
    '30d': [],
    '60d': [],
    '90d': [],
    'renewal': [],
    'cancelled': [],
  };

  for (const alert of alerts) {
    grouped[alert.milestone].push(alert);
  }

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📊 Infrastructure Milestone Alerts",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Date:* ${new Date().toLocaleDateString()}\n*Total Alerts:* ${alerts.length}`,
      },
    },
    { type: "divider" },
  ];

  // 30-day milestones
  if (grouped['30d'].length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🟢 30 Days Active (${grouped['30d'].length})*\n${
          grouped['30d'].slice(0, 5).map(a => `• ${a.client} - ${a.provider}`).join('\n')
        }${grouped['30d'].length > 5 ? `\n_+${grouped['30d'].length - 5} more_` : ''}`,
      },
    });
  }

  // 60-day milestones
  if (grouped['60d'].length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🔵 60 Days Active (${grouped['60d'].length})*\n${
          grouped['60d'].slice(0, 5).map(a => `• ${a.client} - ${a.provider}`).join('\n')
        }${grouped['60d'].length > 5 ? `\n_+${grouped['60d'].length - 5} more_` : ''}`,
      },
    });
  }

  // 90-day milestones
  if (grouped['90d'].length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⭐ 90 Days Active (${grouped['90d'].length})*\n${
          grouped['90d'].slice(0, 5).map(a => `• ${a.client} - ${a.provider}`).join('\n')
        }${grouped['90d'].length > 5 ? `\n_+${grouped['90d'].length - 5} more_` : ''}`,
      },
    });
  }

  // Renewal alerts (urgent)
  if (grouped['renewal'].length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚠️ Renewal Coming (${grouped['renewal'].length})*\n${
          grouped['renewal'].slice(0, 5).map(a => 
            `• ${a.client} - ${a.provider} - Renews: ${a.renewal_date}`
          ).join('\n')
        }${grouped['renewal'].length > 5 ? `\n_+${grouped['renewal'].length - 5} more_` : ''}`,
      },
    });
  }

  // Cancelled confirmations
  if (grouped['cancelled'].length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*❌ Recently Cancelled (${grouped['cancelled'].length})*\n${
          grouped['cancelled'].slice(0, 5).map(a => `• ${a.client} - ${a.provider}`).join('\n')
        }${grouped['cancelled'].length > 5 ? `\n_+${grouped['cancelled'].length - 5} more_` : ''}`,
      },
    });
  }

  try {
    const response = await fetch(slackWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    return response.ok;
  } catch (error) {
    console.error("Slack send error:", error);
    return false;
  }
}

// Check for milestones
async function checkMilestones(supabase: any): Promise<MilestoneAlert[]> {
  const alerts: MilestoneAlert[] = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Get all active orders
  const { data: orders, error } = await supabase
    .from("provider_orders")
    .select("*")
    .neq("status", "cancelled");

  if (error || !orders) {
    console.error("Failed to fetch orders:", error);
    return [];
  }

  for (const order of orders) {
    const activatedAt = order.activated_at ? new Date(order.activated_at) : new Date(order.created_at);
    const daysActive = Math.floor((now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Check 30-day milestone
    if (daysActive >= 30 && daysActive < 31 && !order.milestone_30d_notified) {
      alerts.push({
        client: order.client,
        order_id: order.id,
        provider: order.provider,
        milestone: '30d',
        days_active: daysActive,
      });
      
      // Mark as notified
      await supabase
        .from("provider_orders")
        .update({ milestone_30d_notified: true })
        .eq("id", order.id);
    }

    // Check 60-day milestone
    if (daysActive >= 60 && daysActive < 61 && !order.milestone_60d_notified) {
      alerts.push({
        client: order.client,
        order_id: order.id,
        provider: order.provider,
        milestone: '60d',
        days_active: daysActive,
      });
      
      await supabase
        .from("provider_orders")
        .update({ milestone_60d_notified: true })
        .eq("id", order.id);
    }

    // Check 90-day milestone
    if (daysActive >= 90 && daysActive < 91 && !order.milestone_90d_notified) {
      alerts.push({
        client: order.client,
        order_id: order.id,
        provider: order.provider,
        milestone: '90d',
        days_active: daysActive,
      });
      
      await supabase
        .from("provider_orders")
        .update({ milestone_90d_notified: true })
        .eq("id", order.id);
    }

    // Check renewal coming (within 7 days)
    if (order.renewal_date && !order.renewal_notified) {
      const renewalDate = new Date(order.renewal_date);
      const daysUntilRenewal = Math.floor((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilRenewal >= 0 && daysUntilRenewal <= 7) {
        alerts.push({
          client: order.client,
          order_id: order.id,
          provider: order.provider,
          milestone: 'renewal',
          days_active: daysActive,
          renewal_date: order.renewal_date,
        });
        
        await supabase
          .from("provider_orders")
          .update({ renewal_notified: true })
          .eq("id", order.id);
      }
    }
  }

  // Check for recently cancelled orders (within last 24 hours)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: cancelledOrders } = await supabase
    .from("provider_orders")
    .select("*")
    .eq("status", "cancelled")
    .gte("cancelled_at", yesterday);

  for (const order of cancelledOrders || []) {
    alerts.push({
      client: order.client,
      order_id: order.id,
      provider: order.provider,
      milestone: 'cancelled',
      days_active: 0,
    });
  }

  return alerts;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json().catch(() => ({ action: 'check' }));

    if (action === 'check' || action === 'run') {
      // Check for milestones and send alerts
      const alerts = await checkMilestones(supabase);

      if (alerts.length > 0) {
        const sent = await sendSlackAlert(alerts);
        return new Response(
          JSON.stringify({ 
            success: true, 
            alerts_count: alerts.length, 
            slack_sent: sent,
            alerts 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, alerts_count: 0, message: "No milestones to alert" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === 'list') {
      // List all orders with their milestone status
      const { data: orders } = await supabase
        .from("provider_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      return new Response(
        JSON.stringify({ success: true, orders }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action", available: ["check", "run", "list"] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Milestone alerts error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
