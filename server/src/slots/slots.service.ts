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
    const query = this.manager.createQueryBuilder(Resource, 'r');
    const blockingResourceIds = query
      .subQuery()
      .select('bd.blockingResourceId')
      .from(BlockingDependency, 'bd')
      .where('bd.blockedResourceId = r.id')
      .getQuery();

    const resources = (await query
      .leftJoinAndMapMany('r.slots', Slot, 's', 's.resourceId = r.id')
      .leftJoinAndMapMany(
        'r.blockingSlots',
        Slot,
        'bs',
        `bs.resourceId IN ${blockingResourceIds}`,
      )
      .addOrderBy('s.start')
      .getMany()) as (Resource & { blockingSlots: Slot[] })[];

    return resources.map(({ id, slots, blockingSlots }) => ({
      resourceId: id,
      slots: annotateConflicts(slots, blockingSlots),
    }));
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
  for (const slot of annotated) {
    active = active.filter((other) => other.end > slot.start);
    for (const other of active) {
      slot.conflicts!.push({ ...other, conflicts: [] });
      other.conflicts!.push({ ...slot, conflicts: [] });
    }
    active.push(slot);

    for (const blocking of blockingSlots) {
      if (blocking.start < slot.end && blocking.end > slot.start) {
        slot.conflicts!.push({ ...blocking, conflicts: [] });
      }
    }
  }

  return annotated;
}
