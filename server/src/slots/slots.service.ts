import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Slot } from 'src/entities/slot.entity';
import { BlockingDependency } from 'src/entities/blocking-dependency.entity';
import { EntityManager, LessThan, MoreThan } from 'typeorm';
import { Resource } from 'src/entities/resource.entity';
import {
  CreateSlotDto,
  ResourceSlotsDto,
  SlotDto,
  UpdateSlotTimesDto,
} from './types/dtos/slots.dto';

const ISO_DATE_PAD_LENGTH = 2;
const MIDNIGHT_TIME = '00:00:00';

/**
 * Formats a Date as YYYY-MM-DD using local calendar components.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(ISO_DATE_PAD_LENGTH, '0');
  const day = String(date.getDate()).padStart(ISO_DATE_PAD_LENGTH, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns exclusive day bounds for today as YYYY-MM-DDThh:mm:ss strings.
 * A slot overlaps today when start < tomorrowStart and end > todayStart.
 */
function getTodayDayBounds(): { todayStart: string; tomorrowStart: string } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  return {
    todayStart: `${formatDate(now)}T${MIDNIGHT_TIME}`,
    tomorrowStart: `${formatDate(tomorrow)}T${MIDNIGHT_TIME}`,
  };
}

/**
 * Returns true when two time ranges overlap (adjacent/touching ranges do not).
 */
function slotsOverlap(
  a: Pick<Slot, 'start' | 'end'>,
  b: Pick<Slot, 'start' | 'end'>,
): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Maps a slot entity to a conflict DTO without nested conflicts.
 */
function toConflictDto(slot: Slot): SlotDto {
  return {
    id: slot.id,
    name: slot.name,
    start: slot.start,
    end: slot.end,
    resourceId: slot.resourceId,
  };
}

/**
 * Groups slots by resourceId in a single pass.
 */
function groupSlotsByResourceId(slots: Slot[]): Map<number, Slot[]> {
  const slotsByResourceId = new Map<number, Slot[]>();

  for (const slot of slots) {
    const siblings = slotsByResourceId.get(slot.resourceId);
    if (siblings) {
      siblings.push(slot);
    } else {
      slotsByResourceId.set(slot.resourceId, [slot]);
    }
  }

  return slotsByResourceId;
}

/**
 * Builds a map of blockedResourceId → set of blockingResourceIds.
 */
function buildBlockersByBlockedId(
  dependencies: BlockingDependency[],
): Map<number, Set<number>> {
  const blockersByBlockedId = new Map<number, Set<number>>();

  for (const dependency of dependencies) {
    let blockers = blockersByBlockedId.get(dependency.blockedResourceId);
    if (!blockers) {
      blockers = new Set();
      blockersByBlockedId.set(dependency.blockedResourceId, blockers);
    }
    blockers.add(dependency.blockingResourceId);
  }

  return blockersByBlockedId;
}

/**
 * Collects own slots plus slots from resources that block this resource
 * (e.g. Pool slots appear under each lane Pool blocks).
 */
function getSlotsForResourceAndBlockers(
  resourceId: number,
  slotsByResourceId: Map<number, Slot[]>,
  blockersByBlockedId: Map<number, Set<number>>,
): Slot[] {
  const ownSlots = slotsByResourceId.get(resourceId) ?? [];
  const blockerIds = blockersByBlockedId.get(resourceId);
  if (!blockerIds || blockerIds.size === 0) {
    return [...ownSlots];
  }

  const relevantSlots = [...ownSlots];
  for (const blockerId of blockerIds) {
    const blockerSlots = slotsByResourceId.get(blockerId);
    if (blockerSlots) {
      relevantSlots.push(...blockerSlots);
    }
  }

  return relevantSlots;
}

/**
 * Finds overlapping slots among candidates (same resource + blockers).
 */
function findConflicts(slot: Slot, candidates: Slot[]): SlotDto[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.id !== slot.id && slotsOverlap(slot, candidate),
    )
    .map(toConflictDto);
}

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  async getSlots(): Promise<ResourceSlotsDto[]> {
    // TODO: Implement this method.
    // Return today's slots grouped by resource, including slots from
    // blocking resources. Each slot should have its conflicts computed.
    const { todayStart, tomorrowStart } = getTodayDayBounds();

    const [resources, dependencies, slots] = await Promise.all([
      this.manager.find(Resource, { order: { id: 'ASC' } }),
      this.manager.find(BlockingDependency),
      this.manager.find(Slot, {
        where: {
          start: LessThan(tomorrowStart),
          end: MoreThan(todayStart),
        },
        order: { id: 'ASC' },
      }),
    ]);

    const slotsByResourceId = groupSlotsByResourceId(slots);
    const blockersByBlockedId = buildBlockersByBlockedId(dependencies);

    const candidatesByResourceId = new Map<number, Slot[]>();
    for (const resource of resources) {
      candidatesByResourceId.set(
        resource.id,
        getSlotsForResourceAndBlockers(
          resource.id,
          slotsByResourceId,
          blockersByBlockedId,
        ),
      );
    }

    return resources.map((resource) => {
      const relevantSlots = candidatesByResourceId.get(resource.id) ?? [];

      return {
        resourceId: resource.id,
        slots: relevantSlots.map((slot) => ({
          ...slot,
          conflicts: findConflicts(
            slot,
            candidatesByResourceId.get(slot.resourceId) ?? [],
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
}
