import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Slot } from './slot.entity';

@Entity({ name: 'Resources' })
export class Resource extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { name: 'name', nullable: false })
  name: string;

  @OneToMany(() => Slot, (slot: Slot) => slot.resource)
  @JoinColumn({ name: 'id', referencedColumnName: 'resource_id' })
  slots: Slot[];
}
