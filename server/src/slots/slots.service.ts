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

  /**
   * Returns today's slots grouped by resource, including slots from blocking
   * resources. Conflicts are precomputed once via sort + sweep (same resource)
   * and two-pointer merge (blocking), then attached to each view.
   */
  async getSlots(): Promise<ResourceSlotsDto[]> {
    const [resources, dependencies, slots] = await Promise.all([
      this.manager.find(Resource, { order: { id: 'ASC' } }),
      this.manager.find(BlockingDependency),
      this.manager.find(Slot),
    ]);

    const slotsByResourceId = new Map<number, Slot[]>();
    for (const resource of resources) {
      slotsByResourceId.set(resource.id, []);
    }
    for (const slot of slots) {
      const resourceSlots = slotsByResourceId.get(slot.resourceId);
      if (resourceSlots) {
        resourceSlots.push(slot);
      }
    }

    const blockerIdsByResourceId = new Map<number, number[]>();
    for (const resource of resources) {
      blockerIdsByResourceId.set(resource.id, []);
    }
    for (const dependency of dependencies) {
      blockerIdsByResourceId
        .get(dependency.blockedResourceId)
        ?.push(dependency.blockingResourceId);
    }

    const conflictsBySlotId = new Map<number, Slot[]>();
    for (const slot of slots) {
      conflictsBySlotId.set(slot.id, []);
    }

    for (const resourceSlots of slotsByResourceId.values()) {
      this.recordSameResourceConflicts(resourceSlots, conflictsBySlotId);
    }

    for (const dependency of dependencies) {
      this.recordBlockingConflicts(
        slotsByResourceId.get(dependency.blockingResourceId) ?? [],
        slotsByResourceId.get(dependency.blockedResourceId) ?? [],
        conflictsBySlotId,
      );
    }

    return resources.map((resource) => {
      const blockerIds = blockerIdsByResourceId.get(resource.id) ?? [];
      const relevantSlots = [
        ...(slotsByResourceId.get(resource.id) ?? []),
        ...blockerIds.flatMap(
          (blockerId) => slotsByResourceId.get(blockerId) ?? [],
        ),
      ].sort(
        (a, b) => a.start.localeCompare(b.start) || a.id - b.id,
      );

      return {
        resourceId: resource.id,
        slots: relevantSlots.map((slot) =>
          this.toSlotDto(slot, conflictsBySlotId.get(slot.id) ?? []),
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

  /**
   * Records mutual conflicts for overlapping slots on the same resource.
   * Sort by start, then sweep an active window ordered by end — O(n log n + k).
   */
  private recordSameResourceConflicts(
    slots: Slot[],
    conflictsBySlotId: Map<number, Slot[]>,
  ): void {
    if (slots.length < 2) {
      return;
    }

    const sorted = [...slots].sort(
      (a, b) => a.start.localeCompare(b.start) || a.id - b.id,
    );
    const activeByEnd: Slot[] = [];
    let activeStart = 0;

    for (const slot of sorted) {
      while (
        activeStart < activeByEnd.length &&
        activeByEnd[activeStart].end <= slot.start
      ) {
        activeStart += 1;
      }

      for (let index = activeStart; index < activeByEnd.length; index += 1) {
        const other = activeByEnd[index];
        conflictsBySlotId.get(slot.id)?.push(other);
        conflictsBySlotId.get(other.id)?.push(slot);
      }

      const insertAt = this.findEndInsertIndex(
        activeByEnd,
        activeStart,
        slot.end,
      );
      activeByEnd.splice(insertAt, 0, slot);
    }
  }

  /**
   * Records one-directional conflicts: blocked slots list overlapping blocker slots.
   * Both lists are sorted by start, then merged with two pointers — O(n + m + k).
   */
  private recordBlockingConflicts(
    blockerSlots: Slot[],
    blockedSlots: Slot[],
    conflictsBySlotId: Map<number, Slot[]>,
  ): void {
    if (blockerSlots.length === 0 || blockedSlots.length === 0) {
      return;
    }

    const blockers = [...blockerSlots].sort(
      (a, b) => a.start.localeCompare(b.start) || a.id - b.id,
    );
    const blocked = [...blockedSlots].sort(
      (a, b) => a.start.localeCompare(b.start) || a.id - b.id,
    );

    let blockerIndex = 0;
    for (const blockedSlot of blocked) {
      while (
        blockerIndex < blockers.length &&
        blockers[blockerIndex].end <= blockedSlot.start
      ) {
        blockerIndex += 1;
      }

      for (
        let index = blockerIndex;
        index < blockers.length &&
        blockers[index].start < blockedSlot.end;
        index += 1
      ) {
        conflictsBySlotId.get(blockedSlot.id)?.push(blockers[index]);
      }
    }
  }

  private findEndInsertIndex(
    activeByEnd: Slot[],
    activeStart: number,
    end: string,
  ): number {
    let low = activeStart;
    let high = activeByEnd.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (activeByEnd[mid].end <= end) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return low;
  }

  private toSlotDto(slot: Slot, conflicts: Slot[]): SlotDto {
    return {
      id: slot.id,
      name: slot.name,
      start: slot.start,
      end: slot.end,
      resourceId: slot.resourceId,
      conflicts: conflicts.map((conflict) => ({
        id: conflict.id,
        name: conflict.name,
        start: conflict.start,
        end: conflict.end,
        resourceId: conflict.resourceId,
        conflicts: [],
      })),
    };
  }
}
