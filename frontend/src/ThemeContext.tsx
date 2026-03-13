import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Define the available color themes
type ColorTheme = 'green' | 'amber' | 'cyan' | 'red' | 'purple' | 'light';

// https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/context/
interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
// ThemeProvider component to wrap the app and provide theme context
// https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/context/#context-provider-component
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('colorTheme') as ColorTheme;
    return saved || 'green';
  });

  // Apply the theme to the document and save it to localStorage whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorTheme);
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
  };


  // Provide the theme and toggle function to the context
  return (
    <ThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the ThemeContext
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
// https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/context/#custom-hook-to-use-context
// Define the available themes with their display names and colors
export const themes: { id: ColorTheme; name: string; color: string }[] = [
  { id: 'green', name: 'Matrix', color: '#00ff00' },
  { id: 'amber', name: 'Retro', color: '#ffb000' },
  { id: 'cyan', name: 'Sci-Fi', color: '#00ffff' },
  { id: 'red', name: 'Mr Robot', color: '#ff3333' },
  { id: 'purple', name: 'Cyberpunk', color: '#bf00ff' },
  { id: 'light', name: 'Light', color: '#ffffff' },
];