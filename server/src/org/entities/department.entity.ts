import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('departments')
export class Department {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    code: string;
}
