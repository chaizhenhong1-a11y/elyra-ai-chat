ALTER TABLE "system_settings"
  ADD COLUMN "conversation_style" TEXT NOT NULL DEFAULT 'natural',
  ADD COLUMN "emotional_response" TEXT NOT NULL DEFAULT 'balanced',
  ADD COLUMN "disagreement_style" TEXT NOT NULL DEFAULT 'natural',
  ADD COLUMN "response_length" TEXT NOT NULL DEFAULT 'adaptive';

UPDATE "system_settings"
SET "sensitive_advice_mode" = 'cautious'
WHERE "sensitive_advice_mode" NOT IN ('strict', 'cautious', 'normal');
