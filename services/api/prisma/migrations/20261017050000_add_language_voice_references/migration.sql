ALTER TABLE "voice_settings" ADD COLUMN IF NOT EXISTS "supported_languages" TEXT[] NOT NULL DEFAULT ARRAY['en', 'zh', 'ms']::TEXT[];
UPDATE "voice_settings" SET "supported_languages" = ARRAY['en', 'zh', 'ms']::TEXT[] WHERE "supported_languages" IS NULL;
ALTER TABLE "voice_settings" ALTER COLUMN "supported_languages" SET NOT NULL;

CREATE TABLE "voice_references" (
  "profile_id" TEXT NOT NULL DEFAULT 'default',
  "language" TEXT NOT NULL,
  "audio_url" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "voice_references_pkey" PRIMARY KEY ("profile_id", "language"),
  CONSTRAINT "voice_references_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "voice_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
