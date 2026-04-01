import { useState, useEffect } from 'react';
import { api } from '../api.js';

const card = { background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '1.5rem' };
const input = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', fontSize: '0.9rem' };
const btn = { padding: '0.5rem 1.25rem', background: '#e94560', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' };
const form = { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' };
const msg = (isErr) => ({ marginTop: '0.75rem', fontSize: '0.875rem', color: isErr ? '#dc2626' : '#16a34a' });

function CompanyForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const c = await api.createCompany(name);
      setStatus({ ok: true, text: `Created "${c.companyname}" (id: ${c.companyid})` });
      setName('');
      onSuccess();
    } catch (err) {
      setStatus({ ok: false, text: `Error: ${err.message}` });
    }
  }

  return (
    <div style={card}>
      <h2>Add Company</h2>
      <form style={form} onSubmit={handleSubmit}>
        <input style={input} placeholder="Company name" value={name} onChange={e => setName(e.target.value)} required />
        <div><button style={btn} type="submit">Insert Company</button></div>
      </form>
      {status && <p style={msg(!status.ok)}>{status.text}</p>}
    </div>
  );
}

function ProductForm({ companies }) {
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const p = await api.createProduct(name, companyId);
      setStatus({ ok: true, text: `Created "${p.productname}" (id: ${p.productid})` });
      setName('');
    } catch (err) {
      setStatus({ ok: false, text: `Error: ${err.message}` });
    }
  }

  return (
    <div style={card}>
      <h2>Add Product</h2>
      <form style={form} onSubmit={handleSubmit}>
        <input style={input} placeholder="Product name" value={name} onChange={e => setName(e.target.value)} required />
        <select style={input} value={companyId} onChange={e => setCompanyId(e.target.value)} required>
          <option value="">Select company</option>
          {companies.map(c => <option key={c.companyid} value={c.companyid}>{c.companyname}</option>)}
        </select>
        <div><button style={btn} type="submit">Insert Product</button></div>
      </form>
      {status && <p style={msg(!status.ok)}>{status.text}</p>}
    </div>
  );
}

export default function InsertPage() {
  const [companies, setCompanies] = useState([]);

  async function loadCompanies() {
    try { setCompanies(await api.getCompanies()); } catch {}
  }

  useEffect(() => { loadCompanies(); }, []);

  return (
    <>
      <CompanyForm onSuccess={loadCompanies} />
      <ProductForm companies={companies} />
    </>
  );
}
