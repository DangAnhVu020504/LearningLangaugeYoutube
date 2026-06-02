import { Module } from '@nestjs/common';
import { TranslateController } from './translate.controller';
import { TranslateService } from './translate.service';
import { LlmService } from './llm.service';

@Module({
  controllers: [TranslateController],
  providers: [TranslateService, LlmService],
})
export class TranslateModule {}
