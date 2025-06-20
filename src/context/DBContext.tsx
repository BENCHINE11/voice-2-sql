import React, { createContext, useContext, useState } from 'react';

interface DBConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  schema: Record<string, string[]>;
}

const DBContext = createContext<{
  dbConfig: DBConfig | null;
  setDbConfig: (config: DBConfig) => void;
}>({
  dbConfig: null,
  setDbConfig: () => {}
});

export const DBProvider = ({ children }: { children: React.ReactNode }) => {
  const [dbConfig, setDbConfig] = useState<DBConfig | null>(null);

  return (
    <DBContext.Provider value={{ dbConfig, setDbConfig }}>
      {children}
    </DBContext.Provider>
  );
};

export const useDB = () => useContext(DBContext);