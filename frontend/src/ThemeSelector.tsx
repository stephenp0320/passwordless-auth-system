import { useState, useRef, useEffect } from 'react';
import { useTheme, themes } from './ThemeContext';
import './ThemeSelector.css';

// ThemeSelector component to switch between color themes
const ThemeSelector = () => {
  const { colorTheme, setColorTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false); // State to track if the dropdown is open
  const ref = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  // https://stackoverflow.com/questions/32553158/detect-click-outside-react-component
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        // Check if the click is outside the component and close the dropdown if it is
        const curr = ref.current;
      if (curr && !curr.contains(e.target as Node)) { 
        setIsOpen(false);
      } 
    }; document.addEventListener('mousedown', handleClickOutside);
    
    const remove_listerner = () => document.removeEventListener('mousedown', handleClickOutside);
    // Cleanup the event listener on component unmount
    return remove_listerner;
  }, []);

  // Find the current theme object based on the selected colorTheme
  const currentTheme = themes.find(t => t.id === colorTheme);

  // Render the theme selector button and dropdown
  return (
    // Use a ref to detect clicks outside the component for closing the dropdown
    <div className="theme-selector">
      <button 
        className="theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)} 
        style={{ '--current-color': currentTheme?.color } as React.CSSProperties}>
        <span className="theme-dot-preview" />
        <span className="theme-name">{currentTheme?.name}</span>
        <span className="theme-arrow">{isOpen ? '▲' : ' ▽'}</span>
      </button> 
     
      {/* Render the dropdown menu if it's open, with each theme option */}
      {isOpen && (
        <div className="theme-dropdown">
          {themes.map((theme) => (
            // button for each of the theme options
            <button
              key={theme.id}
              className={`theme-option ${colorTheme === theme.id ? 'active' : ''}`}
              onClick={() => {
                // Set the selected theme and close the dropdown when an option is clicked
                setColorTheme(theme.id);
                setIsOpen(false);
                }}>
                    
                {/* Use CSS variable to set the dot color for each theme option */}
              <span className="theme-dot" style={{ '--dot-color': theme.color } as React.CSSProperties}/>
              <span className="theme-option-name">{theme.name}</span>
              {colorTheme === theme.id && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;