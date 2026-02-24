import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SlotsService } from "./slots.service";
import { BySlotIdDto, CreateSlotDto, ResourceSlotsDto, SlotDto, UpdateSlotTimesDto } from "./types/dtos/slots.dto";

@ApiTags('Slots')
@Controller('slots')
export class SlotsController {
    constructor(private readonly slotsService: SlotsService) { }

    @Get()
    @ApiOperation({ summary: "Get today's slots", description: "Returns all of today's slots across all resources, each annotated with its conflicts." })
    @ApiOkResponse({ type: ResourceSlotsDto, isArray: true, description: "All slots across all resources, each annotated with its conflicts" })
    getSlots(): Promise<ResourceSlotsDto[]> {
        return this.slotsService.getSlots();
    }

    @Post()
    @ApiOperation({ summary: 'Create a new slot', description: 'Creates a new slot. Rejects with 409 if it conflicts with existing bookings.' })
    @ApiCreatedResponse({ type: SlotDto, description: 'The created slot' })
    @ApiConflictResponse({ type: SlotDto, isArray: true, description: 'The proposed slot conflicts with existing bookings' })
    addSlot(@Body() createSlot: CreateSlotDto): Promise<SlotDto> {
        return this.slotsService.addSlot(createSlot);
    }

    @Put(':slotId')
    @ApiOperation({ summary: 'Update slot times', description: 'Updates the start and end times of an existing slot. Rejects with 409 if the new times conflict.' })
    @ApiOkResponse({ type: SlotDto, description: 'The updated slot' })
    @ApiConflictResponse({ type: SlotDto, isArray: true, description: 'The new times conflict with existing bookings' })
    updateSlot(@Param() { slotId }: BySlotIdDto, @Body() updateSlot: UpdateSlotTimesDto): Promise<SlotDto> {
        return this.slotsService.updateSlot(slotId, updateSlot);
    }
}