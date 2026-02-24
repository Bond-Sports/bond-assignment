import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { SlotsModule } from '../src/slots/slots.module';
import { Resource } from '../src/entities/resource.entity';
import { BlockingDependency } from '../src/entities/blocking-dependency.entity';
import { Slot } from '../src/entities/slot.entity';
import { seed } from '../src/seed';
import { SlotDto } from 'src/slots/types/dtos/slots.dto';

const TEST_DB_PATH = join(__dirname, '..', 'test-database.sqlite');

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dt(time: string): string {
  return `${formatDate(new Date())}T${time}`;
}

describe('Slots API (e2e)', () => {
  let app: INestApplication<App>;
  let poolId: number;
  let lane1Id: number;

  beforeAll(async () => {
    await seed(TEST_DB_PATH);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: TEST_DB_PATH,
          entities: [Resource, BlockingDependency, Slot],
        }),
        SlotsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    const ds = moduleFixture.get(DataSource);
    const resources = await ds.getRepository(Resource).find();
    for (const r of resources) {
      if (r.name === 'Pool') poolId = r.id;
      if (r.name === 'Lane 1') lane1Id = r.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── GET /slots ─────────────────────────────────────────────────────

  describe('GET /slots', () => {
    let slots: SlotDto[];

    beforeAll(async () => {
      const { body } = await request(app.getHttpServer())
        .get('/slots')
        .expect(200);
      slots = body;
    });

    it('should return all seeded slots', () => {
      expect(slots.length).toBeGreaterThan(0);
    });

    it('should return slots with the correct shape', () => {
      for (const slot of slots) {
        expect(slot).toHaveProperty('id');
        expect(slot).toHaveProperty('name');
        expect(slot).toHaveProperty('start');
        expect(slot).toHaveProperty('end');
        expect(slot).toHaveProperty('resourceId');
        expect(slot).toHaveProperty('conflicts');
        expect(Array.isArray(slot.conflicts)).toBe(true);
      }
    });

    it('should have at least one slot with conflicts', () => {
      const slotsWithConflicts = slots.filter(s => s.conflicts.length > 0);
      expect(slotsWithConflicts.length).toBeGreaterThan(0);
    });

    it('should have conflicts with the correct shape', () => {
      const slotWithConflicts = slots.find(s => s.conflicts.length > 0);


      if (!slotWithConflicts) {
        throw new Error('No slot with conflicts found');
      }

      for (const conflict of slotWithConflicts?.conflicts ?? []) {
        expect(conflict).toHaveProperty('id');
        expect(conflict).toHaveProperty('name');
        expect(conflict).toHaveProperty('start');
        expect(conflict).toHaveProperty('end');
        expect(conflict).toHaveProperty('resourceId');
        expect(conflict).toHaveProperty('conflicts');
        expect(conflict.conflicts).toEqual([]);
      }
    });
  });

  // ─── POST /slots ────────────────────────────────────────────────────

  describe('POST /slots', () => {
    it('should create a slot when there are no conflicts', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/slots')
        .send({
          name: 'No Conflict Slot',
          start: dt('05:00:00'),
          end: dt('05:30:00'),
          resourceId: poolId,
        })
        .expect(201);

      expect(body).toHaveProperty('id');
      expect(body.name).toBe('No Conflict Slot');
      expect(body.start).toBe(dt('05:00:00'));
      expect(body.end).toBe(dt('05:30:00'));
      expect(body.resourceId).toBe(poolId);
    });

    it('should reject with 409 and return conflicting slots when conflicts exist', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/slots')
        .send({
          name: 'Conflict Slot',
          start: dt('09:00:00'),
          end: dt('10:00:00'),
          resourceId: lane1Id,
        })
        .expect(409);

      expect(body).toBeDefined();
      expect(body.length).toBeGreaterThan(0);
      for (const conflict of body) {
        expect(conflict).toHaveProperty('id');
        expect(conflict).toHaveProperty('name');
        expect(conflict).toHaveProperty('start');
        expect(conflict).toHaveProperty('end');
        expect(conflict).toHaveProperty('resourceId');
      }
    });
  });

  // ─── PUT /slots/:slotId ─────────────────────────────────────────────

  describe('PUT /slots/:slotId', () => {
    let slotId: number;

    beforeAll(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/slots')
        .send({
          name: 'Editable Slot',
          start: dt('22:30:00'),
          end: dt('23:00:00'),
          resourceId: poolId,
        })
        .expect(201);

      slotId = body.id;
    });

    it('should update slot times when there are no conflicts', async () => {
      const { body } = await request(app.getHttpServer())
        .put(`/slots/${slotId}`)
        .send({
          start: dt('23:00:00'),
          end: dt('23:30:00'),
        })
        .expect(200);

      expect(body.id).toBe(slotId);
      expect(body.start).toBe(dt('23:00:00'));
      expect(body.end).toBe(dt('23:30:00'));
    });

    it('should reject with 409 and return conflicting slots when new times conflict', async () => {
      const { body } = await request(app.getHttpServer())
        .put(`/slots/${slotId}`)
        .send({
          start: dt('09:00:00'),
          end: dt('10:00:00'),
        })
        .expect(409);

      expect(body).toBeDefined();
      expect(body.length).toBeGreaterThan(0);
      for (const conflict of body) {
        expect(conflict).toHaveProperty('id');
        expect(conflict).toHaveProperty('name');
        expect(conflict).toHaveProperty('start');
        expect(conflict).toHaveProperty('end');
        expect(conflict).toHaveProperty('resourceId');
      }
    });
  });
});
