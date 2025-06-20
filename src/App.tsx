import React, { useState } from 'react';
import Header from './components/Header';
import VoiceInput from './components/VoiceInput';
import QueryDisplay from './components/QueryDisplay';
import ResultsDisplay from './components/ResultsDisplay';
import QueryHistory from './components/QueryHistory';
import { ThemeProvider } from './context/ThemeContext';
import { QueryProvider } from './context/QueryContext';
import { DBProvider } from './context/DBContext';

function App() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <ThemeProvider>
      <DBProvider>
        <QueryProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Header onHistoryToggle={() => setIsHistoryOpen(!isHistoryOpen)} />
            
            <main className="container mx-auto px-4 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {isHistoryOpen && (
                  <div className="lg:col-span-3">
                    <QueryHistory onClose={() => setIsHistoryOpen(false)} />
                  </div>
                )}
                
                <div className={`${isHistoryOpen ? 'lg:col-span-9' : 'lg:col-span-12'}`}>
                  <div className="mb-8">
                    <VoiceInput />
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <QueryDisplay />
                    <ResultsDisplay />
                  </div>
                </div>
              </div>
            </main>
            
            <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Voice2Query © {new Date().getFullYear()} - Convert natural language to SQL</p>
            </footer>
          </div>
        </QueryProvider>
      </DBProvider>
    </ThemeProvider>
  );
}

export default App;