import React, { useState, useEffect } from 'react';
import { useDB } from '../context/DBContext';
import { api } from '../services/api';

interface Props {
  onClose: () => void;
}

const DBConnectModal: React.FC<Props> = ({ onClose }) => {
  const [host, setHost] = useState('localhost');
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const { setDbConfig } = useDB();

  useEffect(() => {
    const saved = localStorage.getItem('dbConfig');
    if (saved) {
      try {
        const { host, user, database } = JSON.parse(saved);
        setHost(host);
        setUser(user);
        setDatabase(database);
      } catch (e) {
        console.warn('Failed to parse saved dbConfig');
      }
    }
  }, []);

  const handleTest = async () => {
    try {
      const res = await api.post('/api/connect-db', {
        host,
        user,
        password,
        database
      });
      alert('✅ Connection successful!');
    } catch (err: any) {
      alert(`❌ Failed to connect. ${err?.response?.data?.message || ''}`);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await api.post('/api/connect-db', {
        host,
        user,
        password,
        database
      });

      const config = { host, user, database, schema: res.data.schema };
      localStorage.setItem('dbConfig', JSON.stringify(config));
      setDbConfig({ ...config, password });
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || '❌ Failed to connect.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1f2937] text-white rounded-xl p-6 w-[400px]">
        <h2 className="text-xl font-bold mb-4">Connect to Database</h2>
        <div className="space-y-3">
          <input value={host} onChange={e => setHost(e.target.value)} placeholder="Host" className="w-full bg-transparent border border-gray-500 rounded px-3 py-2" />
          <input value={user} onChange={e => setUser(e.target.value)} placeholder="User" className="w-full bg-transparent border border-gray-500 rounded px-3 py-2" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-transparent border border-gray-500 rounded px-3 py-2" />
          <input value={database} onChange={e => setDatabase(e.target.value)} placeholder="Database" className="w-full bg-transparent border border-gray-500 rounded px-3 py-2" />
        </div>
        <div className="flex justify-between mt-6">
          <button onClick={handleTest} className="border border-white text-white px-4 py-1 rounded hover:bg-green-500 hover:border-green-500">
            Test
          </button>
          <button onClick={handleConnect} className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700">
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default DBConnectModal;
