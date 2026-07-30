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
    const [slots, dependencies, resources] = await Promise.all([
      this.manager.find(Slot, {
        order: { id: 'ASC' },
      }),
      this.manager.find(BlockingDependency),
      this.manager.find(Resource, {
        order: { id: 'ASC' },
      }),
    ]);

    const slotsByResource = this.groupSlotsByResource(slots);
    const blockingResourceIds =
      this.groupBlockingResourceIdsByResource(dependencies);

    return this.buildResourceSlots(
      resources,
      slotsByResource,
      blockingResourceIds,
    );
  }

  private groupSlotsByResource(slots: Slot[]): Map<number, Slot[]> {
    const slotsByResource = new Map<number, Slot[]>();

    for (const slot of slots) {
      const resourceSlots = slotsByResource.get(slot.resourceId) ?? [];
      resourceSlots.push(slot);
      slotsByResource.set(slot.resourceId, resourceSlots);
    }

    return slotsByResource;
  }

  private groupBlockingResourceIdsByResource(
    dependencies: BlockingDependency[],
  ): Map<number, number[]> {
    const blockingResourceIds = new Map<number, number[]>();

    for (const dependency of dependencies) {
      const resourceBlockingIds =
        blockingResourceIds.get(dependency.blockedResourceId) ?? [];
      resourceBlockingIds.push(dependency.blockingResourceId);
      blockingResourceIds.set(
        dependency.blockedResourceId,
        resourceBlockingIds,
      );
    }

    return blockingResourceIds;
  }

  private buildResourceSlots(
    resources: Resource[],
    slotsByResource: Map<number, Slot[]>,
    blockingResourceIds: Map<number, number[]>,
  ): ResourceSlotsDto[] {
    const result: ResourceSlotsDto[] = [];
    const conflictsBySlotId = new Map<number, SlotDto[]>();

    for (const { id: resourceId } of resources) {
      const candidates = this.getResourceCandidates(
        resourceId,
        slotsByResource,
        blockingResourceIds,
      );
      const annotatedSlots: SlotDto[] = [];

      for (const slot of candidates) {
        const knownConflicts = conflictsBySlotId.get(slot.id);
        if (knownConflicts) {
          annotatedSlots.push({
            ...slot,
            conflicts: knownConflicts,
          });
          continue;
        }

        const conflicts = this.findFirstConflict(slot, candidates);

        if (conflicts.length > 0) {
          conflictsBySlotId.set(slot.id, conflicts);
        }

        annotatedSlots.push({
          ...slot,
          conflicts,
        });
      }

      result.push({
        resourceId,
        slots: annotatedSlots,
      });
    }

    this.applyKnownConflicts(result, conflictsBySlotId);

    return result;
  }

  private getResourceCandidates(
    resourceId: number,
    slotsByResource: Map<number, Slot[]>,
    blockingResourceIds: Map<number, number[]>,
  ): Slot[] {
    const resourceSlots = slotsByResource.get(resourceId) ?? [];
    const blockingSlots = (blockingResourceIds.get(resourceId) ?? []).flatMap(
      (blockingResourceId) => slotsByResource.get(blockingResourceId) ?? [],
    );

    return [...resourceSlots, ...blockingSlots];
  }

  private findFirstConflict(slot: Slot, candidates: Slot[]): SlotDto[] {
    for (const otherSlot of candidates) {
      const overlaps =
        otherSlot.id !== slot.id &&
        otherSlot.start < slot.end &&
        otherSlot.end > slot.start;

      if (overlaps) {
        return [
          {
            ...otherSlot,
            conflicts: [],
          },
        ];
      }
    }

    return [];
  }

  private applyKnownConflicts(
    resources: ResourceSlotsDto[],
    conflictsBySlotId: Map<number, SlotDto[]>,
  ): void {
    for (const resource of resources) {
      for (const slot of resource.slots) {
        const knownConflicts = conflictsBySlotId.get(slot.id);
        if (knownConflicts) {
          slot.conflicts = knownConflicts;
        }
      }
    }
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
