import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT employeeid, employeename, companyid, salary FROM employee ORDER BY employeeid'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// JOIN query — employees enriched with company name
router.get('/with-company', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.employeeid, e.employeename, e.salary, c.companyid, c.companyname
      FROM employee e
      JOIN company c ON e.companyid = c.companyid
      ORDER BY c.companyname, e.employeename
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { name, company_id, salary } = req.body;
  if (!name || !company_id) return res.status(400).json({ error: 'name and company_id are required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO employee (employeename, companyid, salary) VALUES (?, ?, ?)',
      [name, company_id, salary ?? null]
    );
    res.status(201).json({ employeeid: result.insertId, employeename: name, companyid: company_id, salary: salary ?? null });
  } catch (err) { next(err); }
});

// Deletes all k6 test employees only
router.delete('/cleanup', async (_req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM employee WHERE employeename LIKE 'k6-%'");
    res.json({ deleted: result.affectedRows });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM employee WHERE employeeid = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
