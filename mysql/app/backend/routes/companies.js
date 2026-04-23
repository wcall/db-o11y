import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT companyid, companyname FROM company ORDER BY companyid'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO company (companyname) VALUES (?)',
      [name]
    );
    res.status(201).json({ companyid: result.insertId, companyname: name });
  } catch (err) { next(err); }
});

// Deletes all k6 test companies and their employees (FK order)
router.delete('/cleanup', async (_req, res, next) => {
  try {
    await pool.query("DELETE FROM employee WHERE employeename LIKE 'k6-%'");
    const [result] = await pool.query("DELETE FROM company WHERE companyname LIKE 'k6-%'");
    res.json({ deleted: result.affectedRows });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM company WHERE companyid = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
