import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'BlockingDependencies' })
export class BlockingDependency extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('integer', { name: 'blocked_resource_id', nullable: false })
  blockedResourceId: number;

  @Column('integer', { name: 'blocking_resource_id', nullable: false })
  blockingResourceId: number;
}
