import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    token: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    user_id: string;

    @Column({ type: 'timestamp' })
    expires_at: Date;

    @Column({ default: false })
    revoked: boolean;

    @Column({ nullable: true })
    revoked_at?: Date;

    @Column({ nullable: true })
    replaced_by?: string;

    @Column({ nullable: true })
    user_agent?: string;

    @Column({ nullable: true })
    ip_address?: string;

    @CreateDateColumn()
    created_at: Date;

    get isExpired(): boolean {
        return new Date() > new Date(this.expires_at);
    }

    get isActive(): boolean {
        return !this.revoked && !this.isExpired;
    }
}
