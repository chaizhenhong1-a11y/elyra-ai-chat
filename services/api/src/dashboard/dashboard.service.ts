import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      conversations,
      messages,
      replyRules,
      enabledRules,
      exactRules,
      containsRules,
      semanticRules,
      recentRules,
      recentConversations,
    ] = await this.prisma.$transaction([
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.replyRule.count(),
      this.prisma.replyRule.count({ where: { enabled: true } }),
      this.prisma.replyRule.count({ where: { matchMode: "exact" } }),
      this.prisma.replyRule.count({ where: { matchMode: "contains" } }),
      this.prisma.replyRule.count({ where: { matchMode: "semantic" } }),
      this.prisma.replyRule.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          matchMode: true,
          enabled: true,
          priority: true,
          updatedAt: true,
        },
      }),
      this.prisma.conversation.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return {
      counts: {
        conversations,
        messages,
        replyRules,
        enabledRules,
        disabledRules: replyRules - enabledRules,
        exactRules,
        containsRules,
        semanticRules,
      },
      recentRules,
      recentConversations,
    };
  }
}
