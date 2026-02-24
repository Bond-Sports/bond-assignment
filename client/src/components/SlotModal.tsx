import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Slot, Resource } from '../types';
import { createSlot, updateSlot, ConflictError } from '../api';
import { slotColor } from '../utils/color';
import { formatTime } from '../utils/time';
import './SlotModal.css';

interface SlotModalProps {
  mode: 'create' | 'edit';
  slot?: Slot;
  resources: Resource[];
  onClose: () => void;
}

function parseDatetime(datetime: string) {
  const [date, time] = datetime.split('T');
  return { date: date ?? '', time: time?.slice(0, 5) ?? '' };
}

function buildDatetime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function SlotModal({ mode, slot, resources, onClose }: SlotModalProps) {
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const prefillStart = slot ? parseDatetime(slot.start) : { date: '', time: '' };
  const prefillEnd = slot ? parseDatetime(slot.end) : { date: '', time: '' };

  const [name, setName] = useState(slot?.name ?? '');
  const [resourceId, setResourceId] = useState(slot?.resourceId ?? resources[0]?.id ?? 1);
  const [startDate, setStartDate] = useState(prefillStart.date);
  const [startTime, setStartTime] = useState(prefillStart.time);
  const [endDate, setEndDate] = useState(prefillEnd.date);
  const [endTime, setEndTime] = useState(prefillEnd.time);

  const createMutation = useMutation({
    mutationFn: createSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { start: string; end: string }) =>
      updateSlot(slot!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      onClose();
    },
  });

  const mutation = isEdit ? updateMutation : createMutation;
  const conflicts =
    mutation.error instanceof ConflictError ? mutation.error.conflicts : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const start = buildDatetime(startDate, startTime);
    const end = buildDatetime(endDate, endTime);

    if (isEdit) {
      updateMutation.mutate({ start, end });
    } else {
      createMutation.mutate({ name, start, end, resourceId });
    }
  }

  function resourceName(id: number) {
    return resources.find((r) => r.id === id)?.name ?? `Resource ${id}`;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Slot' : 'Create Slot'}</h2>
          <button className="modal-close" onClick={onClose} type="button">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isEdit}
            />
          </label>

          <label className="modal-field">
            <span>Resource</span>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(Number(e.target.value))}
              disabled={isEdit}
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <div className="modal-row">
            <label className="modal-field">
              <span>Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="modal-field">
              <span>Start Time</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="modal-row">
            <label className="modal-field">
              <span>End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
            <label className="modal-field">
              <span>End Time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </label>
          </div>

          {mutation.error && !conflicts && (
            <div className="modal-error">{mutation.error.message}</div>
          )}

          {conflicts && (
            <div className="modal-conflicts">
              <h3>Scheduling Conflicts</h3>
              <p className="conflicts-subtitle">
                This slot conflicts with the following bookings:
              </p>
              <ul className="conflict-list">
                {conflicts.map((c) => (
                  <li
                    key={c.id}
                    className="conflict-item"
                    style={{ borderLeftColor: slotColor(c.id) }}
                  >
                    <span
                      className="conflict-dot"
                      style={{ backgroundColor: slotColor(c.id) }}
                    />
                    <div className="conflict-info">
                      <span className="conflict-name">{c.name}</span>
                      <span className="conflict-details">
                        {resourceName(c.resourceId)} &middot;{' '}
                        {formatTime(c.start)} – {formatTime(c.end)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? 'Saving...'
                : isEdit
                  ? 'Update'
                  : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
