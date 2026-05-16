function shell(title: string, body: string, ctaUrl?: string, ctaLabel?: string) {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #e2e8f0;">
      <div style="font-size:14px; color:#4f46e5; font-weight:600; letter-spacing:0.05em; text-transform:uppercase;">AtomQuest</div>
      <h1 style="font-size:20px; margin:8px 0 16px; font-weight:600;">${title}</h1>
      <div style="font-size:14px; line-height:1.6; color:#334155;">${body}</div>
      ${
        ctaUrl
          ? `<div style="margin-top:24px;"><a href="${ctaUrl}" style="display:inline-block; background:#4f46e5; color:white; padding:10px 16px; border-radius:8px; text-decoration:none; font-weight:500;">${ctaLabel ?? "Open"}</a></div>`
          : ""
      }
      <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b;">
        You're receiving this because you have an account on AtomQuest. Manage notifications in your settings.
      </div>
    </div>
  </body>
</html>
  `;
}

export function goalSubmittedEmail({
  managerName,
  employeeName,
  link,
}: {
  managerName: string;
  employeeName: string;
  link: string;
}) {
  return {
    subject: `${employeeName} submitted goals for review`,
    html: shell(
      "New goals to review",
      `Hi ${managerName},<br/><br/>${employeeName} just submitted their goal sheet and is awaiting your approval.`,
      link,
      "Review now"
    ),
  };
}

export function goalApprovedEmail({
  employeeName,
  link,
}: {
  employeeName: string;
  link: string;
}) {
  return {
    subject: "Your goals have been approved",
    html: shell(
      "Goals approved",
      `Hi ${employeeName},<br/><br/>Your goal sheet has been approved and is now locked. Time to start tracking quarterly check-ins.`,
      link,
      "View sheet"
    ),
  };
}

export function goalReturnedEmail({
  employeeName,
  reason,
  link,
}: {
  employeeName: string;
  reason: string;
  link: string;
}) {
  return {
    subject: "Goals returned for rework",
    html: shell(
      "Goals returned",
      `Hi ${employeeName},<br/><br/>Your manager returned your goal sheet with the following note:<blockquote style="border-left:3px solid #e2e8f0; padding:8px 12px; color:#475569; margin:12px 0;">${reason}</blockquote>Update and resubmit when ready.`,
      link,
      "Edit goals"
    ),
  };
}

export function checkinReminderEmail({
  employeeName,
  quarter,
  closes,
  link,
}: {
  employeeName: string;
  quarter: string;
  closes: string;
  link: string;
}) {
  return {
    subject: `${quarter.toUpperCase()} check-in reminder`,
    html: shell(
      `${quarter.toUpperCase()} check-in window closes ${closes}`,
      `Hi ${employeeName},<br/><br/>Don't forget to update your achievements for ${quarter.toUpperCase()}.`,
      link,
      "Update now"
    ),
  };
}
