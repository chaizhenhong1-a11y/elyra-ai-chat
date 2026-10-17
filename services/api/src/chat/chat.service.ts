import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ReplyRule } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { ChatHistoryMessage, ChatRequest, ChatResponse } from "./chat.types";
import { SemanticMatcherService } from "./semantic-matcher.service";
import { SettingsService } from "../settings/settings.service";
import { AiConversationService } from "./ai-conversation.service";

const FALLBACK_REPLY = "I don't have a configured reply for that yet.";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly semanticMatcher: SemanticMatcherService,
    private readonly settingsService: SettingsService,
    private readonly aiConversation: AiConversationService,
  ) {}

  async reply(input: unknown): Promise<ChatResponse> {
    const settings = await this.settingsService.getSettings();
    const request = this.readRequest(input, settings.maxMessageLength);
    if (settings.maintenanceMode) {
      throw new ServiceUnavailableException("Chat is temporarily unavailable while maintenance mode is enabled.");
    }
    const normalizedMessage = this.normalize(request.message);

    const rules = await this.prisma.replyRule.findMany({
      where: { enabled: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    // Deterministic rules always win. Semantic matching is a fallback only.
    const deterministicRule =
      rules.find(
        (rule) =>
          rule.matchMode !== "semantic" && this.matches(rule, normalizedMessage),
      ) ?? null;

    const semanticRules = rules.filter((rule) => rule.matchMode === "semantic");
    const providerMatch = deterministicRule
      ? null
      : await this.semanticMatcher.findBestMatch(request.message, semanticRules);

    // Keep the local v1 matcher as a zero-dependency fallback when no API key is
    // configured or the provider is temporarily unavailable.
    const localSemanticRule =
      deterministicRule || providerMatch
        ? null
        : semanticRules.find((rule) => this.semanticMatches(rule, request.message)) ?? null;

    const matchedRule = deterministicRule ?? providerMatch?.rule ?? localSemanticRule;
    const shouldPersist = settings.conversationSavingEnabled && request.persist !== false;
    const conversationHistory = shouldPersist && request.conversationId
      ? await this.loadConversationHistory(request.conversationId)
      : request.history;
    const aiReply = matchedRule
      ? null
      : await this.aiConversation.generateReply(request.message, conversationHistory, request.languageContext);
    const reply = matchedRule?.reply ?? aiReply ?? FALLBACK_REPLY;
    const replySource: ChatResponse["replySource"] = matchedRule
      ? "rule"
      : aiReply
        ? "ai"
        : "fallback";

    if (!shouldPersist) {
      return {
        conversationId: null,
        reply,
        matched: matchedRule !== null,
        ruleId: matchedRule?.id ?? null,
        ruleName: matchedRule?.name ?? null,
        replySource,
      };
    }

    const conversationId = await this.prisma.$transaction(async (tx) => {
      let conversationId = request.conversationId;

      if (conversationId) {
        const exists = await tx.conversation.findUnique({
          where: { id: conversationId },
          select: { id: true },
        });
        if (!exists) {
          throw new NotFoundException("Conversation not found.");
        }
      } else {
        const conversation = await tx.conversation.create({
          data: { title: this.makeTitle(request.message) },
          select: { id: true },
        });
        conversationId = conversation.id;
      }

      await tx.message.createMany({
        data: [
          {
            conversationId,
            role: "user",
            content: request.message,
          },
          {
            conversationId,
            role: "assistant",
            content: reply,
            matchedRuleId: matchedRule?.id ?? null,
          },
        ],
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return conversationId;
    });

    return {
      conversationId,
      reply,
      matched: matchedRule !== null,
      ruleId: matchedRule?.id ?? null,
      ruleName: matchedRule?.name ?? null,
      replySource,
    };
  }

  private matches(rule: ReplyRule, normalizedMessage: string): boolean {
    return rule.triggers.some((trigger) => {
      const normalizedTrigger = this.normalize(trigger);
      if (rule.matchMode === "exact") return normalizedMessage === normalizedTrigger;
      if (rule.matchMode === "contains") return normalizedMessage.includes(normalizedTrigger);
      return false;
    });
  }

  private semanticMatches(rule: ReplyRule, message: string): boolean {
    const messageForms = this.semanticForms(message);

    return rule.triggers.some((trigger) => {
      const triggerForms = this.semanticForms(trigger);
      let best = 0;

      for (const left of messageForms) {
        for (const right of triggerForms) {
          if (left === right) return true;
          best = Math.max(best, this.similarity(left, right));
        }
      }

      return best >= 0.72;
    });
  }

  private semanticForms(value: string): string[] {
    const compact = this.normalize(value)
      .replace(/[\s\p{P}\p{S}]+/gu, "")
      .replace(/^(你觉得|你认为|请问|想问|我想问)/u, "");

    const forms = new Set<string>([compact]);
    const withoutParticle = compact.replace(/[吗嘛么呢吧不]$/u, "");
    if (withoutParticle) forms.add(withoutParticle);

    // Common Mandarin A-not-A questions: 帅不帅 -> 帅, 好不好 -> 好.
    const aNotA = compact.replace(/([\p{Script=Han}])不\1/gu, "$1");
    if (aNotA) forms.add(aNotA.replace(/[吗嘛么呢吧]$/u, ""));

    return [...forms].filter(Boolean);
  }

  private similarity(left: string, right: string): number {
    if (!left || !right) return 0;
    if (left.includes(right) || right.includes(left)) {
      const shorter = Math.min(left.length, right.length);
      const longer = Math.max(left.length, right.length);
      if (shorter >= 2) return Math.max(0.8, shorter / longer);
    }

    const distance = this.levenshtein(left, right);
    return 1 - distance / Math.max(left.length, right.length);
  }

  private levenshtein(left: string, right: string): number {
    const a = Array.from(left);
    const b = Array.from(right);
    const previous = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      for (let j = 1; j <= b.length; j += 1) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
      for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
    }

    return previous[b.length];
  }

  private readRequest(input: unknown, maxMessageLength: number): ChatRequest {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new BadRequestException("Request body must be an object.");
    }

    const body = input as Record<string, unknown>;
    const unknown = Object.keys(body).filter(
      (key) =>
        key !== "message" &&
        key !== "conversationId" &&
        key !== "persist" &&
        key !== "history" &&
        key !== "languageContext",
    );
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown chat field(s): ${unknown.join(", ")}`);
    }

    if (typeof body.message !== "string") {
      throw new BadRequestException("message must be a string.");
    }
    const message = body.message.trim();
    if (message.length === 0 || message.length > maxMessageLength) {
      throw new BadRequestException(`message must contain 1 to ${maxMessageLength} characters.`);
    }

    let conversationId: string | undefined;
    if (body.conversationId !== undefined && body.conversationId !== null) {
      if (typeof body.conversationId !== "string" || body.conversationId.trim().length === 0) {
        throw new BadRequestException("conversationId must be a non-empty string when provided.");
      }
      conversationId = body.conversationId.trim();
    }

    let persist: boolean | undefined;
    if (body.persist !== undefined) {
      if (typeof body.persist !== "boolean") {
        throw new BadRequestException("persist must be a boolean when provided.");
      }
      persist = body.persist;
    }

    const history = this.readHistory(body.history, maxMessageLength);

    let languageContext: ChatRequest["languageContext"];
    if(body.languageContext!==undefined){
      const value=body.languageContext as Record<string,unknown>;
      if(!value||typeof value!=="object"||Array.isArray(value)||typeof value.locale!=="string"||value.locale.length>35||!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value.locale)){
        throw new BadRequestException("Invalid languageContext locale.");
      }
      let locale:string;
      try{locale=Intl.getCanonicalLocales(value.locale)[0];}catch{throw new BadRequestException("Invalid languageContext locale.");}
      const languageHistory=this.readHistory(value.history,maxMessageLength);
      if(languageHistory.some(item=>item.role!=="user"))throw new BadRequestException("languageContext history must contain only user messages.");
      languageContext={locale,history:languageHistory};
    }
    return { message, conversationId, persist, history, languageContext };
  }

  private readHistory(input: unknown, maxMessageLength: number): ChatHistoryMessage[] {
    if (input === undefined) return [];
    if (!Array.isArray(input)) {
      throw new BadRequestException("history must be an array when provided.");
    }
    if (input.length > 20) {
      throw new BadRequestException("history may contain at most 20 messages.");
    }

    return input.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new BadRequestException(`history[${index}] must be an object.`);
      }
      const value = item as Record<string, unknown>;
      const unknown = Object.keys(value).filter((key) => key !== "role" && key !== "content");
      if (unknown.length > 0) {
        throw new BadRequestException(`Unknown history field(s): ${unknown.join(", ")}`);
      }
      if (value.role !== "user" && value.role !== "assistant") {
        throw new BadRequestException(`history[${index}].role must be user or assistant.`);
      }
      if (typeof value.content !== "string") {
        throw new BadRequestException(`history[${index}].content must be a string.`);
      }
      const content = value.content.trim();
      if (!content || content.length > maxMessageLength) {
        throw new BadRequestException(
          `history[${index}].content must contain 1 to ${maxMessageLength} characters.`,
        );
      }
      return { role: value.role, content };
    });
  }

  private async loadConversationHistory(conversationId: string): Promise<ChatHistoryMessage[]> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { role: true, content: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    return conversation.messages
      .reverse()
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role as ChatHistoryMessage["role"],
        content: message.content,
      }));
  }

  private makeTitle(message: string): string {
    const compact = message.replace(/\s+/g, " ").trim();
    return compact.length <= 80 ? compact : `${compact.slice(0, 77)}...`;
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
  }
}
