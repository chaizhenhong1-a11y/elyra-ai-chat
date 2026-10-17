import { Module } from "@nestjs/common";
import { SiteContentController } from "./site-content.controller";
import { SiteContentService } from "./site-content.service";

@Module({ controllers: [SiteContentController], providers: [SiteContentService] })
export class SiteContentModule {}
