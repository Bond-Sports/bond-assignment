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
    const [resources, slots, dependencies] = await Promise.all([
      this.manager.find(Resource, { order: { id: 'ASC' } }),
      this.manager.find(Slot, { order: { id: 'ASC' } }),
      this.manager.find(BlockingDependency),
    ]);
  
    const blockersByResourceId = this.getBlockersByResourceId(dependencies);
  
    return resources.map((resource) => {
      const blockingResourceIds =
        blockersByResourceId.get(resource.id) ?? new Set<number>();
  
      const relevantResourceIds = new Set<number>([
        resource.id,
        ...blockingResourceIds,
      ]);
  
      const relevantSlots = slots.filter((slot) =>
        relevantResourceIds.has(slot.resourceId),
      );
  
      return {
        resourceId: resource.id,
        slots: relevantSlots.map((slot) => ({
          ...slot,
          conflicts: this.getSlotConflicts(
            slot,
            relevantSlots,
            blockersByResourceId.get(slot.resourceId) ?? new Set<number>(),
          ),
        })),
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

  private getBlockersByResourceId(
  dependencies: BlockingDependency[],
): Map<number, Set<number>> {
  const blockersByResourceId = new Map<number, Set<number>>();

  for (const dependency of dependencies) {
    const blockingResourceIds =
      blockersByResourceId.get(dependency.blockedResourceId) ??
      new Set<number>();
    
    blockingResourceIds.add(dependency.blockingResourceId);
    blockersByResourceId.set(
      dependency.blockedResourceId,
      blockingResourceIds,
    );
  }
  return blockersByResourceId;
}

  private getSlotConflicts(
    slot: Slot,
    slots: Slot[],
    blockingResourceIds: Set<number>,
  ): Slot[] {
    const slotStart = new Date(slot.start).getTime();
    const slotEnd = new Date(slot.end).getTime();
  
    return slots.filter((otherSlot) => {
      const otherStart = new Date(otherSlot.start).getTime();
      const otherEnd = new Date(otherSlot.end).getTime();
  
  
      return (
        otherSlot.id !== slot.id &&
        otherStart < slotEnd &&
        otherEnd > slotStart
      );
    });
  }
}
