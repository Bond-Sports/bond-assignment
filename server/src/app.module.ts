import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { SlotsModule } from './slots/slots.module';
import { ResourcesModule } from './resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: join(__dirname, '..', 'database.sqlite'),
      autoLoadEntities: true,
    }),
    SlotsModule,
    ResourcesModule,
  ],
})
export class AppModule { }
