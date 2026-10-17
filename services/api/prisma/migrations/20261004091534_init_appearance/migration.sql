-- CreateTable
CREATE TABLE "appearance_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "background_type" TEXT NOT NULL DEFAULT 'gradient',
    "background_image_url" TEXT,
    "background_overlay" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    "background_blur" INTEGER NOT NULL DEFAULT 0,
    "glass_opacity" DOUBLE PRECISION NOT NULL DEFAULT 0.14,
    "accent_color" TEXT NOT NULL DEFAULT '#8B7CFF',
    "background_position" TEXT NOT NULL DEFAULT 'center',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appearance_settings_pkey" PRIMARY KEY ("id")
);
