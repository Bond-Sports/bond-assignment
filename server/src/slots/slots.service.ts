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

type SlotWithConflicts = SlotDto & { conflicts: SlotDto[] };

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  async getSlots(): Promise<ResourceSlotsDto[]> {
    const [slots, dependencies] = await Promise.all([
      this.manager.find(Slot, {
        order: { resourceId: 'ASC', start: 'ASC' },
      }),
      this.manager.find(BlockingDependency),
    ]);

    const slotsByResourceId = new Map<number, Slot[]>();

    for (const slot of slots) {
      const resourceSlots = slotsByResourceId.get(slot.resourceId);

      if (resourceSlots) {
        resourceSlots.push(slot);
      } else {
        slotsByResourceId.set(slot.resourceId, [slot]);
      }
    }

    const blockingIdsByBlockedId = new Map<number, number[]>();

    for (const dependency of dependencies) {
      const blockingIds =
        blockingIdsByBlockedId.get(dependency.blockedResourceId) ?? [];
      blockingIds.push(dependency.blockingResourceId);
      blockingIdsByBlockedId.set(dependency.blockedResourceId, blockingIds);
    }

    // #region agent log
    fetch('http://127.0.0.1:7447/ingest/88b17856-ff37-40f8-908e-8567eb41656a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b13923'},body:JSON.stringify({sessionId:'b13923',runId:'run1',hypothesisId:'A,C',location:'slots.service.ts:getSlots',message:'fetched data',data:{dependencyRows:dependencies.map(d=>({blocking:d.blockingResourceId,blocked:d.blockedResourceId})),slotCountsByResource:Object.fromEntries([...slotsByResourceId].map(([id,list])=>[id,list.length]))},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const groupResourceIds = this.collectGroupResourceIds(
      slotsByResourceId,
      blockingIdsByBlockedId,
    );

    return groupResourceIds.map((resourceId) => {
      const groupSlots = this.buildMergedGroupSlots(
        resourceId,
        slotsByResourceId,
        blockingIdsByBlockedId,
      );

      this.computeConflicts(groupSlots, resourceId);

      return { resourceId, slots: groupSlots };
    });
  }

  /**
   * Returns the sorted ids of resources that need a group in the response:
   * resources with slots of their own, plus blocked resources whose
   * blocking resources have slots.
   */
  private collectGroupResourceIds(
    slotsByResourceId: Map<number, Slot[]>,
    blockingIdsByBlockedId: Map<number, number[]>,
  ): number[] {
    const resourceIds = new Set(slotsByResourceId.keys());

    for (const [blockedId, blockingIds] of blockingIdsByBlockedId) {
      if (blockingIds.some((id) => slotsByResourceId.has(id))) {
        resourceIds.add(blockedId);
      }
    }

    return [...resourceIds].sort((a, b) => a - b);
  }

  /**
   * Builds a resource group's slot list: its own slots plus copies of the
   * slots of every resource that blocks it, sorted ascending by start.
   * Every entry is a fresh object so groups never share conflicts arrays.
   */
  private buildMergedGroupSlots(
    resourceId: number,
    slotsByResourceId: Map<number, Slot[]>,
    blockingIdsByBlockedId: Map<number, number[]>,
  ): SlotWithConflicts[] {
    const blockingIds = blockingIdsByBlockedId.get(resourceId) ?? [];
    const sourceSlots = [resourceId, ...blockingIds].flatMap(
      (id) => slotsByResourceId.get(id) ?? [],
    );

    // #region agent log
    fetch('http://127.0.0.1:7447/ingest/88b17856-ff37-40f8-908e-8567eb41656a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b13923'},body:JSON.stringify({sessionId:'b13923',runId:'run1',hypothesisId:'A',location:'slots.service.ts:buildMergedGroupSlots',message:'group composition',data:{groupResourceId:resourceId,blockingIdsUsed:blockingIds,ownCount:(slotsByResourceId.get(resourceId)??[]).length,borrowedCount:sourceSlots.length-(slotsByResourceId.get(resourceId)??[]).length,slotIds:sourceSlots.map(s=>`${s.id}(r${s.resourceId})`)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    return sourceSlots
      .map((slot) => ({ ...slot, conflicts: slot['conflicts'] ?? [] }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  /**
   * Populates each slot's conflicts with the other slots whose half-open
   * [start, end) intervals overlap it, so back-to-back slots do not
   * conflict. Only pairs involving the group's own resource are recorded:
   * two slots borrowed from blocking resources are reported in their own
   * groups instead. Conflicts are symmetric: both slots list each other.
   *
   * Expects slots sorted ascending by start, which allows the inner scan
   * to stop at the first slot starting at or after the current slot's end.
   * ISO-8601 datetime strings compare chronologically as plain strings.
   */
  private computeConflicts(
    sortedSlots: SlotWithConflicts[],
    ownResourceId: number,
  ): void {
    for (let i = 0; i < sortedSlots.length; i++) {
      const current = sortedSlots[i];

      for (let j = i + 1; j < sortedSlots.length; j++) {
        const next = sortedSlots[j];

        if (next.start >= current.end) {
          break;
        }

        const involvesOwnResource =
          current.resourceId === ownResourceId ||
          next.resourceId === ownResourceId;

        // #region agent log
        fetch('http://127.0.0.1:7447/ingest/88b17856-ff37-40f8-908e-8567eb41656a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b13923'},body:JSON.stringify({sessionId:'b13923',runId:'run1',hypothesisId:'B,D',location:'slots.service.ts:computeConflicts',message:involvesOwnResource?'pair recorded':'pair skipped (borrowed-borrowed)',data:{group:ownResourceId,a:`${current.id}(r${current.resourceId}) ${current.start.slice(11)}-${current.end.slice(11)}`,b:`${next.id}(r${next.resourceId}) ${next.start.slice(11)}-${next.end.slice(11)}`},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        if (involvesOwnResource) {
          current.conflicts.push(this.toConflictDto(next));
          next.conflicts.push(this.toConflictDto(current));
        }
      }
    }
  }

  /**
   * Copies a slot's own fields without its conflicts array, keeping the
   * serialized response flat and free of circular references.
   */
  private toConflictDto(slot: SlotDto): SlotDto {
    return {
      id: slot.id,
      name: slot.name,
      start: slot.start,
      end: slot.end,
      resourceId: slot.resourceId,
    };
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
