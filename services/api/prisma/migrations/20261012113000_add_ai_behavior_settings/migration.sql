ALTER TABLE "system_settings"
ADD COLUMN "allow_profanity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sensitive_advice_mode" TEXT NOT NULL DEFAULT 'cautious',
ADD COLUMN "custom_behavior_instructions" TEXT NOT NULL DEFAULT '';
