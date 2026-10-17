CREATE TABLE "voice_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "provider" TEXT NOT NULL DEFAULT 'openvoice',
  "profile_name" TEXT NOT NULL DEFAULT 'Stanley Original',
  "reference_audio_url" TEXT,
  "language" TEXT NOT NULL DEFAULT 'auto',
  "speed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "auto_speak" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "voice_settings_pkey" PRIMARY KEY ("id")
);
