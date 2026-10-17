CREATE TABLE "reply_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggers" TEXT[],
    "match_mode" TEXT NOT NULL DEFAULT 'contains',
    "reply" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reply_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reply_rules_enabled_priority_idx" ON "reply_rules"("enabled", "priority");
