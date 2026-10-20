const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// ---- Table / column names (change here only if the naming must differ) ----
const T = 'NapatSub_Employ';
const C = {
  id: 'NapatSub_ID_Employ',
  name: 'NapatSub_Name_Employ',
  position: 'NapatSub_Position_Employ',
  status: 'NapatSub_Status_Employ',
  salary: 'NapatSub_Salary_Employ',
};

// Convert a DB row -> API JSON format required by the exam
const toApi = (r) => ({
  id: String(r[C.id]),
  name: r[C.name],
  position: r[C.position],
  status: r[C.status],
  salary: Number(r[C.salary]),
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${T} (
      ${C.id} INT AUTO_INCREMENT PRIMARY KEY,
      ${C.name} VARCHAR(100) NOT NULL,
      ${C.position} VARCHAR(100) NOT NULL,
      ${C.status} ENUM('Active','On Leave') NOT NULL DEFAULT 'Active',
      ${C.salary} DECIMAL(12,2) NOT NULL
    )`);

  const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM ${T}`);
  if (n === 0) {
    const seed = [
      ['John Doe', 'Software Engineer', 'Active', 45000],
      ['Jane Smith', 'HR Officer', 'Active', 18000],
      ['Somchai Dee', 'Intern', 'On Leave', 15000],
      ['Mary Lee', 'Senior Engineer', 'Active', 48000],
      ['Peter Pan', 'CTO', 'Active', 90000],
      ['Anna Kim', 'Product Manager', 'Active', 80000],
      ['Ken Wong', 'Accountant', 'On Leave', 22000],
    ];
    await pool.query(
      `INSERT INTO ${T} (${C.name}, ${C.position}, ${C.status}, ${C.salary}) VALUES ?`,
      [seed]
    );
    console.log('Seeded mock employees');
  }
}

module.exports = { pool, T, C, toApi, initDb };
