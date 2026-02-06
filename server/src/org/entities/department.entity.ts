import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('departments')
export class Department {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    code: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @ManyToOne(() => Department, (dept) => dept.children, { nullable: true })
    @JoinColumn({ name: 'parent_id' })
    parent?: Department;

    @OneToMany(() => Department, (dept) => dept.parent)
    children: Department[];

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
