import React from 'react';
import { Check, Copy, Database } from 'lucide-react';
import { useQuery } from '../context/QueryContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const QueryDisplay: React.FC = () => {
  const { sqlQuery, isProcessing, error } = useQuery();
  const [copied, setCopied] = React.useState<boolean>(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Generated SQL Query
        </h2>
        
        {sqlQuery && (
          <button
            onClick={copyToClipboard}
            className="btn btn-ghost p-1"
            title="Copy SQL"
            aria-label="Copy SQL to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[200px]">
        {isProcessing ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-pulse text-gray-500 dark:text-gray-400">
              Generating SQL query...
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500 dark:text-red-400">
            Error: {error}
          </div>
        ) : sqlQuery ? (
          <SyntaxHighlighter 
            language="sql" 
            style={vscDarkPlus}
            customStyle={{ 
              background: 'transparent', 
              fontSize: '14px',
              padding: '16px',
              borderRadius: '0.5rem',
              margin: 0
            }}
          >
            {sqlQuery}
          </SyntaxHighlighter>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Database className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              Your generated SQL query will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryDisplay;