import { useState } from 'react';
import InsertPage from './pages/InsertPage.jsx';
import QueryPage from './pages/QueryPage.jsx';

const nav = {
  display: 'flex', alignItems: 'center', gap: '0.75rem',
  padding: '0.875rem 2rem', background: '#1a1a2e',
};
const title = { color: '#fff', fontWeight: 'bold', marginRight: 'auto' };
const btn = (active) => ({
  padding: '0.45rem 1.1rem', border: 'none', borderRadius: '4px',
  cursor: 'pointer', fontWeight: active ? '600' : '400',
  background: active ? '#e94560' : '#16213e', color: '#fff',
});

export default function App() {
  const [page, setPage] = useState('insert');
  return (
    <>
      <nav style={nav}>
        <span style={title}>wcall MySQL</span>
        <button style={btn(page === 'insert')} onClick={() => setPage('insert')}>Insert</button>
        <button style={btn(page === 'query')} onClick={() => setPage('query')}>Query</button>
      </nav>
      <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
        {page === 'insert' ? <InsertPage /> : <QueryPage />}
      </main>
    </>
  );
}
