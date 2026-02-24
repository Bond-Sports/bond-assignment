import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Slot } from 'src/entities/slot.entity';
import { BlockingDependency } from 'src/entities/blocking-dependency.entity';
import { EntityManager } from 'typeorm';
import { Resource } from 'src/entities/resource.entity';
import {
  CreateSlotDto,
  ResourceSlotsDto,
  SlotDto,
  UpdateSlotTimesDto,
} from './types/dtos/slots.dto';

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  async getSlots(): Promise<ResourceSlotsDto[]> {
    // TODO: Implement this method.
    // Return today's slots grouped by resource, including slots from
    // blocking resources. Each slot should have its conflicts computed.
    const slots = await this.manager.find(Slot, {
      order: { id: 'ASC' },
    });

    const result: ResourceSlotsDto[] = [];

    for (const slot of slots) {
      let resource = result.find((r) => r.resourceId === slot.resourceId);

      if (!resource) {
        resource = {
          resourceId: slot.resourceId,
          slots: [],
        };
        result.push(resource);
      }

      resource.slots.push({ ...slot, conflicts: [] });
    }

    return result;
  }

  async addSlot(createSlot: CreateSlotDto): Promise<SlotDto> {
    // TODO: Implement this method.
    // Check for conflicts before saving. Reject with 409 if any exist.

    return this.manager.save(
      Slot.create({
        name: createSlot.name,
        start: createSlot.start,
        end: createSlot.end,
        resourceId: createSlot.resourceId,
      }),
    );
  }

  async updateSlot(
    slotId: number,
    updateSlot: UpdateSlotTimesDto,
  ): Promise<SlotDto> {
    // TODO: Implement this method.
    // Check for conflicts before saving. Reject with 409 if any exist.

    const slot = await this.manager.findOneOrFail(Slot, {
      where: { id: slotId },
    });

    slot.start = updateSlot.start;
    slot.end = updateSlot.end;
    await this.manager.save(slot);

    return {
      ...slot,
      conflicts: [],
    };
  }
}
