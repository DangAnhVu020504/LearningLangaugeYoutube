import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS để Frontend có thể gọi API
  app.enableCors({
    origin: true, // Cho phép tất cả origins (development only)
    credentials: true,
  });

  // Global prefix cho tất cả routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend đang chạy tại: http://localhost:${port}/api`);
}

bootstrap();
