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

interface ITimeRange {
  start: string;
  end: string;
}

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  async getSlots(): Promise<ResourceSlotsDto[]> {
    const [resources, dependencies, slots] = await Promise.all([
      this.manager.find(Resource, { order: { id: 'ASC' } }),
      this.manager.find(BlockingDependency),
      this.manager.find(Slot, { order: { id: 'ASC' } }),
    ]);

    const blockersByBlocked = this.buildBlockersByBlocked(dependencies);

    return resources.map((resource) => {
      const blockers = blockersByBlocked.get(resource.id) ?? new Set<number>();
      const visibleSlots = slots.filter(
        (slot) =>
          slot.resourceId === resource.id || blockers.has(slot.resourceId),
      );

      return {
        resourceId: resource.id,
        slots: visibleSlots.map((slot) =>
          this.toSlotDto(
            slot,
            this.findConflicts(slot, slots, blockersByBlocked),
          ),
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
   * Returns true when two time ranges overlap (touching endpoints do not).
   */
  private overlaps(a: ITimeRange, b: ITimeRange): boolean {
    return a.start < b.end && a.end > b.start;
  }

  /**
   * Builds a map from blocked resource id to the set of resource ids that block it.
   */
  private buildBlockersByBlocked(
    deps: BlockingDependency[],
  ): Map<number, Set<number>> {
    const blockersByBlocked = new Map<number, Set<number>>();

    for (const dep of deps) {
      let blockers = blockersByBlocked.get(dep.blockedResourceId);
      if (!blockers) {
        blockers = new Set<number>();
        blockersByBlocked.set(dep.blockedResourceId, blockers);
      }
      blockers.add(dep.blockingResourceId);
    }

    return blockersByBlocked;
  }

  /**
   * Maps a slot entity to a SlotDto.
   */
  private toSlotDto(slot: Slot, conflicts: SlotDto[] = []): SlotDto {
    return {
      id: slot.id,
      name: slot.name,
      start: slot.start,
      end: slot.end,
      resourceId: slot.resourceId,
      conflicts,
    };
  }

  /**
   * Finds overlapping slots on the same resource or on resources that block the candidate's resource.
   */
  private findConflicts(
    candidate: Slot,
    allSlots: Slot[],
    blockersByBlocked: Map<number, Set<number>>,
  ): SlotDto[] {
    const blockers =
      blockersByBlocked.get(candidate.resourceId) ?? new Set<number>();

    return allSlots
      .filter((other) => {
        if (other.id === candidate.id) {
          return false;
        }

        const isSameResource = other.resourceId === candidate.resourceId;
        const isBlocker = blockers.has(other.resourceId);
        if (!isSameResource && !isBlocker) {
          return false;
        }

        return this.overlaps(candidate, other);
      })
      .map((other) => this.toSlotDto(other, []));
  }
}
