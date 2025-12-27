import type { VercelRequest, VercelResponse } from "@vercel/node";

import { EVENTS, RESULTS, REVIEW_DECISION_STATUSES } from "#consts";
import type {
  ChromaticBuildUpdates,
  ChromaticPayload,
  ChromaticReviewDecision,
  ChromaticReviewUpdates,
  TeamsMessage,
} from "#types";

function createTeamsMessage(payload: ChromaticPayload): TeamsMessage | null {
  const { event } = payload;

  switch (event) {
    case EVENTS.BUILD_UPDATES:
      return buildUpdatesMessage(payload);
    case EVENTS.REVIEW_UPDATES:
      return reviewUpdatesMessage(payload);
    case EVENTS.REVIEW_DECISION:
      return reviewDecisionMessage(payload);
    default:
      return null;
  }
}

function buildUpdatesMessage(p: ChromaticBuildUpdates): TeamsMessage | null {
  if (p.build?.result !== RESULTS.SUCCESS) return null;

  return adaptiveCard({
    title: "🚀 Chromatic Build Updates",
    color: "439FE0",
    facts: [
      ["Build", `#${p.build?.number}`],
      ["Status", p.build?.status],
      ["Result", p.build?.result],
      ["Project", p.build?.project?.name],
      ["Storybook URL", p.build?.storybookUrl],
      ["Web URL", p.build?.project?.webUrl],
      ["Changes", `${p.build?.changeCount}`],
      ["Components", `${p.build?.componentCount}`],
      ["Specs", `${p.build?.specCount}`],
      ["Account Name", p.build?.project?.accountName],
    ],
    url: p.build?.webUrl,
  });
}

function reviewUpdatesMessage(p: ChromaticReviewUpdates): TeamsMessage {
  return adaptiveCard({
    title: "👀 Review Updates",
    color: "E01E5A",
    facts: [
      ["Review", `#${p.review?.number}`],
      ["Title", p.review?.title],
      ["Status", p.review?.status],
      ["Base Ref", p.review?.baseRefName],
      ["Head Ref", p.review?.headRefName],
      ["Is Cross Repository", p.review?.isCrossRepository ? "Yes" : "No"],
      ["Author Username", p.review?.author?.username],
    ],
    url: p.review?.webUrl,
  });
}

function reviewDecisionMessage(p: ChromaticReviewDecision): TeamsMessage {
  const passed = p.reviewDecision?.status === REVIEW_DECISION_STATUSES.APPROVED;
  const color = passed ? "2EB886" : "E01E5A";
  const emoji = passed ? "✅" : "❌";

  return adaptiveCard({
    title: `${emoji} Review Decision ${p.reviewDecision?.status}`,
    color,
    facts: [
      ["Review", `#${p.reviewDecision?.review?.number}`],
      ["Title", p.reviewDecision?.review?.title],
      ["Status", p.reviewDecision?.review?.status],
      ["Base Ref", p.reviewDecision?.review?.baseRefName],
      ["Head Ref", p.reviewDecision?.review?.headRefName],
      [
        "Is Cross Repository",
        p.reviewDecision?.review?.isCrossRepository ? "Yes" : "No",
      ],
      ["Author Username", p.reviewDecision?.review?.author?.username],
    ],
    url: p.reviewDecision?.review?.webUrl,
  });
}

function adaptiveCard({
  title,
  color,
  facts,
  url,
}: {
  title: string;
  color: string;
  facts: [string, string | undefined][];
  url: string;
}): TeamsMessage {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.2",
    body: [
      {
        type: "TextBlock",
        text: title,
        weight: "bolder",
        size: "large",
        color: color,
      },
      {
        type: "FactSet",
        facts: facts
          .filter(([, v]) => v !== undefined)
          .map(([name, value]) => ({ title: name, value: value! })),
      },
      {
        type: "ActionSet",
        actions: [
          {
            type: "Action.OpenUrl",
            title: "View in Chromatic",
            url: url,
          },
        ],
      },
    ],
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    console.log("Skipping message creation for method", req.method);
    return res.status(405).end();
  }

  const teamsMessage: TeamsMessage | null = createTeamsMessage(req.body);

  if (!teamsMessage) {
    console.log("Skipping message creation for event", req.body.event);
    return res.status(200).json({ skipped: true });
  }

  try {
    await fetch(process.env.TEAMS_WEBHOOK_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teamsMessage),
    });
  } catch (e) {
    console.error(e);
  }

  return res.status(200).json({ ok: true });
}
