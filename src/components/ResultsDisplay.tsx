import React from 'react';
import { Table, AlertCircle } from 'lucide-react';
import { useQuery } from '../context/QueryContext';

const ResultsDisplay: React.FC = () => {
  const { results, isLoading, error } = useQuery();

  return (
    <div className="card h-full">
      <div className="flex items-center mb-4">
        <Table className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Query Results</h2>
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-pulse text-gray-500 dark:text-gray-400">
              Executing query...
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        ) : results ? (
          results.rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  {results.fields.map((field, i) => (
                    <th 
                      key={i}
                      className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300"
                    >
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row, i) => (
                  <tr 
                    key={i} 
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {results.fields.map((field, j) => (
                      <td 
                        key={j} 
                        className="px-3 py-2 text-gray-900 dark:text-gray-100"
                      >
                        {row[field]?.toString() || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Table className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              Query results will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;