import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useDB } from './DBContext';

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
  const { dbConfig } = useDB(); // ✅ Correct usage at the top level
  const [currentText, setCurrentText] = useState<string>('');
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryItem[]>(() => {
    const saved = localStorage.getItem('queryHistory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await api.get('/api/history', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const formatted = res.data.history.map((h: any) => ({
          id: h.id.toString(),
          text: h.query,
          sqlQuery: h.query,
          timestamp: new Date(h.created_at).getTime(),
          results: undefined // or null for now
        }));

        setHistory(formatted);
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    };

    fetchHistory();
  }, []);

  const processQuery = async (text: string) => {
    if (!text.trim()) return;

    setCurrentText(text);
    setIsLoading(true);
    setError(null);

    try {
      if (!dbConfig) throw new Error('No database connected');

      setIsProcessing(true);

      // 🔹 Generate SQL query
      const { data: sqlData } = await api.post('/api/text-to-sql', {
        text,
        schema: dbConfig.schema
      });
      setSqlQuery(sqlData.query);
      setIsProcessing(false);

      // 🔹 Execute the SQL query
      const { data: resultsData } = await api.post('/api/execute-query', {
        query: sqlData.query,
        dbConfig
      });

      setResults(resultsData);

      const newItem: QueryItem = {
        id: Date.now().toString(),
        text,
        sqlQuery: sqlData.query,
        timestamp: Date.now(),
        results: resultsData
      };

      setHistory(prev => [newItem, ...prev].slice(0, 10));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
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
