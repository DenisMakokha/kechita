import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/theme.store';

export const ThemeToggle = () => {
    const { isDarkMode, toggleDarkMode } = useThemeStore();

    return (
        <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-500" />
            ) : (
                <Moon className="w-5 h-5 text-slate-600" />
            )}
        </button>
    );
};

export default ThemeToggle;
