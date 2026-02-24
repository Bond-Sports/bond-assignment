import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Resource } from "./resource.entity";

@Entity({ name: 'Slots' })
export class Slot extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text', { name: 'name', nullable: false })
    name: string;

    @Column('text', { name: 'start', nullable: false })
    start: string;

    @Column('text', { name: 'end', nullable: false })
    end: string;

    @Column('integer', { name: 'resource_id', nullable: false })
    resourceId: number;

    @ManyToOne(() => Resource, (resource) => resource.id)
    resource: Resource;
}