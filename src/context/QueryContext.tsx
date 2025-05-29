import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface QueryResult {
  fields: string[];
  rows: Record<string, any>[];
}

export interface QueryItem {
  id: string;
  text: string;
  sqlQuery: string;
  timestamp: number;
  results?: QueryResult;
}

interface QueryContextType {
  currentText: string;
  setCurrentText: (text: string) => void;
  sqlQuery: string;
  isLoading: boolean;
  isProcessing: boolean;
  results: QueryResult | null;
  error: string | null;
  history: QueryItem[];
  processQuery: (text: string) => Promise<void>;
  clearCurrent: () => void;
  selectHistoryItem: (item: QueryItem) => void;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentText, setCurrentText] = useState<string>('');
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryItem[]>(() => {
    const savedHistory = localStorage.getItem('queryHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  useEffect(() => {
    localStorage.setItem('queryHistory', JSON.stringify(history));
  }, [history]);

  const processQuery = async (text: string) => {
    if (!text.trim()) return;
    
    setCurrentText(text);
    setIsLoading(true);
    setError(null);
    
    try {
      // First, get the SQL query
      setIsProcessing(true);
      const { data: sqlData } = await api.post('/api/text-to-sql', { text });
      setSqlQuery(sqlData.query);
      setIsProcessing(false);
      
      // Then, execute the query
      const { data: resultsData } = await api.post('/api/execute-query', { 
        query: sqlData.query 
      });
      
      setResults(resultsData);
      
      // Add to history
      const newItem: QueryItem = {
        id: Date.now().toString(),
        text,
        sqlQuery: sqlData.query,
        timestamp: Date.now(),
        results: resultsData
      };
      
      setHistory(prev => [newItem, ...prev].slice(0, 10));
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCurrent = () => {
    setCurrentText('');
    setSqlQuery('');
    setResults(null);
    setError(null);
  };

  const selectHistoryItem = (item: QueryItem) => {
    setCurrentText(item.text);
    setSqlQuery(item.sqlQuery);
    setResults(item.results || null);
    setError(null);
  };

  return (
    <QueryContext.Provider 
      value={{
        currentText,
        setCurrentText,
        sqlQuery,
        isLoading,
        isProcessing,
        results,
        error,
        history,
        processQuery,
        clearCurrent,
        selectHistoryItem
      }}
    >
      {children}
    </QueryContext.Provider>
  );
};

export const useQuery = (): QueryContextType => {
  const context = useContext(QueryContext);
  if (context === undefined) {
    throw new Error('useQuery must be used within a QueryProvider');
  }
  return context;
};