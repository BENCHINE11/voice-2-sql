import React from 'react';
import { Database, History, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onHistoryToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHistoryToggle }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Voice2Query</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onHistoryToggle}
              className="btn btn-ghost p-2"
              aria-label="Toggle History"
              title="Query History"
            >
              <History className="h-5 w-5" />
            </button>
            
            <button
              onClick={toggleTheme}
              className="btn btn-ghost p-2"
              aria-label="Toggle Theme"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;