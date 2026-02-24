import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlotsModule } from './slots/slots.module';
import { ResourcesModule } from './resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'bond',
      password: 'bond',
      database: 'bond',
      autoLoadEntities: true,
      synchronize: true,
    }),
    SlotsModule,
    ResourcesModule,
  ],
})
export class AppModule {}
