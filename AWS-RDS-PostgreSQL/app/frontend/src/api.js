const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

export const api = {
  getCompanies: () => request('/companies'),

  createCompany: (name) => request('/companies', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),

  deleteCompany: (id) => request(`/companies/${id}`, { method: 'DELETE' }),

  getProducts: () => request('/products'),

  getProductsWithCompany: () => request('/products/with-company'),

  createProduct: (name, company_id) => request('/products', {
    method: 'POST',
    body: JSON.stringify({ name, company_id }),
  }),

  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
};
