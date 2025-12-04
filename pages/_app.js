// pages/index.js
import { useState, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import fetchNode from 'node-fetch';

const DATA_PATH = path.join(process.cwd(), 'data', 'pings.json');

// Helper functions
const readPings = () => {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH));
};

const writePings = (pings) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(pings, null, 2));
};

// API handler (in-page API route)
export async function getServerSideProps({ req, res }) {
  if (req.method === 'POST') {
    const body = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(JSON.parse(data)));
    });

    const { url } = body;
    let status;
    try {
      const response = await fetchNode(url, { method: 'GET' });
      status = response.status;
    } catch {
      status = 'ERROR';
    }

    const ping = { url, status, timestamp: new Date().toISOString() };
    const pings = [ping, ...readPings()];
    writePings(pings);

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(ping));
    return { props: {} };
  }

  return { props: {} };
}

// Frontend UI
export default function Home() {
  const [url, setUrl] = useState('');
  const [pings, setPings] = useState([]);

  const fetchPings = async () => {
    const res = await fetch('/api/pings');
    const data = await res.json();
    setPings(data);
  };

  const addPing = async (e) => {
    e.preventDefault();
    if (!url) return;

    await fetch('/api/pings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    setUrl('');
    fetchPings();
  };

  useEffect(() => {
    fetchPings();
    const interval = setInterval(fetchPings, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Ping Monitor</h1>
      <form onSubmit={addPing} style={{ marginBottom: '1rem' }}>
        <input
          type="url"
          value={url}
          placeholder="Enter URL to ping"
          onChange={(e) => setUrl(e.target.value)}
          required
          style={{ width: '300px', marginRight: '1rem' }}
        />
        <button type="submit">Ping</button>
      </form>

      <table border="1" cellPadding="5" style={{ width: '100%', textAlign: 'left' }}>
        <thead>
          <tr>
            <th>URL</th>
            <th>Status</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {pings.map((ping, idx) => (
            <tr key={idx}>
              <td>{ping.url}</td>
              <td>{ping.status}</td>
              <td>{new Date(ping.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}