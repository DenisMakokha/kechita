import React, { useRef } from 'react';
import {
    MoreVertical, Edit, Trash2, ShieldCheck, UserCheck, UserX, Mail, Eye,
    Key, Building, Archive, ArchiveRestore, Ban,
} from 'lucide-react';
import { PortalMenu } from '../ui/PortalMenu';

interface StaffRowActionsProps {
    m: any;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    isArchived: boolean;
    isInactive: boolean;
    isActive: boolean;
    canTerminate: boolean;
    isCeo: boolean;
    navigate: (path: string) => void;
    setSelectedStaff: (s: any) => void;
    setEditStaffData: (d: any) => void;
    setShowEditStaffModal: (v: boolean) => void;
    setPromoteData: (d: any) => void;
    setShowPromoteModal: (v: boolean) => void;
    setTransferData: (d: any) => void;
    setShowTransferModal: (v: boolean) => void;
    resendWelcomeMutation: { mutate: (id: string) => void };
    activateStaffMutation: { mutate: (id: string) => void };
    setShowDeactivateConfirm: (v: boolean) => void;
    setTerminateTarget: (s: any) => void;
    setTerminateForm: (d: any) => void;
    setArchiveTarget: (s: any) => void;
    restoreStaffMutation: { mutate: (id: string) => void };
    setPermanentDeleteTarget: (s: any) => void;
    setPermanentDeleteConfirm: (v: string) => void;
    setReinstateTarget?: (s: any) => void;
}

export const StaffRowActions: React.FC<StaffRowActionsProps> = ({
    m, isOpen, onToggle, onClose,
    isArchived, isInactive, isActive, canTerminate, isCeo,
    navigate, setSelectedStaff, setEditStaffData, setShowEditStaffModal,
    setPromoteData, setShowPromoteModal, setTransferData, setShowTransferModal,
    resendWelcomeMutation, activateStaffMutation, setShowDeactivateConfirm,
    setTerminateTarget, setTerminateForm, setArchiveTarget,
    restoreStaffMutation, setPermanentDeleteTarget, setPermanentDeleteConfirm,
    setReinstateTarget,
}) => {
    const triggerRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <button ref={triggerRef} onClick={onToggle} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <MoreVertical size={18} />
            </button>
            <PortalMenu anchorRef={triggerRef} isOpen={isOpen} onClose={onClose}>
                <button onClick={() => { navigate(`/staff/${m.id}`); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Eye size={16} />View Profile</button>
                {!isArchived && (
                    <>
                        <button onClick={() => { setSelectedStaff(m); setEditStaffData({ first_name: m.first_name, last_name: m.last_name, phone: m.phone || '', position_id: m.position?.id || '', branch_id: m.branch?.id || '', department_id: m.department?.id || '', region_id: m.region?.id || '' }); setShowEditStaffModal(true); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit size={16} />Edit</button>
                        <button onClick={() => { setSelectedStaff(m); setPromoteData({ new_position_id: '', new_salary: '', effective_date: new Date().toISOString().split('T')[0], reason: '' }); setShowPromoteModal(true); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><ShieldCheck size={16} />Promote</button>
                        <button onClick={() => { setSelectedStaff(m); setTransferData({ branch_id: '', region_id: '', effective_date: new Date().toISOString().split('T')[0], reason: '' }); setShowTransferModal(true); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Building size={16} />Transfer</button>
                        {m.user?.email && <button onClick={() => { window.location.href = `mailto:${m.user?.email}`; onClose(); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Mail size={16} />Email</button>}
                        {m.user?.email && <button onClick={() => { resendWelcomeMutation.mutate(m.id); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Key size={16} />Resend Welcome</button>}
                        <hr className="my-1" />
                        {m.status === 'suspended' ? (
                            <button onClick={() => { activateStaffMutation.mutate(m.id); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"><UserCheck size={16} />Reactivate</button>
                        ) : isActive ? (
                            <button onClick={() => { setSelectedStaff(m); setShowDeactivateConfirm(true); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"><UserX size={16} />Suspend</button>
                        ) : null}
                        {m.status === 'terminated' && setReinstateTarget && (
                            <button onClick={() => { setReinstateTarget(m); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"><UserCheck size={16} />Reinstate Staff</button>
                        )}
                        {canTerminate && (
                            <button onClick={() => { setTerminateTarget(m); setTerminateForm({ reason: '', terminationDate: new Date().toISOString().split('T')[0], force: false }); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"><Ban size={16} />Terminate Employment</button>
                        )}
                        {isInactive && (
                            <button onClick={() => { setArchiveTarget(m); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Archive size={16} />Archive</button>
                        )}
                    </>
                )}
                {isArchived && (
                    <>
                        <button onClick={() => { restoreStaffMutation.mutate(m.id); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"><ArchiveRestore size={16} />Restore from Archive</button>
                        {isCeo && (
                            <>
                                <hr className="my-1" />
                                <button onClick={() => { setPermanentDeleteTarget(m); setPermanentDeleteConfirm(''); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"><Trash2 size={16} />Permanently Delete</button>
                            </>
                        )}
                    </>
                )}
            </PortalMenu>
        </>
    );
};
