import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT companyid, companyname FROM wcall.company ORDER BY companyid'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO wcall.company (companyname) VALUES ($1) RETURNING companyid, companyname',
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Deletes all k6 test companies and their products (FK order)
router.delete('/cleanup', async (_req, res, next) => {
  try {
    await pool.query("DELETE FROM wcall.product WHERE productname LIKE 'k6-%'");
    const { rowCount } = await pool.query("DELETE FROM wcall.company WHERE companyname LIKE 'k6-%'");
    res.json({ deleted: rowCount });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM wcall.company WHERE companyid = $1',
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
