import { Router } from 'express';
import pool from '../db.js';
import { traceDbAction } from '../tracing.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await traceDbAction(
      'db.query product.list',
      { 'db.operation': 'SELECT', 'db.sql.table': 'wcall.product' },
      () => pool.query('SELECT productid, productname, companyid FROM wcall.product ORDER BY productid')
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// JOIN query — products enriched with company name
router.get('/with-company', async (_req, res, next) => {
  try {
    const { rows } = await traceDbAction(
      'db.query product.with_company',
      { 'db.operation': 'SELECT', 'db.sql.table': 'wcall.product,wcall.company' },
      () => pool.query(`
        SELECT p.productid, p.productname, c.companyid, c.companyname
        FROM wcall.product p
        JOIN wcall.company c ON p.companyid = c.companyid
        ORDER BY c.companyname, p.productname
      `)
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { name, company_id } = req.body;
  if (!name || !company_id) return res.status(400).json({ error: 'name and company_id are required' });
  try {
    const { rows } = await traceDbAction(
      'db.insert product',
      { 'db.operation': 'INSERT', 'db.sql.table': 'wcall.product' },
      () => pool.query(
        'INSERT INTO wcall.product (productname, companyid) VALUES ($1, $2) RETURNING productid, productname, companyid',
        [name, company_id]
      )
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Deletes all k6 test products only
router.delete('/cleanup', async (_req, res, next) => {
  try {
    const { rowCount } = await traceDbAction(
      'db.delete product.cleanup',
      { 'db.operation': 'DELETE', 'db.sql.table': 'wcall.product' },
      () => pool.query("DELETE FROM wcall.product WHERE productname LIKE 'k6-%'")
    );
    res.json({ deleted: rowCount });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await traceDbAction(
      'db.delete product',
      { 'db.operation': 'DELETE', 'db.sql.table': 'wcall.product' },
      () => pool.query('DELETE FROM wcall.product WHERE productid = $1', [req.params.id])
    );
    if (rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
