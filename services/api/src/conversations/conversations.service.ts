import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.conversation.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Conversation not found.");
    await this.prisma.conversation.delete({ where: { id } });
    return { deleted: true, id };
  }

  async get(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation) throw new NotFoundException("Conversation not found.");
    return conversation;
  }
}
