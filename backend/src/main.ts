import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS để Frontend có thể gọi API
  const allowedOrigins = [
    'http://localhost:4200',
    'https://learninglangaugeyoutube.onrender.com',
    process.env.FRONTEND_URL,
    // Dev Tunnels URLs
    /\.devtunnels\.ms$/,
    /\.app\.github\.dev$/,
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix cho tất cả routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend đang chạy tại: http://localhost:${port}/api`);
  console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
}

bootstrap();
