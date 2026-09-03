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
  //   // TODO: Implement this method.
  //   // Return today's slots grouped by resource, including slots from
  //   // blocking resources. Each slot should have its conflicts computed.
  //   const slots = await this.manager.find(Slot, {
  //     order: { id: 'ASC' },
  //   });

  //   const blockedDependencies = await this.manager.find(BlockingDependency);

  //   const conflictedResources = new Map<number, Set<number>>();
  //   blockedDependencies.forEach(d => {
  //     if(!conflictedResources.has(d.blockedResourceId)) {
  //       conflictedResources.set(d.blockedResourceId, new Set([d.blockingResourceId]));
  //     } else {
  //       conflictedResources.get(d.blockedResourceId)!.add(d.blockingResourceId);
  //     }
  //   })

  //   const resources = [...new Set(slots.map((slot) => slot.resourceId))];
  //   const conflictedResults = resources.map((resourceId) => {
  //     const affectedSlots = slots.filter((slot) => slot.resourceId === resourceId ||
  //     conflictedResources.get(resourceId).has(slot.resourceId)
  //   );

  //     return {
  //       resourceId,
  //       slots: affectedSlots.map(slot => ({ ...slot, 
  //         conflicts: affectedSlots.filter(otherSlot => otherSlot.id !== slot.id &&  
  //           otherSlot.start < slot.end && otherSlot.end > slot.start) 
  //       })),
  //     }
  //   });

  //   return conflictedResults;
    const [slots, dependencies, resources] = await Promise.all([
      this.manager.find(Slot, { order: { id: 'ASC' } }),
      this.manager.find(BlockingDependency),
      this.manager.find(Resource),
    ]);
    
    // blockedResourceId → Set of blockingResourceIds
    const blockersByResource = new Map<number, Set<number>>();
    for (const d of dependencies) {
      const blockers = blockersByResource.get(d.blockedResourceId) ?? new Set();
      blockers.add(d.blockingResourceId);
      blockersByResource.set(d.blockedResourceId, blockers);
    }
    
    const overlaps = (a: Slot, b: Slot) => a.start < b.end && a.end > b.start;
    
    const conflictsOf = (slot: Slot): Slot[] =>
      slots.filter((other) => {
        if (other.id === slot.id || !overlaps(slot, other)) return false;
        if (other.resourceId === slot.resourceId) return true;
        return blockersByResource.get(slot.resourceId)?.has(other.resourceId) ?? false;
      });
    
    const slotsWithConflicts = slots.map((slot) => ({
      ...slot,
      conflicts: conflictsOf(slot),
    }));
    
    return resources.map((resource) => {
      const blockers = blockersByResource.get(resource.id) ?? new Set();
      return {
        resourceId: resource.id,
        slots: slotsWithConflicts.filter(
          (slot) =>
            slot.resourceId === resource.id || blockers.has(slot.resourceId),
        ),
      };
    });
  
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
