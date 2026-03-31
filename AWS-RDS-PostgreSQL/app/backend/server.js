import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import companiesRouter from './routes/companies.js';
import productsRouter from './routes/products.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/companies', companiesRouter);
app.use('/api/products', productsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === '28P01') {
    console.error(
      '[db] Password authentication failed: set DB_USER and DB_PASSWORD in app/backend/.env to the RDS master username/password from Terraform (same as terraform.tfvars / tfvars).'
    );
  }
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
