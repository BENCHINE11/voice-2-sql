import React from 'react';
import { Clock, X } from 'lucide-react';
import { useQuery, QueryItem } from '../context/QueryContext';

interface QueryHistoryProps {
  onClose: () => void;
}

const QueryHistory: React.FC<QueryHistoryProps> = ({ onClose }) => {
  const { history, selectHistoryItem } = useQuery();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Clock className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Query History
        </h2>
        <button
          onClick={onClose}
          className="btn btn-ghost p-1"
          aria-label="Close history"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No query history yet
        </div>
      ) : (
        <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
          {history.map((item: QueryItem) => (
            <li 
              key={item.id}
              className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-200"
              onClick={() => {
                selectHistoryItem(item);
                onClose();
              }}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                {item.text}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatTime(item.timestamp)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default QueryHistory;