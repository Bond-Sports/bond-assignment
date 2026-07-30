import { Injectable } from '@nestjs/common';
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

    const blockingResourceIdsByResource = new Map<number, Set<number>>();

    for (const dependency of dependencies) {
      const blockingResourceIds =
        blockingResourceIdsByResource.get(dependency.blockedResourceId) ??
        new Set<number>();

      blockingResourceIds.add(dependency.blockingResourceId);
      blockingResourceIdsByResource.set(
        dependency.blockedResourceId,
        blockingResourceIds,
      );
    }

    const slotsByResource = new Map<number, Slot[]>();

    for (const slot of slots) {
      const resourceSlots = slotsByResource.get(slot.resourceId) ?? [];

      resourceSlots.push(slot);
      slotsByResource.set(slot.resourceId, resourceSlots);
    }

    const conflictsBySlotId = new Map<number, Slot[]>();

    return resources.map((resource) =>
      this.getResourceSlots(
        resource.id,
        slotsByResource,
        blockingResourceIdsByResource,
        conflictsBySlotId,
      ),
    );
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

  private getConflicts(
    slot: Slot,
    slotsByResource: Map<number, Slot[]>,
    blockingResourceIdsByResource: Map<number, Set<number>>,
    conflictsBySlotId: Map<number, Slot[]>,
  ): Slot[] {
    const cachedConflicts = conflictsBySlotId.get(slot.id);

    if (cachedConflicts !== undefined) {
      return cachedConflicts;
    }

    const relevantResourceIds = new Set([
      slot.resourceId,
      ...(blockingResourceIdsByResource.get(slot.resourceId) ?? []),
    ]);

    const conflicts = [...relevantResourceIds]
      .flatMap((resourceId) => slotsByResource.get(resourceId) ?? [])
      .filter((other) => other.id !== slot.id && this.isConflict(slot, other));

    conflictsBySlotId.set(slot.id, conflicts);

    return conflicts;
  }

  private getResourceSlots(
    resourceId: number,
    slotsByResource: Map<number, Slot[]>,
    blockingResourceIdsByResource: Map<number, Set<number>>,
    conflictsBySlotId: Map<number, Slot[]>,
  ): ResourceSlotsDto {
    const relevantResourceIds = new Set([
      resourceId,
      ...(blockingResourceIdsByResource.get(resourceId) ?? []),
    ]);
    const resourceSlots = [...relevantResourceIds].flatMap(
      (id) => slotsByResource.get(id) ?? [],
    );

    return {
      resourceId,
      slots: resourceSlots.map((slot) => ({
        ...slot,
        conflicts: this.getConflicts(
          slot,
          slotsByResource,
          blockingResourceIdsByResource,
          conflictsBySlotId,
        ),
      })),
    };
  }
}
