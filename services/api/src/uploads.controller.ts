import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { diskStorage } from "multer";

const UPLOAD_DIR = resolve(process.cwd(), "uploads");
const MAX_BACKGROUND_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function ensureUploadDirectory() {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller("uploads")
export class UploadsController {
  @Post("background")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_BACKGROUND_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!MIME_EXTENSIONS[file.mimetype]) {
          callback(new BadRequestException("Background must be a JPG, PNG, or WEBP image."), false);
          return;
        }
        callback(null, true);
      },
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          ensureUploadDirectory();
          callback(null, UPLOAD_DIR);
        },
        filename: (_request, file, callback) => {
          const extension = MIME_EXTENSIONS[file.mimetype] ?? extname(file.originalname).toLowerCase();
          callback(null, `background-${randomUUID()}${extension}`);
        },
      }),
    }),
  )
  uploadBackground(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Choose a background image to upload.");
    }

    return {
      url: `/api/v1/uploads/${encodeURIComponent(file.filename)}`,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  @Post("avatar")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 4 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (!MIME_EXTENSIONS[file.mimetype]) {
          callback(new BadRequestException("Avatar must be a JPG, PNG, or WEBP image."), false);
          return;
        }
        callback(null, true);
      },
      storage: diskStorage({
        destination: (_request, _file, callback) => { ensureUploadDirectory(); callback(null, UPLOAD_DIR); },
        filename: (_request, file, callback) => {
          const extension = MIME_EXTENSIONS[file.mimetype] ?? extname(file.originalname).toLowerCase();
          callback(null, `avatar-${randomUUID()}${extension}`);
        },
      }),
    }),
  )
  uploadAvatar(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Choose an avatar image to upload.");
    return { url: `/api/v1/uploads/${encodeURIComponent(file.filename)}`, filename: file.filename, size: file.size, mimeType: file.mimetype };
  }

  @Get(":filename")
  getUpload(@Param("filename") filename: string, @Res() response: Response) {
    if (!/^(?:(?:background|avatar)-[0-9a-f-]+\.(?:jpg|png|webp)|voice-[0-9]+\.(?:wav|mp3|m4a|webm|ogg)|(?:piper|kokoro)-preview-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.wav)$/i.test(filename)) {
      throw new NotFoundException("Upload not found.");
    }

    const filePath = join(UPLOAD_DIR, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException("Upload not found.");
    }

    return response.sendFile(filePath);
  }
}

