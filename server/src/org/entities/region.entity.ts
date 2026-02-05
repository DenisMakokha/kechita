import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Branch } from './branch.entity';

@Entity('regions')
export class Region {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    code: string;

    @OneToMany(() => Branch, (branch) => branch.region)
    branches: Branch[];
}
