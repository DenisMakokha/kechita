import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('positions')
export class Position {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    code: string; // CEO, HRM, RM, BM, etc.
}
