import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Slot } from 'src/entities/slot.entity';
import { BlockingDependency } from 'src/entities/blocking-dependency.entity';
import { EntityManager, In } from 'typeorm';
import { Resource } from 'src/entities/resource.entity';
import {
  CreateSlotDto,
  ResourceSlotsDto,
  SlotDto,
  UpdateSlotTimesDto,
} from './types/dtos/slots.dto';

interface ISlotTimeRange {
  start: string;
  end: string;
}

interface ICollectOverlappingSlotsOptions {
  excludeSlotId?: number;
  startIndex?: number;
}

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  /**
   * Returns slots grouped by resource for the scheduling view.
   *
   * Each resource entry contains:
   * - Its own bookings
   * - Bookings from every resource that blocks it (e.g. Pool slots appear under Lane 1)
   *
   * Each slot is annotated with conflicts:
   * - Same resource: bidirectional (both overlapping lanes list each other)
   * - Blocking dependency: one-directional (only the blocked resource's slot lists the blocker)
   */
  async getSlots(): Promise<ResourceSlotsDto[]> {
    const [slots, dependencies, resources] = await Promise.all([
      this.manager.find(Slot, {
        order: { start: 'ASC', id: 'ASC' },
      }),
      this.manager.find(BlockingDependency),
      this.manager.find(Resource, {
        order: { id: 'ASC' },
      }),
    ]);

    const slotsByResourceId = this.groupSlotsByResourceId(slots);
    const blockingResourceIdsByBlockedResourceId =
      this.groupBlockingResourceIdsByBlockedResourceId(dependencies);
    const conflictsBySlotId = this.buildConflictsBySlotId(
      slotsByResourceId,
      dependencies,
    );

    return resources.map((resource) =>
      this.buildResourceSlotsEntry(
        resource.id,
        slotsByResourceId,
        blockingResourceIdsByBlockedResourceId,
        conflictsBySlotId,
      ),
    );
  }

  async addSlot(createSlot: CreateSlotDto): Promise<SlotDto> {
    const conflicts = await this.findConflictsForProposedSlot(createSlot);

    if (conflicts.length > 0) {
      throw new HttpException(conflicts, HttpStatus.CONFLICT);
    }

    const savedSlot = await this.manager.save(
      Slot.create({
        name: createSlot.name,
        start: createSlot.start,
        end: createSlot.end,
        resourceId: createSlot.resourceId,
      }),
    );

    return {
      ...savedSlot,
      conflicts: [],
    };
  }

  async updateSlot(
    slotId: number,
    updateSlot: UpdateSlotTimesDto,
  ): Promise<SlotDto> {
    const slot = await this.manager.findOne(Slot, {
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException();
    }

    const proposedSlot = {
      start: updateSlot.start,
      end: updateSlot.end,
      resourceId: slot.resourceId,
    };

    const conflicts = await this.findConflictsForProposedSlot(
      proposedSlot,
      slotId,
    );

    if (conflicts.length > 0) {
      throw new HttpException(conflicts, HttpStatus.CONFLICT);
    }

    slot.start = updateSlot.start;
    slot.end = updateSlot.end;
    const savedSlot = await this.manager.save(slot);

    return {
      ...savedSlot,
      conflicts: [],
    };
  }

  /**
   * Builds the full conflict map for all loaded slots.
   */
  private buildConflictsBySlotId(
    slotsByResourceId: Map<number, Slot[]>,
    dependencies: BlockingDependency[],
  ): Map<number, SlotDto[]> {
    const conflictsBySlotId = new Map<number, SlotDto[]>();
    this.recordSameResourceConflicts(slotsByResourceId, conflictsBySlotId);
    this.recordBlockingConflicts(
      dependencies,
      slotsByResourceId,
      conflictsBySlotId,
    );
    return conflictsBySlotId;
  }

  /**
   * Finds existing slots that conflict with a proposed booking.
   */
  private async findConflictsForProposedSlot(
    proposedSlot: Pick<Slot, 'start' | 'end' | 'resourceId'>,
    excludeSlotId?: number,
  ): Promise<SlotDto[]> {
    const dependencies = await this.manager.find(BlockingDependency, {
      where: { blockedResourceId: proposedSlot.resourceId },
    });
    const blockingResourceIds = dependencies.map(
      (dependency) => dependency.blockingResourceId,
    );

    const [sameResourceSlots, blockingResourceSlots] = await Promise.all([
      this.manager.find(Slot, {
        where: { resourceId: proposedSlot.resourceId },
        order: { start: 'ASC', id: 'ASC' },
      }),
      blockingResourceIds.length > 0
        ? this.manager.find(Slot, {
            where: { resourceId: In(blockingResourceIds) },
            order: { start: 'ASC', id: 'ASC' },
          })
        : Promise.resolve([]),
    ]);

    return this.findConflictsForSlot(
      proposedSlot,
      sameResourceSlots,
      blockingResourceSlots,
      excludeSlotId,
    );
  }

  /**
   * Returns conflict DTOs for one slot against pre-loaded, start-sorted slot lists.
   */
  private findConflictsForSlot(
    slot: ISlotTimeRange,
    sameResourceSlots: Slot[],
    blockingResourceSlots: Slot[],
    excludeSlotId?: number,
  ): SlotDto[] {
    const conflictingSlots = [
      ...this.collectOverlappingSlots(slot, sameResourceSlots, {
        excludeSlotId,
      }),
      ...this.collectOverlappingSlots(slot, blockingResourceSlots, {
        excludeSlotId,
      }),
    ];

    return conflictingSlots.map((conflictingSlot) =>
      this.toConflictDto(conflictingSlot),
    );
  }

  /**
   * Records bidirectional conflicts between overlapping slots on the same resource.
   */
  private recordSameResourceConflicts(
    slotsByResourceId: Map<number, Slot[]>,
    conflictsBySlotId: Map<number, SlotDto[]>,
  ): void {
    for (const resourceSlots of slotsByResourceId.values()) {
      for (const slot of resourceSlots) {
        const overlappingSlots = this.collectOverlappingSlots(slot, resourceSlots, {
          excludeSlotId: slot.id,
        });

        for (const overlappingSlot of overlappingSlots) {
          this.recordConflict(conflictsBySlotId, slot, overlappingSlot);
        }
      }
    }
  }

  /**
   * Records one-directional conflicts from blocking resources onto blocked resources.
   */
  private recordBlockingConflicts(
    dependencies: BlockingDependency[],
    slotsByResourceId: Map<number, Slot[]>,
    conflictsBySlotId: Map<number, SlotDto[]>,
  ): void {
    for (const dependency of dependencies) {
      const blockedResourceSlots =
        slotsByResourceId.get(dependency.blockedResourceId) ?? [];
      const blockingResourceSlots =
        slotsByResourceId.get(dependency.blockingResourceId) ?? [];

      let blockingIndex = 0;

      for (const blockedSlot of blockedResourceSlots) {
        while (
          blockingIndex < blockingResourceSlots.length &&
          blockingResourceSlots[blockingIndex].end <= blockedSlot.start
        ) {
          blockingIndex++;
        }

        const overlappingSlots = this.collectOverlappingSlots(
          blockedSlot,
          blockingResourceSlots,
          { startIndex: blockingIndex },
        );

        for (const blockingSlot of overlappingSlots) {
          this.recordConflict(conflictsBySlotId, blockedSlot, blockingSlot);
        }
      }
    }
  }

  /**
   * Returns slots that overlap a candidate. Expects slots sorted by start.
   *
   * Skips slots that end before the candidate starts, then stops once a slot starts
   * at or after the candidate ends. An optional start index supports the two-pointer
   * sweep across blocking dependencies.
   */
  private collectOverlappingSlots(
    candidate: ISlotTimeRange,
    sortedSlots: Slot[],
    options: ICollectOverlappingSlotsOptions = {},
  ): Slot[] {
    const { excludeSlotId, startIndex = 0 } = options;
    const overlappingSlots: Slot[] = [];

    for (
      let slotIndex = startIndex;
      slotIndex < sortedSlots.length;
      slotIndex++
    ) {
      const slot = sortedSlots[slotIndex];

      if (excludeSlotId !== undefined && slot.id === excludeSlotId) {
        continue;
      }

      if (slot.end <= candidate.start) {
        continue;
      }

      if (slot.start >= candidate.end) {
        break;
      }

      if (this.slotsOverlap(candidate, slot)) {
        overlappingSlots.push(slot);
      }
    }

    return overlappingSlots;
  }

  /**
   * Groups slots by resource. Input order is preserved (start ASC, id ASC).
   */
  private groupSlotsByResourceId(slots: Slot[]): Map<number, Slot[]> {
    const slotsByResourceId = new Map<number, Slot[]>();

    for (const slot of slots) {
      const resourceSlots = slotsByResourceId.get(slot.resourceId) ?? [];
      resourceSlots.push(slot);
      slotsByResourceId.set(slot.resourceId, resourceSlots);
    }

    return slotsByResourceId;
  }

  /**
   * Builds a lookup of which resources block a given resource.
   */
  private groupBlockingResourceIdsByBlockedResourceId(
    dependencies: BlockingDependency[],
  ): Map<number, number[]> {
    const blockingResourceIdsByBlockedResourceId = new Map<number, number[]>();

    for (const dependency of dependencies) {
      const blockingResourceIds =
        blockingResourceIdsByBlockedResourceId.get(
          dependency.blockedResourceId,
        ) ?? [];
      blockingResourceIds.push(dependency.blockingResourceId);
      blockingResourceIdsByBlockedResourceId.set(
        dependency.blockedResourceId,
        blockingResourceIds,
      );
    }

    return blockingResourceIdsByBlockedResourceId;
  }

  /**
   * Assembles one resource row: own slots + blocker slots, sorted by start time.
   */
  private buildResourceSlotsEntry(
    resourceId: number,
    slotsByResourceId: Map<number, Slot[]>,
    blockingResourceIdsByBlockedResourceId: Map<number, number[]>,
    conflictsBySlotId: Map<number, SlotDto[]>,
  ): ResourceSlotsDto {
    const ownSlots = slotsByResourceId.get(resourceId) ?? [];
    const blockingResourceIds =
      blockingResourceIdsByBlockedResourceId.get(resourceId) ?? [];
    const blockerSlots = blockingResourceIds.flatMap(
      (blockingResourceId) => slotsByResourceId.get(blockingResourceId) ?? [],
    );
    const entrySlots = [...ownSlots, ...blockerSlots].sort(
      this.compareSlotsByStart,
    );

    return {
      resourceId,
      slots: entrySlots.map((slot) => ({
        ...slot,
        conflicts: conflictsBySlotId.get(slot.id) ?? [],
      })),
    };
  }

  /**
   * Returns whether two slots overlap in time. Adjacent slots do not overlap.
   */
  private slotsOverlap(
    first: ISlotTimeRange,
    second: ISlotTimeRange,
  ): boolean {
    return first.start < second.end && second.start < first.end;
  }

  /**
   * Sorts slots by start time, then id for stable ordering.
   */
  private compareSlotsByStart(first: Slot, second: Slot): number {
    return first.start.localeCompare(second.start) || first.id - second.id;
  }

  /**
   * Appends a conflicting slot to the given slot's conflict list.
   */
  private recordConflict(
    conflictsBySlotId: Map<number, SlotDto[]>,
    slot: Slot,
    conflictingSlot: Slot,
  ): void {
    const conflicts = conflictsBySlotId.get(slot.id) ?? [];
    conflicts.push(this.toConflictDto(conflictingSlot));
    conflictsBySlotId.set(slot.id, conflicts);
  }

  /**
   * Maps a slot entity to a flat conflict DTO (no nested conflicts array).
   */
  private toConflictDto(slot: Slot): SlotDto {
    return {
      id: slot.id,
      name: slot.name,
      start: slot.start,
      end: slot.end,
      resourceId: slot.resourceId,
    };
  }
}
