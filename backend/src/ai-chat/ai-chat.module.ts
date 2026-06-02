import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { TranslateModule } from '../translate/translate.module';

@Module({
  imports: [TranslateModule], // Import để sử dụng LlmService
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}
