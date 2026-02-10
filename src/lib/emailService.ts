import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface SendEmailParams {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
}

/**
 * Sends an email via the Supabase Edge Function (Resend).
 * Requires the user to be authenticated.
 */
export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                to,
                subject,
                html,
                text,
                reply_to: replyTo,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Email send error:', data);
            return { success: false, error: data.error || 'Failed to send email' };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Email service error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generates a styled HTML email template for SafeTransfer messages.
 */
export function generateEmailTemplate({
    subject,
    body,
    messageType = 'info',
    businessName,
}: {
    subject: string;
    body: string;
    messageType?: string;
    businessName?: string;
}): string {
    const typeColors: Record<string, { bg: string; text: string; label: string }> = {
        info: { bg: '#eff6ff', text: '#1d4ed8', label: '📋 Información' },
        warning: { bg: '#fffbeb', text: '#b45309', label: '⚠️ Advertencia' },
        alert: { bg: '#fef2f2', text: '#dc2626', label: '🚨 Alerta' },
        notice: { bg: '#f0fdf4', text: '#15803d', label: '📌 Aviso' },
    };

    const colors = typeColors[messageType] || typeColors.info;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f1f5f9;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);padding:8px 12px;border-radius:10px;margin-bottom:16px;">
        <span style="color:#fff;font-size:20px;font-weight:800;">🛡️ SafeTransfer</span>
      </div>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">${subject}</h1>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      ${businessName ? `<p style="color:#64748b;font-size:14px;margin:0 0 16px;">Para: <strong style="color:#0f172a;">${businessName}</strong></p>` : ''}
      
      <!-- Message Type Badge -->
      <div style="display:inline-block;background:${colors.bg};color:${colors.text};padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:20px;">
        ${colors.label}
      </div>

      <!-- Message Content -->
      <div style="color:#334155;font-size:15px;line-height:1.7;white-space:pre-wrap;">${body}</div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:24px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;">
        Este email fue enviado desde <strong>SafeTransfer</strong> — Sistema de Compliance para Money Transfer
      </p>
      <p style="color:#94a3b8;font-size:11px;margin:0;">
        © ${new Date().getFullYear()} SafeTransfer.it · Cumple con D.Lgs 231/2007 y GDPR
      </p>
    </div>
  </div>
</body>
</html>`;
}
