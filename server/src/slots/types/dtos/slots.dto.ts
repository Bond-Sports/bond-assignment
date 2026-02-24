import { IsDateString, IsInt, IsNotEmpty, IsPositive, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TimeSlotDto {
    @ApiProperty({ example: '2026-02-23T09:00:00', description: 'Start datetime (YYYY-MM-DDThh:mm:ss)' })
    @IsDateString()
    start: string;

    @ApiProperty({ example: '2026-02-23T10:30:00', description: 'End datetime (YYYY-MM-DDThh:mm:ss)' })
    @IsDateString()
    end: string;

    @ApiProperty({ example: 2, description: 'ID of the resource to book' })
    @IsInt()
    @IsPositive()
    resourceId: number;
}

export class CreateSlotDto {
    @ApiProperty({ example: 'Morning Swim', description: 'Booking title' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: '2026-02-23T09:00:00', description: 'Start datetime (YYYY-MM-DDThh:mm:ss)' })
    @IsDateString()
    start: string;

    @ApiProperty({ example: '2026-02-23T10:30:00', description: 'End datetime (YYYY-MM-DDThh:mm:ss)' })
    @IsDateString()
    end: string;

    @ApiProperty({ example: 2, description: 'ID of the resource to book' })
    @IsInt()
    @IsPositive()
    resourceId: number;
}

export class UpdateSlotTimesDto {
    @ApiProperty({ example: '2026-02-23T10:00:00', description: 'New start datetime (YYYY-MM-DDThh:mm:ss)' })
    @IsDateString()
    start: string;

    @ApiProperty({ example: '2026-02-23T11:30:00', description: 'New end datetime (YYYY-MM-DDThh:mm:ss)' })
    @IsDateString()
    end: string;
}

export class SlotDto extends CreateSlotDto {
    @ApiProperty({ example: 1, description: 'Slot ID' })
    id: number;

    @ApiProperty({ type: () => [SlotDto], description: 'Conflicting slots' })
    conflicts: SlotDto[];
}

export class BySlotIdDto {
    @ApiProperty({ example: 1, description: 'Slot ID' })
    @IsInt()
    @IsPositive()
    slotId: number;
}

export class ResourceSlotsDto {
    @ApiProperty({ example: 1, description: 'Resource ID' })
    resourceId: number;

    @ApiProperty({ type: () => [SlotDto], description: 'Slots' })
    slots: SlotDto[];
}