function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function today(): string {
  return formatDate(new Date());
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

function dt(time: string): string {
  return `${today()}T${time}`;
}

function dtYesterday(time: string): string {
  return `${yesterday()}T${time}`;
}

export interface SeedResource {
  name: string;
}

export interface SeedDependency {
  blockingName: string;
  blockedName: string;
}

export interface SeedSlot {
  name: string;
  resourceName: string;
  start: string;
  end: string;
}

export function getSeedResources(): SeedResource[] {
  return [
    { name: 'Pool' },
    { name: 'Lane 1' },
    { name: 'Lane 2' },
    { name: 'Lane 3' },
    { name: 'Lane 4' },
  ];
}

export function getSeedDependencies(): SeedDependency[] {
  return [
    { blockingName: 'Pool', blockedName: 'Lane 1' },
    { blockingName: 'Pool', blockedName: 'Lane 2' },
    { blockingName: 'Pool', blockedName: 'Lane 3' },
    { blockingName: 'Pool', blockedName: 'Lane 4' },
    { blockingName: 'Lane 3', blockedName: 'Lane 2' },
    { blockingName: 'Lane 2', blockedName: 'Lane 3' },
  ];
}

export function getSeedSlots(): SeedSlot[] {
  return [
    {
      name: 'Night Clean',
      resourceName: 'Pool',
      start: dtYesterday('23:00:00'),
      end: dt('02:00:00'),
    },
    {
      name: 'Pool Party',
      resourceName: 'Pool',
      start: dt('09:00:00'),
      end: dt('11:00:00'),
    },
    {
      name: 'Swim Class',
      resourceName: 'Lane 1',
      start: dt('10:00:00'),
      end: dt('12:00:00'),
    },
    {
      name: 'Private Lesson',
      resourceName: 'Lane 1',
      start: dt('11:00:00'),
      end: dt('13:00:00'),
    },
    {
      name: 'Lap Swim',
      resourceName: 'Lane 1',
      start: dt('14:00:00'),
      end: dt('16:00:00'),
    },
    {
      name: 'Fun Swim',
      resourceName: 'Lane 1',
      start: dt('15:00:00'),
      end: dt('17:00:00'),
    },
    {
      name: 'Evening Swim',
      resourceName: 'Pool',
      start: dt('20:00:00'),
      end: dt('22:00:00'),
    },
    {
      name: 'Kids Swim',
      resourceName: 'Lane 2',
      start: dt('15:00:00'),
      end: dt('17:00:00'),
    },
    {
      name: 'Baby Swim',
      resourceName: 'Lane 3',
      start: dt('16:00:00'),
      end: dt('18:00:00'),
    },
  ];
}
