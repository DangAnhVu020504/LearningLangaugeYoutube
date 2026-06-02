import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranscriptModule } from './transcript/transcript.module';
import { TranslateModule } from './translate/translate.module';
import { AiChatModule } from './ai-chat/ai-chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TranscriptModule,
    TranslateModule,
    AiChatModule,
  ],
})
export class AppModule {}
