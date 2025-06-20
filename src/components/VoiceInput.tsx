import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, X, Database } from 'lucide-react';
import { useQuery } from '../context/QueryContext';
import DBConnectModal from './DBConnectModal';
import { useDB } from '../context/DBContext';

const VoiceInput: React.FC = () => {
  const { currentText, setCurrentText, processQuery, clearCurrent, isLoading } = useQuery();
  const { dbConfig } = useDB();

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isMicSupported, setIsMicSupported] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 🧠 Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setCurrentText(transcript);

        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    } else {
      setIsMicSupported(false);
    }

    return () => recognitionRef.current?.stop();
  }, [setCurrentText]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentText.trim()) return;

    if (!dbConfig) {
      alert('Please connect to a database first.');
      return;
    }

    processQuery(currentText, dbConfig); // ✅ Pass it in
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ask in natural language</h2>
        <button
          onClick={() => setShowModal(true)}
          className={`group flex items-center px-3 py-1 rounded font-medium border ${
            dbConfig
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'border-white text-white hover:bg-green-500 hover:border-green-500'
          }`}
          title={dbConfig ? 'Click to change database' : 'Connect to a database'}
        >
          <Database className="h-4 w-4 mr-1" />
          {dbConfig ? 'Connected ✓' : 'Connect to DB'}
        </button>
      </div>

      {showModal && <DBConnectModal onClose={() => setShowModal(false)} />}

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={currentText}
            onChange={handleTextareaChange}
            className="input min-h-[80px] py-3 pr-12"
            placeholder="e.g. 'Show me all teachers whose names start with B'"
            rows={2}
          />

          {currentText && (
            <button
              type="button"
              onClick={clearCurrent}
              className="absolute right-12 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear input"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex justify-between mt-4">
          <div className="flex items-center">
            {isMicSupported ? (
              <button
                type="button"
                onClick={toggleListening}
                className={`btn ${isListening ? 'bg-red-500 hover:bg-red-600' : 'btn-ghost'} p-2 mr-2`}
                aria-label={isListening ? 'Stop recording' : 'Start recording'}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-5 w-5 mr-1" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 mr-1" />
                    <span>Record</span>
                  </>
                )}
              </button>
            ) : (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Microphone not supported in this browser
              </p>
            )}

            {isListening && (
              <div className="wave-animation ml-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="wave-bar" />
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!currentText.trim() || isLoading}
          >
            <Send className="h-4 w-4 mr-1" />
            <span>{isLoading ? 'Processing...' : 'Generate SQL'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default VoiceInput;
