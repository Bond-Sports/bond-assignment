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

type SlotRow = SlotDto & { conflictIds: string };

type SlotsData = {
  resources: Resource[];
  slots: SlotRow[];
  dependencies: BlockingDependency[];
};

type SlotsMaps = {
  slotsById: Map<number, SlotDto>;
  blockedIdsByBlockingId: Map<number, number[]>;
};

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  private async getSlotsData(): Promise<SlotsData> {
    const [resources, slots, dependencies] = await Promise.all([
      this.manager.find(Resource, { order: { id: 'ASC' } }),
      this.manager.query<SlotRow[]>(`
        SELECT s.id, s.name, s.start, s."end", s.resource_id AS resourceId,
          (
            SELECT json_group_array(o.id)
            FROM Slots o
            WHERE o.id != s.id
              AND (
                o.resource_id = s.resource_id
                OR o.resource_id IN (
                  SELECT blocking_resource_id
                  FROM BlockingDependencies
                  WHERE blocked_resource_id = s.resource_id
                )
              )
              AND datetime(o.start) < datetime(s."end")
              AND datetime(o."end") > datetime(s.start)
          ) AS conflictIds
        FROM Slots s
        ORDER BY s.id ASC
      `),
      this.manager.find(BlockingDependency),
    ]);

    return { resources, slots, dependencies };
  }

  private createSlotsMaps({ slots, dependencies }: SlotsData): SlotsMaps {
    const slotsById = new Map<number, SlotDto>();
    const blockedIdsByBlockingId = new Map<number, number[]>();

    for (const { id, name, start, end, resourceId } of slots) {
      slotsById.set(id, { id, name, start, end, resourceId });
    }

    for (const { blockingResourceId, blockedResourceId } of dependencies) {
      const blockedIds = blockedIdsByBlockingId.get(blockingResourceId) ?? [];
      blockedIds.push(blockedResourceId);
      blockedIdsByBlockingId.set(blockingResourceId, blockedIds);
    }

    return { slotsById, blockedIdsByBlockingId };
  }

  private buildResourceSlots(
    { resources, slots }: SlotsData,
    { slotsById, blockedIdsByBlockingId }: SlotsMaps,
  ): ResourceSlotsDto[] {
    const resourcesById = new Map<number, ResourceSlotsDto>();

    for (const resource of resources) {
      resourcesById.set(resource.id, { resourceId: resource.id, slots: [] });
    }

    for (const { conflictIds, ...slot } of slots) {
      const conflicts = (JSON.parse(conflictIds) as number[]).map(
        (id) => slotsById.get(id) as SlotDto,
      );
      const resourceIds = [
        slot.resourceId,
        ...(blockedIdsByBlockingId.get(slot.resourceId) ?? []),
      ];

      for (const resourceId of resourceIds) {
        resourcesById.get(resourceId)?.slots.push({ ...slot, conflicts });
      }
    }

    return [...resourcesById.values()];
  }

  async getSlots(): Promise<ResourceSlotsDto[]> {
    const data = await this.getSlotsData();
    const maps = this.createSlotsMaps(data);

    return this.buildResourceSlots(data, maps);
  }

  async addSlot(createSlot: CreateSlotDto): Promise<SlotDto> {

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
