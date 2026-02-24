import { DataSource } from 'typeorm';
import { BlockingDependency } from './entities/blocking-dependency.entity';
import { Resource } from './entities/resource.entity';
import { Slot } from './entities/slot.entity';
import {
  getSeedDependencies,
  getSeedResources,
  getSeedSlots,
} from './seed-data';

export async function seed(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'bond',
    password: 'bond',
    database: 'bond',
    entities: [Resource, BlockingDependency, Slot],
    synchronize: true,
  });

  await dataSource.initialize();

  const resourceRepo = dataSource.getRepository(Resource);
  const depRepo = dataSource.getRepository(BlockingDependency);
  const slotRepo = dataSource.getRepository(Slot);

  await resourceRepo.query('TRUNCATE TABLE "Resources" CASCADE');
  await depRepo.query('TRUNCATE TABLE "BlockingDependencies" CASCADE');
  await slotRepo.query('TRUNCATE TABLE "Slots" CASCADE');

  const resourceMap = new Map<string, number>();
  for (const r of getSeedResources()) {
    const saved = await resourceRepo.save(r);
    resourceMap.set(saved.name, saved.id);
  }

  const deps = getSeedDependencies().map((d) => ({
    blockingResourceId: resourceMap.get(d.blockingName)!,
    blockedResourceId: resourceMap.get(d.blockedName)!,
  }));
  await depRepo.save(deps);

  const slots = getSeedSlots().map((s) => ({
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
