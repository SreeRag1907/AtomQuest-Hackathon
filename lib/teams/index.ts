/**
 * Microsoft Teams adaptive card sender.
 *
 * Posts to a Teams Incoming Webhook URL configured in TEAMS_WEBHOOK_URL.
 * Per-user routing isn't possible with a webhook (it posts to a channel),
 * so we send all cards to the same channel and rely on @mentions in the
 * card body to route human attention. If you set up an Azure Bot or Graph
 * app later, swap the implementation here without touching call sites.
 *
 * Gracefully no-ops when TEAMS_WEBHOOK_URL is missing so the app still works
 * locally / for judges who don't configure it.
 */

interface TeamsCardPayload {
  type: "message";
  attachments: Array<{
    contentType: "application/vnd.microsoft.card.adaptive";
    contentUrl: null;
    content: object;
  }>;
}

export async function sendTeamsCard(card: object): Promise<void> {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) return;

  const payload: TeamsCardPayload = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: card,
      },
    ],
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[teams] webhook post failed", err);
  }
}
