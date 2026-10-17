import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(daysInput?: string) {
    const days = daysInput === undefined ? 30 : Number(daysInput);
    if (!Number.isInteger(days) || (days !== 7 && days !== 30)) {
      throw new BadRequestException("days must be 7 or 30.");
    }

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [conversations, messages, periodMessages, assistantMessages, rules] = await this.prisma.$transaction([
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.message.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: { id: true, conversationId: true, role: true, content: true, matchedRuleId: true, createdAt: true },
      }),
      this.prisma.message.findMany({
        where: { role: "assistant" },
        orderBy: { createdAt: "desc" },
        select: { id: true, conversationId: true, matchedRuleId: true, createdAt: true },
      }),
      this.prisma.replyRule.findMany({ select: { id: true, name: true, matchMode: true } }),
    ]);

    const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
    const matched = assistantMessages.filter((message) => message.matchedRuleId !== null);
    const unmatched = assistantMessages.length - matched.length;
    const matchRate = assistantMessages.length === 0 ? 0 : matched.length / assistantMessages.length;

    const ruleHits = new Map<string, number>();
    const modeHits = { exact: 0, contains: 0, semantic: 0, deleted: 0 };
    for (const message of matched) {
      const ruleId = message.matchedRuleId!;
      ruleHits.set(ruleId, (ruleHits.get(ruleId) ?? 0) + 1);
      const mode = ruleById.get(ruleId)?.matchMode;
      if (mode === "exact" || mode === "contains" || mode === "semantic") modeHits[mode] += 1;
      else modeHits.deleted += 1;
    }

    const topRules = [...ruleHits.entries()]
      .map(([ruleId, hits]) => ({
        ruleId,
        ruleName: ruleById.get(ruleId)?.name ?? "Deleted rule",
        matchMode: ruleById.get(ruleId)?.matchMode ?? "deleted",
        hits,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    const dayMap = new Map<string, { date: string; messages: number; userMessages: number; assistantMessages: number }>();
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(since);
      date.setUTCDate(since.getUTCDate() + offset);
      const key = date.toISOString().slice(0, 10);
      dayMap.set(key, { date: key, messages: 0, userMessages: 0, assistantMessages: 0 });
    }
    for (const message of periodMessages) {
      const key = message.createdAt.toISOString().slice(0, 10);
      const row = dayMap.get(key);
      if (!row) continue;
      row.messages += 1;
      if (message.role === "user") row.userMessages += 1;
      if (message.role === "assistant") row.assistantMessages += 1;
    }

    const unmatchedAssistant = assistantMessages.filter((message) => message.matchedRuleId === null).slice(0, 50);
    const unmatchedConversationIds = [...new Set(unmatchedAssistant.map((message) => message.conversationId))];
    const userMessages = unmatchedConversationIds.length === 0 ? [] : await this.prisma.message.findMany({
      where: { conversationId: { in: unmatchedConversationIds }, role: "user" },
      orderBy: { createdAt: "desc" },
      select: { id: true, conversationId: true, content: true, createdAt: true },
    });

    const recentUnmatched = unmatchedAssistant.flatMap((assistant) => {
      const user = userMessages.find(
        (candidate) => candidate.conversationId === assistant.conversationId && candidate.createdAt <= assistant.createdAt,
      );
      return user ? [{ id: user.id, conversationId: user.conversationId, content: user.content, createdAt: user.createdAt }] : [];
    }).slice(0, 12);

    return {
      rangeDays: days,
      counts: {
        conversations,
        messages,
        userMessages: await this.prisma.message.count({ where: { role: "user" } }),
        assistantMessages: assistantMessages.length,
        matched: matched.length,
        unmatched,
        matchRate,
      },
      modeHits,
      topRules,
      trend: [...dayMap.values()],
      recentUnmatched,
    };
  }
}
