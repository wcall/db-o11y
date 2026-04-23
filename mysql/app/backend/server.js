import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import companiesRouter from './routes/companies.js';
import employeesRouter from './routes/employees.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/companies', companiesRouter);
app.use('/api/employees', employeesRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error(
      '[db] Access denied: set DB_USER and DB_PASSWORD in app/backend/.env to match your MySQL Docker credentials.'
    );
  }
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
