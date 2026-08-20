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

interface ITimeRange {
  start: string;
  end: string;
}

interface IConflictCandidate extends ITimeRange {
  id?: number;
  resourceId: number;
}

interface IConflictIndexes {
  slots: Slot[];
  slotsByResource: Map<number, Slot[]>;
  blockersByResource: Map<number, number[]>;
}

const SLOT_NOT_FOUND_MESSAGE = 'Slot not found';

/**
 * True when two half-open ranges overlap. Adjacent (touching) ranges do not overlap.
 */
function slotsOverlap(a: ITimeRange, b: ITimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Maps a slot to a conflict entry without nested conflicts.
 */
function toConflictDto(slot: Slot | SlotDto): SlotDto {
  return {
    id: slot.id,
    name: slot.name,
    start: slot.start,
    end: slot.end,
    resourceId: slot.resourceId,
  };
}

/**
 * Returns the resource itself plus any resources that block it.
 */
function relevantResourceIds(
  resourceId: number,
  blockersByResource: Map<number, number[]>,
): number[] {
  return [resourceId, ...(blockersByResource.get(resourceId) ?? [])];
}

/**
 * Collects slots belonging to the given resource IDs.
 */
function collectSlots(
  resourceIds: number[],
  slotsByResource: Map<number, Slot[]>,
): Slot[] {
  const collected: Slot[] = [];
  for (const resourceId of resourceIds) {
    collected.push(...(slotsByResource.get(resourceId) ?? []));
  }
  return collected;
}

/**
 * Indexes slots by resourceId.
 */
function indexSlotsByResource(slots: Slot[]): Map<number, Slot[]> {
  const slotsByResource = new Map<number, Slot[]>();
  for (const slot of slots) {
    const group = slotsByResource.get(slot.resourceId) ?? [];
    group.push(slot);
    slotsByResource.set(slot.resourceId, group);
  }
  return slotsByResource;
}

/**
 * Indexes blocking resource IDs by the resource they block.
 */
function indexBlockersByResource(
  dependencies: BlockingDependency[],
): Map<number, number[]> {
  const blockersByResource = new Map<number, number[]>();
  for (const dependency of dependencies) {
    const blockers = blockersByResource.get(dependency.blockedResourceId) ?? [];
    blockers.push(dependency.blockingResourceId);
    blockersByResource.set(dependency.blockedResourceId, blockers);
  }
  return blockersByResource;
}

/**
 * Finds overlapping slots on the candidate's resource and its blocking resources.
 */
function findConflicts(
  candidate: IConflictCandidate,
  slotsByResource: Map<number, Slot[]>,
  blockersByResource: Map<number, number[]>,
): SlotDto[] {
  const candidates = collectSlots(
    relevantResourceIds(candidate.resourceId, blockersByResource),
    slotsByResource,
  );

  return candidates
    .filter((other) => other.id !== candidate.id && slotsOverlap(candidate, other))
    .map(toConflictDto);
}

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  /**
   * Returns today's slots grouped by resource, including slots from blocking
   * resources, with overlaps listed in `conflicts`.
   */
  async getSlots(): Promise<ResourceSlotsDto[]> {
    const [resources, { slots, slotsByResource, blockersByResource }] =
      await Promise.all([
        this.manager.find(Resource, { order: { id: 'ASC' } }),
        this.loadConflictIndexes(),
      ]);

    const conflictsBySlotId = new Map<number, SlotDto[]>();
    for (const slot of slots) {
      conflictsBySlotId.set(
        slot.id,
        findConflicts(slot, slotsByResource, blockersByResource),
      );
    }

    return resources.map((resource) => {
      const groupedSlots = collectSlots(
        relevantResourceIds(resource.id, blockersByResource),
        slotsByResource,
      );

      return {
        resourceId: resource.id,
        slots: groupedSlots.map((slot) => ({
          ...slot,
          conflicts: conflictsBySlotId.get(slot.id) ?? [],
        })),
      };
    });
  }

  /**
   * Creates a slot only when it has no conflicts.
   */
  async addSlot(createSlot: CreateSlotDto): Promise<SlotDto> {
    const { slotsByResource, blockersByResource } =
      await this.loadConflictIndexes();

    const conflicts = findConflicts(
      {
        start: createSlot.start,
        end: createSlot.end,
        resourceId: createSlot.resourceId,
      },
      slotsByResource,
      blockersByResource,
    );

    this.throwIfConflicts(conflicts);

    const saved = await this.manager.save(
      Slot.create({
        name: createSlot.name,
        start: createSlot.start,
        end: createSlot.end,
        resourceId: createSlot.resourceId,
      }),
    );

    return {
      ...saved,
      conflicts: [],
    };
  }

  /**
   * Updates a slot's time range only when the new range has no conflicts.
   */
  async updateSlot(
    slotId: number,
    updateSlot: UpdateSlotTimesDto,
  ): Promise<SlotDto> {
    const [slot, { slotsByResource, blockersByResource }] = await Promise.all([
      this.manager.findOne(Slot, { where: { id: slotId } }),
      this.loadConflictIndexes(),
    ]);

    if (!slot) {
      throw new HttpException(SLOT_NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND);
    }

    const conflicts = findConflicts(
      {
        id: slot.id,
        start: updateSlot.start,
        end: updateSlot.end,
        resourceId: slot.resourceId,
      },
      slotsByResource,
      blockersByResource,
    );

    this.throwIfConflicts(conflicts);

    slot.start = updateSlot.start;
    slot.end = updateSlot.end;
    await this.manager.save(slot);

    return {
      ...slot,
      conflicts: [],
    };
  }

  /**
   * Rejects the request with 409 when any conflicting slots were found.
   */
  private throwIfConflicts(conflicts: SlotDto[]): void {
    if (conflicts.length > 0) {
      throw new HttpException(conflicts, HttpStatus.CONFLICT);
    }
  }

  /**
   * Loads slots and blocking dependencies, indexed for conflict checks.
   */
  private async loadConflictIndexes(): Promise<IConflictIndexes> {
    const [slots, dependencies] = await Promise.all([
      this.manager.find(Slot, { order: { id: 'ASC' } }),
      this.manager.find(BlockingDependency),
    ]);

    return {
      slots,
      slotsByResource: indexSlotsByResource(slots),
      blockersByResource: indexBlockersByResource(dependencies),
    };
  }
}
