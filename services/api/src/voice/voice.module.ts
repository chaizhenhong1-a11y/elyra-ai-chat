import {KokoroPreviewService} from "./kokoro-preview.service";import {Module} from "@nestjs/common";import {VoiceController} from "./voice.controller";import {VoiceService} from "./voice.service";import {PiperPreviewService} from "./piper-preview.service";@Module({controllers:[VoiceController],providers:[VoiceService,PiperPreviewService,KokoroPreviewService]})export class VoiceModule{}

