import {
  EVENTS,
  RESULTS,
  REVIEW_DECISION_STATUSES,
  REVIEW_STATUSES,
  STATUSES,
} from "#consts";

export type ChromaticBuildUpdates = {
  version: number;
  event: typeof EVENTS.BUILD_UPDATES;
  build: {
    number: number;
    branch: string;
    commit: string;
    committerName: string;
    status: (typeof STATUSES)[keyof typeof STATUSES];
    result: typeof RESULTS.SUCCESS;
    storybookUrl: string;
    webUrl: string;
    changeCount: number;
    componentCount: number;
    specCount: number;
    project: {
      name: string;
      accountName: string;
      accountAvatarUrl: string;
      webUrl: string;
    };
  };
};

export type ChromaticReviewUpdates = {
  version: number;
  event: typeof EVENTS.REVIEW_UPDATES;
  review: {
    number: number;
    title: string;
    status: (typeof REVIEW_STATUSES)[keyof typeof REVIEW_STATUSES];
    baseRefName: string;
    headRefName: string;
    isCrossRepository: boolean;
    webUrl: string;
    author: {
      name: string;
      username: string;
      avatarUrl: string;
    };
  };
};

export type ChromaticReviewDecision = {
  version: number;
  event: typeof EVENTS.REVIEW_DECISION;
  reviewDecision: {
    status: (typeof REVIEW_DECISION_STATUSES)[keyof typeof REVIEW_DECISION_STATUSES];
    project: {
      name: string;
      accountName: string;
      accountAvatarUrl: string;
      webUrl: string;
    };
    review: {
      number: number;
      title: string;
      status: (typeof REVIEW_STATUSES)[keyof typeof REVIEW_STATUSES];
      baseRefName: string;
      headRefName: string;
      isCrossRepository: boolean;
      webUrl: string;
      author: {
        name: string;
        username: string;
        avatarUrl: string;
      };
    };
    reviewer: {
      name: string;
      username: string;
      avatarUrl: string;
    };
  };
};

export type ChromaticPayload =
  | ChromaticBuildUpdates
  | ChromaticReviewUpdates
  | ChromaticReviewDecision;

export type TeamsMessage = {
  $schema: string;
  type: "AdaptiveCard";
  version: string;
  body: Array<{
    type: string;
    text?: string;
    weight?: string;
    size?: string;
    color?: string;
    facts?: Array<{ title: string; value: string }>;
    actions?: Array<{ type: string; title: string; url: string }>;
  }>;
};
