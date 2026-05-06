import { Printer } from 'lucide-react';

interface PrintButtonProps {
  label?: string;
  className?: string;
  onBeforePrint?: () => void;
}

export function PrintButton({ label = 'Print', className = '', onBeforePrint }: PrintButtonProps) {
  const handlePrint = () => {
    if (onBeforePrint) {
      onBeforePrint();
    }
    // Small delay to allow any state changes to render
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <button
      onClick={handlePrint}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors screen-only ${className}`}
      title="Print this page"
    >
      <Printer size={16} />
      {label}
    </button>
  );
}

export default PrintButton;
