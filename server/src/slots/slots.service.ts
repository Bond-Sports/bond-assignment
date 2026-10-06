import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Slot } from 'src/entities/slot.entity';
import { BlockingDependency } from 'src/entities/blocking-dependency.entity';
import { Resource } from 'src/entities/resource.entity';
import { EntityManager } from 'typeorm';
import {
  CreateSlotDto,
  ResourceSlotsDto,
  SlotDto,
  UpdateSlotTimesDto,
} from './types/dtos/slots.dto';

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  checkConflict(
    slot: Slot,
    anotherSlot: Slot,
    blockingDependencies: BlockingDependency[],
  ): boolean {
    const overlaps =
      slot.id !== anotherSlot.id &&
      slot.start < anotherSlot.end &&
      slot.end > anotherSlot.start;

    if (!overlaps) return false;

    if (slot.resourceId === anotherSlot.resourceId) return true;
    
    return blockingDependencies.some(
      (dependency) =>
        dependency.blockedResourceId === slot.resourceId &&
        dependency.blockingResourceId === anotherSlot.resourceId,
    );
  }

  async getSlots(): Promise<ResourceSlotsDto[]> {
    // TODO: Implement this method.
    // Return today's slots grouped by resource, including slots from
    // blocking resources. Each slot should have its conflicts computed.
    const [slots, blockingDependencies] = await Promise.all([

      this.manager.find(Slot, { order: { resourceId: 'ASC', start: 'ASC' } }),
      this.manager.find(BlockingDependency, { order: { id: 'ASC' } }),
    ]);

    const result: ResourceSlotsDto[] = [];

    for (const slot of slots) {
      let resource = result.find((r) => r.resourceId === slot.resourceId);
      const relatedBlockedIds = blockingDependencies
        .filter((b) => b.blockingResourceId === slot.resourceId)
        .map((b) => b.blockedResourceId);

      if (!resource) {
        resource = {
          resourceId: slot.resourceId,
          slots: [],
        };
        result.push(resource);
      }

      const blockedResources = relatedBlockedIds.map((blockedId) => {
        let blocked = result.find((r) => r.resourceId === blockedId);
        if (!blocked) {
          blocked = {
            resourceId: blockedId,
            slots: [],
          };
          result.push(blocked);
        }
        return blocked;
      });

      const resources = [resource, ...blockedResources];
      const conflicts = slots.filter((s) =>
        this.checkConflict(slot, s, blockingDependencies),
      );
      const slotWithConflicts = { ...slot, conflicts };

      resources.forEach((r) => r.slots.push(slotWithConflicts));
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
