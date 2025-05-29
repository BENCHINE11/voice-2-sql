import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
// import { OpenAI } from 'openai';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// MongoDB connection (simulated for this example)
// In a real application, you would connect to an actual MongoDB instance
let isConnected = false;
const connectDB = async () => {
  console.log('Using simulated MongoDB connection for demo purposes');
  isConnected = true;
};

// Sample database schemas and data (for simulation)
const sampleData = {
  customers: [
    { id: 1, name: 'John Doe', email: 'john@example.com', state: 'California', createdAt: '2023-01-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', state: 'New York', createdAt: '2023-02-20' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', state: 'California', createdAt: '2023-03-10' },
    { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', state: 'Texas', createdAt: '2023-04-05' },
    { id: 5, name: 'David Brown', email: 'david@example.com', state: 'Florida', createdAt: '2023-05-12' },
  ],
  orders: [
    { id: 101, customerId: 1, amount: 1200, date: '2023-06-10', status: 'completed' },
    { id: 102, customerId: 2, amount: 850, date: '2023-06-15', status: 'completed' },
    { id: 103, customerId: 3, amount: 1500, date: '2023-06-20', status: 'pending' },
    { id: 104, customerId: 1, amount: 950, date: '2023-06-25', status: 'completed' },
    { id: 105, customerId: 4, amount: 2000, date: '2023-06-30', status: 'completed' },
    { id: 106, customerId: 5, amount: 750, date: '2023-07-05', status: 'pending' },
    { id: 107, customerId: 3, amount: 1100, date: '2023-07-10', status: 'completed' },
  ],
  products: [
    { id: 201, name: 'Laptop', category: 'Electronics', price: 1200, stock: 10 },
    { id: 202, name: 'Smartphone', category: 'Electronics', price: 800, stock: 15 },
    { id: 203, name: 'Headphones', category: 'Electronics', price: 200, stock: 20 },
    { id: 204, name: 'T-shirt', category: 'Clothing', price: 30, stock: 50 },
    { id: 205, name: 'Jeans', category: 'Clothing', price: 60, stock: 25 },
  ],
};

// API Route using Gemini instead of Hugging Face
app.post('/api/text-to-sql', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const prompt = `Translate to SQL: ${text}`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const sqlQuery = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!sqlQuery) {
      return res.status(500).json({ message: 'No SQL query generated.' });
    }

    return res.json({ query: sqlQuery });
  } catch (error) {
    console.error("Gemini API error:", {
      status: error?.response?.status,
      url: error?.config?.url,
      data: error?.response?.data,
      headers: error?.response?.headers,
      message: error?.message
    });

    return res.status(500).json({
      message: error?.response?.data?.error?.message || 'Internal Server Error',
    });
  }
});



app.post('/api/execute-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    // Simulate query execution (in a real app, you would execute on MongoDB)
    const results = simulateQueryExecution(query);
    
    return res.json(results);
  } catch (error) {
    console.error('Error executing query:', error);
    return res.status(500).json({ message: 'Error executing query' });
  }
});

// Simulate SQL query execution using the sample data
function simulateQueryExecution(sqlQuery) {
  // Very simple SQL parser for demo purposes
  // In a real application, you would use a proper SQL parser
  // and translate to MongoDB queries
  
  const normalizedQuery = sqlQuery.toLowerCase().trim();
  
  // Extract table name
  let tableName;
  if (normalizedQuery.includes('from customers')) {
    tableName = 'customers';
  } else if (normalizedQuery.includes('from orders')) {
    tableName = 'orders';
  } else if (normalizedQuery.includes('from products')) {
    tableName = 'products';
  } else if (normalizedQuery.includes('join')) {
    // Simplified handling for joins
    if (normalizedQuery.includes('customers') && normalizedQuery.includes('orders')) {
      // Simulate a join between customers and orders
      const joined = sampleData.orders.map(order => {
        const customer = sampleData.customers.find(c => c.id === order.customerId);
        return { ...order, customerName: customer?.name, customerState: customer?.state };
      });
      
      return {
        fields: ['id', 'customerId', 'customerName', 'customerState', 'amount', 'date', 'status'],
        rows: joined
      };
    }
  }
  
  // If we can't determine the table, return a generic result
  if (!tableName) {
    return {
      fields: ['result'],
      rows: [{ result: 'Query executed successfully (simulated)' }]
    };
  }
  
  // Simple filter simulation
  let results = [...sampleData[tableName]];
  
  // Very basic WHERE clause handling
  if (normalizedQuery.includes('where')) {
    if (tableName === 'customers' && normalizedQuery.includes('state')) {
      if (normalizedQuery.includes('california')) {
        results = results.filter(customer => customer.state === 'California');
      } else if (normalizedQuery.includes('new york')) {
        results = results.filter(customer => customer.state === 'New York');
      }
    } else if (tableName === 'orders' && normalizedQuery.includes('amount')) {
      if (normalizedQuery.includes('> 1000') || normalizedQuery.includes('greater than 1000')) {
        results = results.filter(order => order.amount > 1000);
      }
    }
  }
  
  // Extract fields for SELECT
  const fields = Object.keys(results[0] || {});
  
  return {
    fields,
    rows: results
  };
}

// Start server
app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server running on port ${PORT}`);
});