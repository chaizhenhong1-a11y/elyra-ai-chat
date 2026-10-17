export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConversationLanguageContext {
  locale: string;
  history: ChatHistoryMessage[];
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  persist?: boolean;
  history: ChatHistoryMessage[];
  languageContext?: ConversationLanguageContext;
}

export interface ChatResponse {
  conversationId: string | null;
  reply: string;
  matched: boolean;
  ruleId: string | null;
  ruleName: string | null;
  replySource: "rule" | "ai" | "fallback";
}
