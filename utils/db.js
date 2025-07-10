import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'nutrient_data.db');
const db = new Database(dbPath);

// 테이블 생성 (없으면)
db.exec(`
CREATE TABLE IF NOT EXISTS samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  analysis TEXT,
  date TEXT,
  EC REAL,
  pH REAL,
  NH4 REAL,
  NO3 REAL,
  PO4 REAL,
  K REAL,
  Ca REAL,
  Mg REAL,
  SO4 REAL,
  Cl REAL,
  Na REAL,
  HCO3 REAL,
  Fe REAL,
  Mn REAL,
  B REAL,
  Zn REAL,
  Cu REAL,
  Mo REAL
);
`);

export default db; 