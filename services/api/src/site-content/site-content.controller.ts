import { Body, Controller, Get, Put } from "@nestjs/common";
import { SiteContentService } from "./site-content.service";

@Controller("site-content")
export class SiteContentController {
  constructor(private readonly service: SiteContentService) {}
  @Get() get() { return this.service.get(); }
  @Put() update(@Body() body: unknown) { return this.service.update(body); }
}
