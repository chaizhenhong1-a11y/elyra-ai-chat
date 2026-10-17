CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "default_language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
    "conversation_saving_enabled" BOOLEAN NOT NULL DEFAULT false,
    "conversation_retention_days" INTEGER NOT NULL DEFAULT 30,
    "max_message_length" INTEGER NOT NULL DEFAULT 4000,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
