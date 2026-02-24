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
  ];
}

export function getSeedDependencies(): SeedDependency[] {
  return [
    { blockingName: 'Pool', blockedName: 'Lane 1' },
    { blockingName: 'Pool', blockedName: 'Lane 2' },
    { blockingName: 'Pool', blockedName: 'Lane 3' },
    { blockingName: 'Lane 3', blockedName: 'Lane 2' },
    { blockingName: 'Lane 2', blockedName: 'Lane 3' },
  ];
}

export function getSeedSlots(): SeedSlot[] {
  return [
    // Overnight slots (started yesterday, end today)
    {
      name: 'Overnight Pool Cleaning',
      resourceName: 'Pool',
      start: dtYesterday('23:00:00'),
      end: dt('05:00:00'),
    },
    {
      name: 'Late Night Lap Swim',
      resourceName: 'Lane 1',
      start: dtYesterday('22:00:00'),
      end: dt('01:00:00'),
    },
    {
      name: 'Overnight Swim Camp',
      resourceName: 'Lane 2',
      start: dtYesterday('23:30:00'),
      end: dt('04:00:00'),
    },

    // Pool (full-facility)
    {
      name: 'Morning Open Swim',
      resourceName: 'Pool',
      start: dt('06:00:00'),
      end: dt('08:00:00'),
    },
    {
      name: 'Aqua Aerobics Class',
      resourceName: 'Pool',
      start: dt('09:30:00'),
      end: dt('11:00:00'),
    },
    {
      name: 'Afternoon Open Swim',
      resourceName: 'Pool',
      start: dt('12:30:00'),
      end: dt('14:00:00'),
    },
    {
      name: 'Swim Meet Warm-Up',
      resourceName: 'Pool',
      start: dt('15:00:00'),
      end: dt('16:30:00'),
    },
    {
      name: 'Swim Team Practice - Varsity',
      resourceName: 'Pool',
      start: dt('18:00:00'),
      end: dt('19:45:00'),
    },
    {
      name: 'Evening Maintenance',
      resourceName: 'Pool',
      start: dt('21:00:00'),
      end: dt('22:00:00'),
    },

    // Lane 1
    {
      name: 'Early Bird Lap Swim',
      resourceName: 'Lane 1',
      start: dt('06:30:00'),
      end: dt('08:00:00'),
    },
    {
      name: 'Swim Lessons - Beginners',
      resourceName: 'Lane 1',
      start: dt('08:30:00'),
      end: dt('10:00:00'),
    },
    {
      name: 'Private Coaching - Sarah M.',
      resourceName: 'Lane 1',
      start: dt('09:30:00'),
      end: dt('11:00:00'),
    },
    {
      name: 'Lap Swim - Intermediate',
      resourceName: 'Lane 1',
      start: dt('11:00:00'),
      end: dt('12:30:00'),
    },
    {
      name: 'Stroke Clinic - Butterfly',
      resourceName: 'Lane 1',
      start: dt('14:00:00'),
      end: dt('15:30:00'),
    },
    {
      name: 'Private Coaching - Dan R.',
      resourceName: 'Lane 1',
      start: dt('15:00:00'),
      end: dt('16:00:00'),
    },
    {
      name: 'Masters Swim Club',
      resourceName: 'Lane 1',
      start: dt('18:30:00'),
      end: dt('20:30:00'),
    },

    // Lane 2
    {
      name: 'Kids Swim Camp',
      resourceName: 'Lane 2',
      start: dt('08:00:00'),
      end: dt('09:30:00'),
    },
    {
      name: 'Swim Lessons - Advanced',
      resourceName: 'Lane 2',
      start: dt('09:00:00'),
      end: dt('10:30:00'),
    },
    {
      name: 'Lifeguard Training',
      resourceName: 'Lane 2',
      start: dt('11:00:00'),
      end: dt('12:30:00'),
    },
    {
      name: 'Rehab Swim Session',
      resourceName: 'Lane 2',
      start: dt('13:00:00'),
      end: dt('14:00:00'),
    },
    {
      name: 'Lane Rental - Chris S.',
      resourceName: 'Lane 2',
      start: dt('15:30:00'),
      end: dt('17:00:00'),
    },
    {
      name: 'Dive Team Practice',
      resourceName: 'Lane 2',
      start: dt('16:30:00'),
      end: dt('18:00:00'),
    },
    {
      name: 'Lane Rental - Geoff P.',
      resourceName: 'Lane 2',
      start: dt('18:30:00'),
      end: dt('20:00:00'),
    },

    // Lane 3
    {
      name: 'Sunrise Swim Squad',
      resourceName: 'Lane 3',
      start: dt('06:00:00'),
      end: dt('07:30:00'),
    },
    {
      name: 'Toddler Splash Time',
      resourceName: 'Lane 3',
      start: dt('09:00:00'),
      end: dt('10:00:00'),
    },
    {
      name: 'Water Polo Practice',
      resourceName: 'Lane 3',
      start: dt('10:30:00'),
      end: dt('12:00:00'),
    },
    {
      name: 'Synchronized Swimming',
      resourceName: 'Lane 3',
      start: dt('11:30:00'),
      end: dt('13:00:00'),
    },
    {
      name: 'Senior Aqua Therapy',
      resourceName: 'Lane 3',
      start: dt('14:00:00'),
      end: dt('15:00:00'),
    },
    {
      name: 'Triathlon Swim Training',
      resourceName: 'Lane 3',
      start: dt('16:00:00'),
      end: dt('17:30:00'),
    },
    {
      name: 'Open Swim - Member Hours',
      resourceName: 'Lane 3',
      start: dt('18:00:00'),
      end: dt('21:00:00'),
    },
  ];
}
