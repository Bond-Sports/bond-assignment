import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Slot } from 'src/entities/slot.entity';
import { BlockingDependency } from 'src/entities/blocking-dependency.entity';
import { EntityManager, Like } from 'typeorm';
import { Resource } from 'src/entities/resource.entity';
import {
  CreateSlotDto,
  ResourceSlotsDto,
  SlotDto,
  UpdateSlotTimesDto,
} from './types/dtos/slots.dto';

const DATE_COMPONENT_PAD_LENGTH = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  /**
   * Returns today's slots grouped by resource, including slots from blocking
   * resources, with each slot annotated by its conflicts.
   */
  async getSlots(): Promise<ResourceSlotsDto[]> {
    const todayDate = formatDate(new Date());
    const yesterdayDate = formatDate(new Date(Date.now() - MS_PER_DAY));

    const [resources, todaysSlots, dependencies] = await Promise.all([
      this.manager.find(Resource, { order: { id: 'ASC' } }),
      this.manager.find(Slot, {
        where: [
          { start: Like(`${todayDate}%`) },
          {
            start: Like(`${yesterdayDate}%`),
            end: Like(`${todayDate}%`),
          },
        ],
        order: { id: 'ASC' },
      }),
      this.manager.find(BlockingDependency),
    ]);

    const blockersByResource = buildBlockersByResource(dependencies);

    const slotDtosById = new Map<number, SlotDto>();
    for (const slot of todaysSlots) {
      slotDtosById.set(
        slot.id,
        toSlotDto(slot, findConflicts(slot, todaysSlots, blockersByResource)),
      );
    }

    return resources.map((resource) => {
      const blockingResourceIds = new Set(
        blockersByResource.get(resource.id) ?? [],
      );
      const relevantSlots = todaysSlots.filter(
        (slot) =>
          slot.resourceId === resource.id ||
          blockingResourceIds.has(slot.resourceId),
      );

      return {
        resourceId: resource.id,
        slots: relevantSlots.map((slot) => slotDtosById.get(slot.id)!),
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

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    DATE_COMPONENT_PAD_LENGTH,
    '0',
  );
  const day = String(date.getDate()).padStart(DATE_COMPONENT_PAD_LENGTH, '0');
  return `${year}-${month}-${day}`;
}

function buildBlockersByResource(
  dependencies: BlockingDependency[],
): Map<number, number[]> {
  const blockersByResource = new Map<number, number[]>();

  for (const dependency of dependencies) {
    const blockers =
      blockersByResource.get(dependency.blockedResourceId) ?? [];
    blockers.push(dependency.blockingResourceId);
    blockersByResource.set(dependency.blockedResourceId, blockers);
  }

  return blockersByResource;
}

function slotsOverlap(
  a: Pick<Slot, 'start' | 'end'>,
  b: Pick<Slot, 'start' | 'end'>,
): boolean {
  return a.start < b.end && a.end > b.start;
}

function findConflicts(
  slot: Slot,
  candidates: Slot[],
  blockersByResource: Map<number, number[]>,
): SlotDto[] {
  const blockingResourceIds = new Set(
    blockersByResource.get(slot.resourceId) ?? [],
  );

  return candidates
    .filter(
      (other) =>
        other.id !== slot.id &&
        (other.resourceId === slot.resourceId ||
          blockingResourceIds.has(other.resourceId)) &&
        slotsOverlap(slot, other),
    )
    .map((other) => toSlotDto(other));
}

function toSlotDto(slot: Slot, conflicts: SlotDto[] = []): SlotDto {
  return {
    id: slot.id,
    name: slot.name,
    start: slot.start,
    end: slot.end,
    resourceId: slot.resourceId,
    conflicts,
  };
}
