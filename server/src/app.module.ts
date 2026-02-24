import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlotsModule } from './slots/slots.module';
import { ResourcesModule } from './resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'bond.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    }),
    SlotsModule,
    ResourcesModule,
  ],
})
export class AppModule {}
