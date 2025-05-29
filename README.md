# Voice2Query

A modern full-stack web application that converts voice to text and then to SQL queries.

## Features

- Voice-to-text conversion using Web Speech API
- Natural language to SQL translation using OpenAI API
- MongoDB query generation and simulated execution
- Real-time feedback with streaming results
- Sample database with pre-populated data for testing
- Mobile-responsive interface with intuitive controls
- Query history for tracking past interactions
- Light/dark mode toggle for user preference

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **APIs**: Web Speech API, OpenAI API
- **Database**: MongoDB (simulated for demo)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- OpenAI API key (for production use)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/voice2query.git
cd voice2query
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key
```

### Running the Application

1. Start both the frontend and backend servers:

```bash
npm run dev:full
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Usage

1. Click the "Record" button to start voice input
2. Speak your query in natural language
3. Alternatively, type your query in the text area
4. Click "Generate SQL" to convert your query
5. View the generated SQL and query results
6. Access your query history using the history button

## Example Queries

Try these sample queries:

- "Show me all customers from California"
- "Find orders with amounts greater than $1000"
- "List all products in the Electronics category"
- "Count the number of completed orders by customer"