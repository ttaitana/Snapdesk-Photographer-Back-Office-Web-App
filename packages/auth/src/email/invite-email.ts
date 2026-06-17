import { Resend } from "resend";

/**
 * Real email delivery for team invites (per the user's explicit choice —
 * "wire up real email sending now" — over a link-only fallback). Uses
 * Resend because it's the simplest transactional-email API to wire up by
 * hand without a network-connected install step to verify against; any
 * provider with a similar `send({ from, to, subject, html })` call works,
 * swap it here if the user already has a different one.
 *
 * Requires RESEND_API_KEY + EMAIL_FROM (see .env.example) — passed in by the
 * caller (apps/web), never read from process.env directly. See
 * packages/auth/README.md for why.
 */
export interface SendTeamInviteEmailInput {
  resendApiKey: string;
  emailFrom: string;
  to: string;
  teamName: string;
  inviterName: string;
  role: string;
  /** Better Auth's invitation id — doubles as our `/invite/[token]` token. */
  inviteId: string;
  baseURL: string;
}

export async function sendTeamInviteEmail(input: SendTeamInviteEmailInput): Promise<void> {
  const resend = new Resend(input.resendApiKey);
  const inviteUrl = `${input.baseURL.replace(/\/$/, "")}/invite/${input.inviteId}`;

  const { error } = await resend.emails.send({
    from: input.emailFrom,
    to: input.to,
    subject: `${input.inviterName} เชิญคุณเข้าร่วมทีม ${input.teamName} บน Snapdesk`,
    html: renderInviteEmailHtml({
      teamName: input.teamName,
      inviterName: input.inviterName,
      role: input.role,
      inviteUrl,
    }),
  });

  if (error) {
    throw new Error(`Failed to send team invite email via Resend: ${error.message}`);
  }
}

function renderInviteEmailHtml(opts: {
  teamName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}): string {
  const roleLabelTh: Record<string, string> = {
    owner: "เจ้าของทีม",
    admin: "ผู้ดูแล",
    member: "สมาชิก",
  };
  const roleLabel = roleLabelTh[opts.role] ?? opts.role;

  // Minimal inline-styled HTML — keep it simple, no external assets/fonts
  // (email clients strip most CSS anyway).
  return `<!doctype html>
<html lang="th">
  <body style="font-family: sans-serif; background: #f4f4f5; padding: 32px;">
    <div style="max-width: 480px; margin: 0 auto; background: #fff; border: 2px solid #18181b; border-radius: 8px; padding: 24px;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">คุณได้รับคำเชิญเข้าทีม</h1>
      <p style="margin: 0 0 12px; color: #27272a;">
        <strong>${escapeHtml(opts.inviterName)}</strong> เชิญคุณเข้าร่วมทีม
        <strong>${escapeHtml(opts.teamName)}</strong> บน Snapdesk ในตำแหน่ง
        <strong>${escapeHtml(roleLabel)}</strong>
      </p>
      <p style="margin: 0 0 24px; color: #52525b; font-size: 14px;">
        คำเชิญนี้จะหมดอายุภายใน 7 วัน
      </p>
      <a
        href="${opts.inviteUrl}"
        style="display: inline-block; background: #18181b; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;"
        >ดูคำเชิญ</a
      >
      <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 12px;">
        หากปุ่มด้านบนใช้ไม่ได้ ก็อปลิงก์นี้ไปเปิดในเบราว์เซอร์:<br />
        <span style="word-break: break-all;">${opts.inviteUrl}</span>
      </p>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
