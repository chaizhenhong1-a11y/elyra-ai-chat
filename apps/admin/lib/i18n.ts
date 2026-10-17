import { ELYRA_LANGUAGE_CATALOG, languageName } from "./language-catalog.generated";

export type AdminLocale = "en" | "zh-CN" | "ms";

const ADMIN_LOCALE_CODES: AdminLocale[] = ["en", "zh-CN", "ms"];
export const ADMIN_LOCALES: { value: AdminLocale; label: string }[] = ADMIN_LOCALE_CODES.map((value) => {
  const language = ELYRA_LANGUAGE_CATALOG.find((entry) => entry.code === value);
  return { value, label: language ? languageName(language, value) : value };
});

const messages = {
  en: {
    uiLanguage:"Admin language", system:"SYSTEM", runtimeSettings:"Runtime Settings", postgres:"PostgreSQL",
    defaultLanguage:"Default product language", defaultLanguageHelp:"Default client UI language. This does not force the AI reply language.",
    timezone:"Timezone", timezoneHelp:"IANA timezone, for example Asia/Kuala_Lumpur.", maxMessage:"Maximum message length", maxMessageHelp:"The API rejects chat messages above this limit.",
    retention:"Conversation retention", retentionHelp:"Retention policy for persisted conversations and future scheduled cleanup.", saving:"Conversation saving", savingHelp:"Allow the API to persist conversations when a client requests persistence.",
    maintenance:"Maintenance mode", maintenanceHelp:"When enabled, chat requests return 503 until maintenance mode is disabled.", enabled:"Enabled", disabled:"Disabled",
    aiBehavior:"AI BEHAVIOR", behaviorPresets:"Behavior Presets", simpleControls:"Simple controls", conversationStyle:"Conversation style", emotionalResponse:"Emotional response", disagreement:"Disagreement", profanity:"Profanity", sensitiveAdvice:"Sensitive advice", responseLength:"Response length",
    natural:"Natural", casual:"Casual", professional:"Professional", low:"Low", balanced:"Balanced", high:"High", agreeable:"Agreeable", challenging:"Challenging", allow:"Allow", block:"Block", strict:"Strict", cautious:"Cautious", normal:"Normal", short:"Short", adaptive:"Adaptive", detailed:"Detailed",
    styleHelp:"Controls conversational register. Personality still controls character and attitude.", emotionHelp:"How strongly Elyra acknowledges and responds to emotion.", disagreementHelp:"How readily Elyra challenges assumptions while remaining truthful.", profanityHelp:"Allow natural profanity when appropriate. Core abuse and threat protections remain active.", adviceHelp:"Controls caution for medical, legal, financial and other high-impact topics.", lengthHelp:"Controls ordinary reply length without overriding necessary safety detail.",
    safety:"Core safety, prompt-injection protection, hidden-instruction protection and credential protection are always enabled.", status:"STATUS", environment:"Environment", api:"API", database:"Database", env:"Environment", development:"Development", runtimeHelp:"These checks come from the Elyra API. Secrets and connection strings are never exposed here.", reset:"Reset", save:"Save Settings", savingNow:"Saving…", saved:"Settings saved.", loadFailed:"Could not load settings.", saveFailed:"Save failed."
  },
  "zh-CN": {
    uiLanguage:"后台界面语言", system:"系统", runtimeSettings:"运行设置", postgres:"PostgreSQL",
    defaultLanguage:"默认产品语言", defaultLanguageHelp:"客户端界面的默认语言，不会强制 AI 使用该语言回复。",
    timezone:"时区", timezoneHelp:"IANA 时区，例如 Asia/Kuala_Lumpur。", maxMessage:"最大消息长度", maxMessageHelp:"超过此长度的聊天消息会被 API 拒绝。",
    retention:"对话保留天数", retentionHelp:"已保存对话的保留策略，供后续自动清理使用。", saving:"保存对话", savingHelp:"允许客户端请求时将对话保存到数据库。",
    maintenance:"维护模式", maintenanceHelp:"开启后聊天 API 返回 503，直到关闭维护模式。", enabled:"已启用", disabled:"已停用",
    aiBehavior:"AI 行为", behaviorPresets:"行为设置", simpleControls:"简单选择", conversationStyle:"对话风格", emotionalResponse:"情绪回应", disagreement:"反驳倾向", profanity:"粗口", sensitiveAdvice:"敏感建议", responseLength:"回复长度",
    natural:"自然", casual:"轻松", professional:"专业", low:"低", balanced:"平衡", high:"高", agreeable:"较顺从", challenging:"较敢反驳", allow:"允许", block:"禁止", strict:"严格", cautious:"谨慎", normal:"普通", short:"简短", adaptive:"自动调整", detailed:"详细",
    styleHelp:"控制整体对话表达方式；Personality 仍负责角色性格和态度。", emotionHelp:"控制 Elyra 对用户情绪的回应程度。", disagreementHelp:"控制 Elyra 在保持真实的前提下主动质疑用户观点的程度。", profanityHelp:"适当情况下允许自然粗口；辱骂与威胁等核心保护仍然生效。", adviceHelp:"控制医疗、法律、金融等高影响话题的谨慎程度。", lengthHelp:"控制一般回复长度，但不会覆盖必要的安全说明。",
    safety:"核心安全、Prompt Injection 防护、隐藏指令保护和凭证保护永久开启。", status:"状态", environment:"运行环境", api:"API", database:"数据库", env:"环境", development:"开发环境", runtimeHelp:"状态来自 Elyra API；密钥和数据库连接信息不会在这里显示。", reset:"重置", save:"保存设置", savingNow:"保存中…", saved:"设置已保存。", loadFailed:"无法加载设置。", saveFailed:"保存失败。"
  },
  ms: {
    uiLanguage:"Bahasa pentadbir", system:"SISTEM", runtimeSettings:"Tetapan Runtime", postgres:"PostgreSQL",
    defaultLanguage:"Bahasa produk lalai", defaultLanguageHelp:"Bahasa UI lalai untuk klien. Ini tidak memaksa bahasa balasan AI.",
    timezone:"Zon waktu", timezoneHelp:"Zon waktu IANA, contohnya Asia/Kuala_Lumpur.", maxMessage:"Panjang mesej maksimum", maxMessageHelp:"API menolak mesej yang melebihi had ini.",
    retention:"Tempoh simpan perbualan", retentionHelp:"Polisi simpanan untuk perbualan dan pembersihan automatik pada masa hadapan.", saving:"Simpan perbualan", savingHelp:"Benarkan API menyimpan perbualan apabila diminta oleh klien.",
    maintenance:"Mod penyelenggaraan", maintenanceHelp:"Apabila aktif, permintaan chat mengembalikan 503 sehingga mod ini dimatikan.", enabled:"Aktif", disabled:"Tidak aktif",
    aiBehavior:"TINGKAH LAKU AI", behaviorPresets:"Tetapan Tingkah Laku", simpleControls:"Kawalan ringkas", conversationStyle:"Gaya perbualan", emotionalResponse:"Respons emosi", disagreement:"Cara tidak bersetuju", profanity:"Bahasa kasar", sensitiveAdvice:"Nasihat sensitif", responseLength:"Panjang jawapan",
    natural:"Semula jadi", casual:"Santai", professional:"Profesional", low:"Rendah", balanced:"Seimbang", high:"Tinggi", agreeable:"Mudah bersetuju", challenging:"Mencabar", allow:"Benarkan", block:"Sekat", strict:"Ketat", cautious:"Berhati-hati", normal:"Biasa", short:"Pendek", adaptive:"Adaptif", detailed:"Terperinci",
    styleHelp:"Mengawal gaya umum perbualan. Personality masih mengawal watak dan sikap.", emotionHelp:"Tahap Elyra memberi perhatian kepada emosi pengguna.", disagreementHelp:"Tahap Elyra mencabar andaian pengguna sambil kekal benar.", profanityHelp:"Benarkan bahasa kasar secara semula jadi apabila sesuai; perlindungan teras kekal aktif.", adviceHelp:"Tahap berhati-hati untuk topik perubatan, undang-undang, kewangan dan topik berimpak tinggi.", lengthHelp:"Mengawal panjang jawapan biasa tanpa mengatasi butiran keselamatan yang diperlukan.",
    safety:"Keselamatan teras, perlindungan prompt injection, arahan tersembunyi dan kelayakan sentiasa aktif.", status:"STATUS", environment:"Persekitaran", api:"API", database:"Pangkalan data", env:"Persekitaran", development:"Pembangunan", runtimeHelp:"Semakan ini datang daripada Elyra API. Rahsia dan rentetan sambungan tidak dipaparkan.", reset:"Tetap semula", save:"Simpan Tetapan", savingNow:"Menyimpan…", saved:"Tetapan disimpan.", loadFailed:"Tetapan tidak dapat dimuatkan.", saveFailed:"Gagal menyimpan."
  }
} as const;

export type AdminMessageKey = keyof typeof messages.en;
export function adminMessages(locale: AdminLocale): Record<AdminMessageKey,string> { return messages[locale] as Record<AdminMessageKey,string>; }
export function isAdminLocale(value: string | null): value is AdminLocale { return value === "en" || value === "zh-CN" || value === "ms"; }
