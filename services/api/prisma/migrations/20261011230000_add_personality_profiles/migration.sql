CREATE TABLE "personality_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT 'balanced',
    "empathy" INTEGER NOT NULL DEFAULT 70,
    "humor" INTEGER NOT NULL DEFAULT 40,
    "formality" INTEGER NOT NULL DEFAULT 40,
    "reply_length" TEXT NOT NULL DEFAULT 'medium',
    "behavior_instructions" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "personality_profiles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "personality_profiles_active_idx" ON "personality_profiles"("active");

INSERT INTO "personality_profiles" ("id", "name", "description", "tone", "empathy", "humor", "formality", "reply_length", "behavior_instructions", "active", "updated_at")
VALUES ('default', 'Balanced', 'Friendly, natural and balanced everyday conversation.', 'friendly, natural, balanced', 70, 40, 40, 'medium', 'Be warm and natural. Do not blindly agree with the user. Respond like a thoughtful conversational companion.', true, CURRENT_TIMESTAMP);
