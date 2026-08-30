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
    const [slots, blockingDependencies] = await Promise.all([
      this.manager.find(Slot, {
        order: { id: 'ASC' },
      }),
      this.manager.find(BlockingDependency),
    ]);

    const slotsByResource = new Map<number, Slot[]>();
    for (const slot of slots) {
      const group = slotsByResource.get(slot.resourceId) ?? [];
      group.push(slot);
      slotsByResource.set(slot.resourceId, group);
    }

    const blockingIdsByResource = new Map<number, Set<number>>();
    const blockedIdsByBlockingResource = new Map<number, Set<number>>();
    for (const dependency of blockingDependencies) {
      let blockingIds = blockingIdsByResource.get(dependency.blockedResourceId);
      if (!blockingIds) {
        blockingIds = new Set();
        blockingIdsByResource.set(dependency.blockedResourceId, blockingIds);
      }
      blockingIds.add(dependency.blockingResourceId);

      let blockedIds = blockedIdsByBlockingResource.get(
        dependency.blockingResourceId,
      );
      if (!blockedIds) {
        blockedIds = new Set();
        blockedIdsByBlockingResource.set(
          dependency.blockingResourceId,
          blockedIds,
        );
      }
      blockedIds.add(dependency.blockedResourceId);
    }

    const resourceIds = new Set<number>(slotsByResource.keys());
    for (const blockedResourceId of blockingIdsByResource.keys()) {
      resourceIds.add(blockedResourceId);
    }

    return [...resourceIds]
      .sort((a, b) => a - b)
      .map((resourceId) => {
      const blockingIds = blockingIdsByResource.get(resourceId) ?? new Set();
      const relevantSlots = [
        ...(slotsByResource.get(resourceId) ?? []),
        ...[...blockingIds].flatMap(
          (blockingId) => slotsByResource.get(blockingId) ?? [],
        ),
      ];

      return {
        resourceId,
        slots: relevantSlots.map((slot) => {
          const conflicts = this.buildConflicts(
            slot,
            resourceId,
            slotsByResource,
            blockingIdsByResource,
          );

          if (slot.resourceId === resourceId) {
            const blockedIds =
              blockedIdsByBlockingResource.get(slot.resourceId) ?? new Set();
            const conflictIds = new Set(conflicts.map((conflict) => conflict.id));
            for (const blockedId of blockedIds) {
              for (const other of slotsByResource.get(blockedId) ?? []) {
                if (
                  other.id === slot.id ||
                  conflictIds.has(other.id) ||
                  other.start >= slot.end ||
                  other.end <= slot.start
                ) {
                  continue;
                }
                conflicts.push({
                  id: other.id,
                  name: other.name,
                  start: other.start,
                  end: other.end,
                  resourceId: other.resourceId,
                });
                conflictIds.add(other.id);
              }
            }
          }

          return { ...slot, conflicts };
        }),
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

  /**
   * Conflicts are overlapping slots on the same resource, on resources that
   * block this slot, and — when this slot is a blocker of the current group —
   * the original overlapping slots of that blocked resource.
   */
  private buildConflicts(
    slot: Slot,
    groupResourceId: number,
    slotsByResource: Map<number, Slot[]>,
    blockingIdsByResource: Map<number, Set<number>>,
  ): SlotDto[] {
    const slotBlockingIds =
      blockingIdsByResource.get(slot.resourceId) ?? new Set();
    const groupBlockingIds =
      blockingIdsByResource.get(groupResourceId) ?? new Set();
    const candidatesById = new Map<number, Slot>();

    const addCandidates = (candidates: Slot[]): void => {
      for (const candidate of candidates) {
        candidatesById.set(candidate.id, candidate);
      }
    };

    addCandidates(slotsByResource.get(slot.resourceId) ?? []);
    for (const blockingId of slotBlockingIds) {
      addCandidates(slotsByResource.get(blockingId) ?? []);
    }
    if (groupBlockingIds.has(slot.resourceId)) {
      addCandidates(slotsByResource.get(groupResourceId) ?? []);
    }

    return [...candidatesById.values()]
      .filter(
        (other) =>
          other.id !== slot.id &&
          other.start < slot.end &&
          other.end > slot.start,
      )
      .map((other) => ({
        id: other.id,
        name: other.name,
        start: other.start,
        end: other.end,
        resourceId: other.resourceId,
      }));
  }
}
