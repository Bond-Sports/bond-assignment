import { Module } from "@nestjs/common";
import { SlotsService } from "./slots.service";
import { SlotsController } from "./slots.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Slot } from "src/entities/slot.entity";
import { Resource } from "src/entities/resource.entity";
import { BlockingDependency } from "src/entities/blocking-dependency.entity";


@Module({
    imports: [TypeOrmModule.forFeature([Slot, Resource, BlockingDependency])],
    providers: [SlotsService],
    controllers: [SlotsController],
})
export class SlotsModule { }