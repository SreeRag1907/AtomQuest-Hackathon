import { Resend } from "resend";

interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let cached: Resend | null | undefined;

function getClient(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Resend(key);
  return cached;
}

/** Fire-and-forget email. Silently no-ops when RESEND_API_KEY is missing. */
export async function sendEmail(input: EmailInput): Promise<void> {
  const client = getClient();
  if (!client) return;
  const from = process.env.RESEND_FROM_EMAIL ?? "AtomQuest <noreply@atomquest.example>";
  try {
    await client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } catch (err) {
    console.error("[email] send failed", err);
  }
}
