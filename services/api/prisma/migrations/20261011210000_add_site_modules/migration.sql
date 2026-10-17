CREATE TABLE "site_modules" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_modules_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "site_modules_sort_order_idx" ON "site_modules"("sort_order");
INSERT INTO "site_modules" ("key","label","description","enabled","sort_order","updated_at") VALUES
('chat','Chat','Core conversation experience',true,0,CURRENT_TIMESTAMP),
('memory','Memory','Personal memory and continuity',true,1,CURRENT_TIMESTAMP),
('about','About','Information about this space',true,2,CURRENT_TIMESTAMP),
('explore','Explore','Discover ideas and experiences',true,3,CURRENT_TIMESTAMP);
