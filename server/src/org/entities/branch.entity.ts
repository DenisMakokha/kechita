import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Region } from './region.entity';

@Entity('branches')
export class Branch {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => require('./region.entity').Region, (region: any) => region.branches)
    @JoinColumn({ name: 'region_id' })
    region: Region;

    @Column()
    name: string;

    @Column({ unique: true })
    code: string;
}
