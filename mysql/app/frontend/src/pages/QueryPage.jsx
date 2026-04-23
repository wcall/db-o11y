import { useState, useEffect } from 'react';
import { api } from '../api.js';

const card = { background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '1.5rem' };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' };
const th = { padding: '0.6rem 1rem', background: '#1a1a2e', color: '#fff', textAlign: 'left', fontWeight: '500' };
const td = { padding: '0.6rem 1rem', borderBottom: '1px solid #f0f0f0' };
const refreshBtn = { padding: '0.45rem 1.1rem', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' };

function CompaniesTable({ rows }) {
  return (
    <div style={card}>
      <h2>Companies ({rows.length})</h2>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.companyid}>
              <td style={td}>{r.companyid}</td>
              <td style={td}>{r.companyname}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeesTable({ rows }) {
  return (
    <div style={card}>
      <h2>Employees with Company — JOIN ({rows.length})</h2>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Employee ID</th>
            <th style={th}>Employee</th>
            <th style={th}>Salary</th>
            <th style={th}>Company</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.employeeid}>
              <td style={td}>{r.employeeid}</td>
              <td style={td}>{r.employeename}</td>
              <td style={td}>{r.salary != null ? `$${Number(r.salary).toLocaleString()}` : '—'}</td>
              <td style={td}>{r.companyname}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function QueryPage() {
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);

  async function load() {
    try {
      const [c, e] = await Promise.all([
        api.getCompanies(),
        api.getEmployeesWithCompany(),
      ]);
      setCompanies(c);
      setEmployees(e);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  return (
    <>
      <CompaniesTable rows={companies} />
      <EmployeesTable rows={employees} />
      <button style={refreshBtn} onClick={load}>Refresh</button>
    </>
  );
}
