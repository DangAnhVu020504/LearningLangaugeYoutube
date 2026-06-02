import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranscriptModule } from './transcript/transcript.module';
import { TranslateModule } from './translate/translate.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TranscriptModule,
    TranslateModule,
  ],
})
export class AppModule {}
