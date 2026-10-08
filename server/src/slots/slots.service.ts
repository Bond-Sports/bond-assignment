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
    const rows: { resourceId: number; slots: string }[] =
      await this.manager.query(`
        SELECT
          resource_id AS resourceId,
          json_group_array(
            json_object(
              'id', id,
              'name', name,
              'start', start,
              'end', end,
              'resourceId', resource_id,
              'conflicts', json('[]')
            ) ORDER BY start, id
          ) AS slots
        FROM Slots
        GROUP BY resource_id
        ORDER BY MIN(id)
      `);

    return rows.map((row) => ({
      resourceId: row.resourceId,
      slots: annotateConflicts(JSON.parse(row.slots) as SlotDto[]),
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
function annotateConflicts(slots: SlotDto[]): SlotDto[] {
  let active: SlotDto[] = [];
  for (const slot of slots) {
    active = active.filter((other) => other.end > slot.start);
    for (const other of active) {
      slot.conflicts!.push({ ...other, conflicts: [] });
      other.conflicts!.push({ ...slot, conflicts: [] });
    }
    active.push(slot);
  }

  return slots;
}
