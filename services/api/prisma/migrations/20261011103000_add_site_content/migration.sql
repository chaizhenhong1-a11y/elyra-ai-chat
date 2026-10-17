CREATE TABLE "site_content" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "display_name" TEXT NOT NULL DEFAULT 'Your Space',
    "chat_name" TEXT NOT NULL DEFAULT 'Companion',
    "hero_eyebrow" TEXT NOT NULL DEFAULT 'A PRIVATE SPACE FOR CONVERSATION',
    "hero_title" TEXT NOT NULL DEFAULT 'Good evening.',
    "hero_subtitle" TEXT NOT NULL DEFAULT 'What’s on your mind?',
    "hero_description" TEXT NOT NULL DEFAULT 'A space to think, talk, and be yourself.',
    "opening_message" TEXT NOT NULL DEFAULT 'Hi. I’m here to listen, think with you, and have a meaningful conversation.',
    "input_placeholder" TEXT NOT NULL DEFAULT 'Message…',
    "status_text" TEXT NOT NULL DEFAULT 'Online',
    "quick_actions" TEXT[] DEFAULT ARRAY['Talk about anything', 'Get some advice', 'Explore ideas', 'Just chat']::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);
