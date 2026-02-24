import { DataSource } from 'typeorm';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { Resource } from './entities/resource.entity';
import { BlockingDependency } from './entities/blocking-dependency.entity';
import { Slot } from './entities/slot.entity';
import { getSeedResources, getSeedDependencies, getSeedSlots } from './seed-data';

export const DB_PATH = join(__dirname, '..', 'database.sqlite');

export async function seed(dbPath: string = DB_PATH): Promise<void> {
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }

  const dataSource = new DataSource({
    type: 'sqlite',
    database: dbPath,
    entities: [Resource, BlockingDependency, Slot],
    synchronize: true,
  });

  await dataSource.initialize();

  const resourceRepo = dataSource.getRepository(Resource);
  const depRepo = dataSource.getRepository(BlockingDependency);
  const slotRepo = dataSource.getRepository(Slot);

  const resourceMap = new Map<string, number>();
  for (const r of getSeedResources()) {
    const saved = await resourceRepo.save(r);
    resourceMap.set(saved.name, saved.id);
  }

  const deps = getSeedDependencies().map(d => ({
    blockingResourceId: resourceMap.get(d.blockingName)!,
    blockedResourceId: resourceMap.get(d.blockedName)!,
  }));
  await depRepo.save(deps);

  const slots = getSeedSlots().map(s => ({
    name: s.name,
    start: s.start,
    end: s.end,
    resourceId: resourceMap.get(s.resourceName)!,
  }));
  await slotRepo.save(slots);

  await dataSource.destroy();
}

if (require.main === module) {
  seed()
    .then(() => console.log('Seed complete.'))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
