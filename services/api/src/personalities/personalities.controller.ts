import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { PersonalitiesService } from "./personalities.service";

@Controller("personalities")
export class PersonalitiesController {
  constructor(private readonly personalities: PersonalitiesService) {}
  @Get() list() { return this.personalities.list(); }
  @Get("active") active() { return this.personalities.getActive(); }
  @Post() create(@Body() body: unknown) { return this.personalities.create(body); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: unknown) { return this.personalities.update(id, body); }
  @Post(":id/activate") activate(@Param("id") id: string) { return this.personalities.activate(id); }
  @Delete(":id") remove(@Param("id") id: string) { return this.personalities.remove(id); }
}
