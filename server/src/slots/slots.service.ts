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
    const [resources, dependencies] = await Promise.all([
      this.manager
        .createQueryBuilder(Resource, 'r')
        .leftJoinAndMapMany('r.slots', Slot, 's', 's.resourceId = r.id')
        .addOrderBy('s.start')
        .getMany(),
      this.manager.find(BlockingDependency),
    ]);

    const slotsByResource = new Map(resources.map((r) => [r.id, r.slots]));
    const blockingIdsByResource = new Map<number, number[]>();
    for (const { blockedResourceId, blockingResourceId } of dependencies) {
      const ids = blockingIdsByResource.get(blockedResourceId) ?? [];
      ids.push(blockingResourceId);
      blockingIdsByResource.set(blockedResourceId, ids);
    }

    return resources.map(({ id, slots }) => {
      const blockingSlots = (blockingIdsByResource.get(id) ?? []).flatMap(
        (blockingId) => slotsByResource.get(blockingId) ?? [],
      );
      return {
        resourceId: id,
        slots: annotateConflicts(slots, blockingSlots),
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

// Expects slots sorted by start time.
function annotateConflicts(slots: Slot[], blockingSlots: Slot[]): SlotDto[] {
  const annotated: SlotDto[] = slots.map((slot) => ({
    ...slot,
    conflicts: [],
  }));

  let active: SlotDto[] = [];
  let blockers = blockingSlots;
  for (const slot of annotated) {
    active = active.filter((other) => other.end > slot.start);
    blockers = blockers.filter((other) => other.end > slot.start);
    for (const other of active) {
      slot.conflicts!.push({ ...other, conflicts: [] });
      other.conflicts!.push({ ...slot, conflicts: [] });
    }
    active.push(slot);

    for (const blocking of blockers) {
      if (blocking.start < slot.end) {
        slot.conflicts!.push({ ...blocking, conflicts: [] });
      }
    }
  }

  return annotated;
}
