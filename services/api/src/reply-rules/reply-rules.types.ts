export const MATCH_MODES = ["contains", "exact", "semantic"] as const;
export type MatchMode = (typeof MATCH_MODES)[number];

export interface CreateReplyRuleInput {
  name: string;
  triggers: string[];
  matchMode: MatchMode;
  reply: string;
  priority: number;
  enabled: boolean;
}

export type UpdateReplyRuleInput = Partial<CreateReplyRuleInput>;
