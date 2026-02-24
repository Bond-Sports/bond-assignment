import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Slot } from '../types';
import { fetchResources, fetchSlots } from '../api';
import { ResourceColumn } from './ResourceColumn';
import { SlotModal } from './SlotModal';
import './Calendar.css';

const HOURS = Array.from({ length: 25 }, (_, i) => i);

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; slot: Slot }
  | null;

export function Calendar() {
  const { data: resources = [], isError: resourcesError } = useQuery({
    queryKey: ['resources'],
    queryFn: fetchResources,
  });

  const { data: resourceSlots = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: fetchSlots,
  });

  const [modalState, setModalState] = useState<ModalState>(null);

  if (resourcesError) {
    return <div className="calendar-error">Failed to load resources</div>;
  }

  const slotsForResource = (resourceId: number) =>
    resourceSlots.find((rs) => rs.resourceId === resourceId)?.slots ?? [];

  return (
    <div className="calendar">
      <div className="calendar-grid" style={{ gridTemplateColumns: `60px repeat(${resources.length}, 1fr)` }}>
        <div className="time-header" />
        {resources.map((r) => (
          <div key={r.id} className="resource-header">{r.name}</div>
        ))}

        <div className="time-axis">
          {HOURS.map((h) => (
            <div key={h} className="time-label" style={{ top: `${(h / 24) * 100}%` }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {resources.map((r) => (
          <ResourceColumn
            key={r.id}
            resource={r}
            slots={slotsForResource(r.id)}
            resources={resources}
            onSlotClick={(slot) => setModalState({ mode: 'edit', slot })}
          />
        ))}
      </div>

      <button
        className="fab-add"
        onClick={() => setModalState({ mode: 'create' })}
        title="Create new slot"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
          <path d="M12 4a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6V5a1 1 0 011-1z" />
        </svg>
      </button>

      {modalState && (
        <SlotModal
          mode={modalState.mode}
          slot={modalState.mode === 'edit' ? modalState.slot : undefined}
          resources={resources}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
