import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    setDarkMode: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            isDarkMode: false,
            toggleDarkMode: () => set((state) => {
                const newValue = !state.isDarkMode;
                // Apply to document
                if (newValue) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                return { isDarkMode: newValue };
            }),
            setDarkMode: (isDark: boolean) => set(() => {
                if (isDark) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                return { isDarkMode: isDark };
            }),
        }),
        {
            name: 'kechita-theme',
            onRehydrateStorage: () => (state) => {
                // Apply theme on rehydration
                if (state?.isDarkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            },
        }
    )
);
