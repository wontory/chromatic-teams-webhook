import type { VercelRequest, VercelResponse } from "@vercel/node";

import { EVENTS, RESULTS, REVIEW_DECISION_STATUSES } from "../src/consts.js";
import type {
  ChromaticBuildUpdates,
  ChromaticPayload,
  ChromaticReviewDecision,
  ChromaticReviewUpdates,
  TeamsMessage,
} from "../src/types.js";

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
    title: "🚀 빌드 업데이트",
    color: "439FE0",
    facts: [
      ["빌드", `#${p.build?.number}`],
      ["상태", p.build?.status],
      ["결과", p.build?.result],
      ["프로젝트", p.build?.project?.name],
      ["변경사항", `${p.build?.changeCount}`],
      ["컴포넌트", `${p.build?.componentCount}`],
      ["스펙", `${p.build?.specCount}`],
      ["계정명", p.build?.project?.accountName],
      ["Storybook URL", p.build?.storybookUrl],
      ["Chromatic URL", p.build?.project?.webUrl],
    ],
    chromaticUrl: p.build?.webUrl,
    storybookUrl: p.build?.storybookUrl,
  });
}

function reviewUpdatesMessage(p: ChromaticReviewUpdates): TeamsMessage {
  return adaptiveCard({
    title: "👀 리뷰 업데이트",
    color: "E01E5A",
    facts: [
      ["리뷰", `#${p.review?.number}`],
      ["제목", p.review?.title],
      ["상태", p.review?.status],
      ["베이스 브랜치", p.review?.baseRefName],
      ["헤드 브랜치", p.review?.headRefName],
      ["크로스 리포지토리 여부", p.review?.isCrossRepository ? "예" : "아니오"],
      ["작성자", p.review?.author?.username],
    ],
    chromaticUrl: p.review?.webUrl,
  });
}

function reviewDecisionMessage(p: ChromaticReviewDecision): TeamsMessage {
  const passed = p.reviewDecision?.status === REVIEW_DECISION_STATUSES.APPROVED;
  const color = passed ? "2EB886" : "E01E5A";
  const emoji = passed ? "✅" : "❌";

  return adaptiveCard({
    title: `${emoji} 리뷰 결정 ${p.reviewDecision?.status}`,
    color,
    facts: [
      ["리뷰", `#${p.reviewDecision?.review?.number}`],
      ["제목", p.reviewDecision?.review?.title],
      ["상태", p.reviewDecision?.review?.status],
      ["베이스 브랜치", p.reviewDecision?.review?.baseRefName],
      ["헤드 브랜치", p.reviewDecision?.review?.headRefName],
      [
        "크로스 리포지토리 여부",
        p.reviewDecision?.review?.isCrossRepository ? "예" : "아니오",
      ],
      ["작성자", p.reviewDecision?.review?.author?.username],
    ],
    chromaticUrl: p.reviewDecision?.review?.webUrl,
  });
}

function adaptiveCard({
  title,
  color,
  facts,
  chromaticUrl,
  storybookUrl,
}: {
  title: string;
  color: string;
  facts: [string, string | undefined][];
  chromaticUrl: string;
  storybookUrl?: string;
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
            title: "Chromatic 바로가기",
            url: chromaticUrl,
          },
          ...(storybookUrl
            ? [
                {
                  type: "Action.OpenUrl",
                  title: "Storybook 바로가기",
                  url: storybookUrl,
                },
              ]
            : []),
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
