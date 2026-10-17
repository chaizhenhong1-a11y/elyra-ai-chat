export type ChatRule = { keywords: string[]; replies: string[] };

const rules: ChatRule[] = [
  { keywords: ["你好", "hello", "hi", "嗨"], replies: ["你好呀，很高兴你来了。", "嗨，我在。今天怎么样？"] },
  { keywords: ["心情不好", "难过", "不开心"], replies: ["可以慢慢说，我会听着。", "听起来今天不太好。想从发生了什么开始说吗？"] },
  { keywords: ["你是谁", "叫什么"], replies: ["我是这里陪你聊天的人。我的名字之后可以由管理员随时修改。"] },
];

export function replyFor(message: string): string {
  const normalized = message.trim().toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) return rule.replies[0];
  }
  return "我收到你的消息了。这个回复规则暂时还没有设置。";
}
