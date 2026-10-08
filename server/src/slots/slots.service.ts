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
    const [rows, blockers] = await Promise.all([
      this.manager.query<{ resourceId: number; slots: string }[]>(`
        SELECT
          r.id AS resourceId,
          COALESCE(
            json_group_array(
              json_object(
                'id', s.id,
                'name', s.name,
                'start', s.start,
                'end', s.end,
                'resourceId', s.resource_id,
                'conflicts', json('[]')
              ) ORDER BY s.start, s.id
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) AS slots
        FROM Resources r
        LEFT JOIN Slots s ON s.resource_id = r.id
        GROUP BY r.id
        ORDER BY r.id
      `),
      this.manager.query<{ resourceId: number; blockingIds: string }[]>(`
        SELECT
          blocked_resource_id AS resourceId,
          json_group_array(blocking_resource_id) AS blockingIds
        FROM BlockingDependencies
        GROUP BY blocked_resource_id
      `),
    ]);

    const slotsByResource = new Map(
      rows.map((row) => [row.resourceId, JSON.parse(row.slots) as SlotDto[]]),
    );
    const blockingIdsByResource = new Map(
      blockers.map((b) => [
        b.resourceId,
        JSON.parse(b.blockingIds) as number[],
      ]),
    );

    return [...slotsByResource].map(([resourceId, slots]) => ({
      resourceId,
      slots: annotateConflicts(
        slots,
        (blockingIdsByResource.get(resourceId) ?? []).flatMap(
          (id) => slotsByResource.get(id) ?? [],
        ),
      ),
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
function annotateConflicts(
  slots: SlotDto[],
  blockingSlots: SlotDto[],
): SlotDto[] {
  let active: SlotDto[] = [];
  for (const slot of slots) {
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

  return slots;
}
