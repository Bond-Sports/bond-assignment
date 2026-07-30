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
    const [resources, slots, dependencies] = await Promise.all([
      this.manager.find(Resource, { order: { id: 'ASC' } }),
      this.manager.find(Slot, { order: { id: 'ASC' } }),
      this.manager.find(BlockingDependency),
    ]);

    const results = resources.map((resource) => {
      const blockingResourceIds = this.getBlockingResourceIds(
        resource.id,
        dependencies,
      );

      return {
        resourceId: resource.id,
        slots: slots
          .filter(
            (slot) =>
              slot.resourceId === resource.id ||
              blockingResourceIds.includes(slot.resourceId),
          )
          .map((slot) => ({
            ...slot,
            conflicts: this.findConflicts(slot, slots, dependencies),
          })),
      };
    });

    return results;
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

  private isConflict(
    slot: Pick<Slot, 'start' | 'end'>,
    other: Pick<Slot, 'start' | 'end'>,
  ): boolean {
    return slot.start < other.end && other.start < slot.end;
  }

  private findConflicts(
    slot: Slot,
    slots: Slot[],
    dependencies: BlockingDependency[],
  ): Slot[] {
    const blockingResourceIds = this.getBlockingResourceIds(
      slot.resourceId,
      dependencies,
    );

    return slots.filter(
      (other) =>
        other.id !== slot.id &&
        (other.resourceId === slot.resourceId ||
          blockingResourceIds.includes(other.resourceId)) &&
        this.isConflict(slot, other),
    );
  }

  private getBlockingResourceIds(
    resourceId: number,
    dependencies: BlockingDependency[],
  ): number[] {
    return dependencies
      .filter((dependency) => dependency.blockedResourceId === resourceId)
      .map((dependency) => dependency.blockingResourceId);
  }
}
