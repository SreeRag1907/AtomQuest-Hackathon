/**
 * Adaptive Card v1.5 templates for Teams notifications.
 * Schema reference: https://adaptivecards.io/explorer/
 *
 * Every card uses the same structure: a small AtomQuest header, a one-line
 * subject, an optional fact list, and a single primary action that deep-links
 * back into the portal.
 */

const SCHEMA = "http://adaptivecards.io/schemas/adaptive-card.json";
const VERSION = "1.5";

interface BaseCardInput {
  title: string;
  subtitle: string;
  facts?: Array<{ title: string; value: string }>;
  body?: string;
  link: string;
  linkLabel?: string;
}

function baseCard({
  title,
  subtitle,
  facts,
  body,
  link,
  linkLabel = "Open in Portal",
}: BaseCardInput) {
  const blocks: object[] = [
    {
      type: "TextBlock",
      text: "AtomQuest",
      weight: "Bolder",
      size: "Small",
      color: "Accent",
      spacing: "None",
    },
    {
      type: "TextBlock",
      text: title,
      weight: "Bolder",
      size: "Medium",
      wrap: true,
    },
    {
      type: "TextBlock",
      text: subtitle,
      isSubtle: true,
      wrap: true,
      spacing: "Small",
    },
  ];

  if (body) {
    blocks.push({
      type: "TextBlock",
      text: body,
      wrap: true,
      spacing: "Medium",
    });
  }

  if (facts && facts.length > 0) {
    blocks.push({
      type: "FactSet",
      facts,
      spacing: "Medium",
    });
  }

  return {
    $schema: SCHEMA,
    type: "AdaptiveCard",
    version: VERSION,
    body: blocks,
    actions: [
      {
        type: "Action.OpenUrl",
        title: linkLabel,
        url: link,
        style: "positive",
      },
    ],
  };
}

export function goalSubmittedCard(input: {
  employeeName: string;
  managerName: string;
  link: string;
}) {
  return baseCard({
    title: `${input.employeeName} submitted goals`,
    subtitle: `Awaiting review by ${input.managerName}`,
    facts: [
      { title: "Employee", value: input.employeeName },
      { title: "Status", value: "Pending review" },
    ],
    link: input.link,
    linkLabel: "Review goals",
  });
}

export function goalApprovedCard(input: {
  employeeName: string;
  link: string;
}) {
  return baseCard({
    title: "Your goals have been approved",
    subtitle: `${input.employeeName}, your goal sheet is now active for the cycle.`,
    body: "Time to start tracking quarterly check-ins. Your goal list is locked until the next cycle opens.",
    link: input.link,
    linkLabel: "View sheet",
  });
}

export function goalReturnedCard(input: {
  employeeName: string;
  reason: string;
  link: string;
}) {
  return baseCard({
    title: "Goals returned for rework",
    subtitle: `${input.employeeName}, your manager left feedback.`,
    facts: [{ title: "Reason", value: input.reason }],
    link: input.link,
    linkLabel: "Edit & resubmit",
  });
}

export function escalationCard(input: {
  employeeName: string;
  ruleName: string;
  triggerEvent: string;
  link: string;
}) {
  return baseCard({
    title: "Escalation triggered",
    subtitle: input.ruleName,
    facts: [
      { title: "Employee", value: input.employeeName },
      { title: "Trigger", value: humanizeTrigger(input.triggerEvent) },
    ],
    link: input.link,
    linkLabel: "Open escalation log",
  });
}

function humanizeTrigger(t: string): string {
  switch (t) {
    case "goals_not_submitted":
      return "Goals not submitted";
    case "goals_not_approved":
      return "Goals not approved";
    case "checkin_not_done":
      return "Check-in not completed";
    default:
      return t;
  }
}
