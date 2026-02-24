import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { CreateSlotDto, ResourceSlotsDto, SlotDto, UpdateSlotTimesDto } from "./types/dtos/slots.dto";
import { Slot } from "src/entities/slot.entity";

@Injectable()
export class SlotsService {
    constructor(private readonly manager: EntityManager) { }

    /**
     * Returns all slots across all resources, each annotated with its conflicts
     * @returns {Promise<ResourceSlotsDto[]>}
     */
    async getSlots(): Promise<ResourceSlotsDto[]> {
        throw new Error('Not implemented');
    }

    /**
     * Creates a new slot and returns it
     * Should validate the slot and reject if it conflicts with any existing slots
     * @param createSlot {SlotDto}  
     * @returns {Promise<SlotDto>}
     */
    async addSlot(createSlot: CreateSlotDto): Promise<SlotDto> {
        // TODO: calculate conflicts and reject if there are any

        const slot: Slot = await this.manager.save(Slot.create({ start: createSlot.start, end: createSlot.end, name: createSlot.name, resourceId: createSlot.resourceId }));

        return slot as unknown as SlotDto;
    }

    /**
     * Updates the times of a slot
     * Should validate the slot and reject if it conflicts with any existing slots
     * @param slotId {number} the id of the slot to update
     * @param updateSlot {UpdateSlotTimesDto} the new times for the slot
     * @returns {Promise<SlotDto>}
     */
    async updateSlot(slotId: number, updateSlot: UpdateSlotTimesDto): Promise<SlotDto> {
        // TODO: calculate conflicts and reject if there are any

        await this.manager.update(Slot, { id: slotId }, { start: updateSlot.start, end: updateSlot.end });

        throw new Error('Not implemented');
    }
}