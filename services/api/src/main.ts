import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin) return callback(null, true);
      try {
        const url = new URL(origin);
        const isDevPort = url.port === "3000" || url.port === "3001";
        const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
        const isPrivateLan = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname);
        callback(null, isDevPort && (isLocalHost || isPrivateLan));
      } catch {
        callback(null, false);
      }
    },
  });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`Elyra API listening on http://localhost:${port}/api/v1`);
}
void bootstrap();
