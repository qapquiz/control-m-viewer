import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

interface CsvRow {
  [key: string]: string;
}

interface ColumnInfo {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB';
}

class CsvToSqliteConverter {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  async convertCsvToSqlite(csvFilePath: string, tableName: string = 'data'): Promise<void> {
    try {
      console.log(`Reading CSV file: ${csvFilePath}`);
      
      const rows: CsvRow[] = await this.parseCsv(csvFilePath);
      if (rows.length === 0) {
        throw new Error('CSV file is empty or invalid');
      }

      console.log(`Found ${rows.length} rows in CSV`);

      const columns = this.inferSchema(rows);
      console.log('Inferred schema:', columns);

      await this.createTable(tableName, columns);
      await this.insertData(tableName, rows, columns);

      console.log(`Successfully converted CSV to SQLite table: ${tableName}`);
    } catch (error) {
      console.error('Error converting CSV to SQLite:', error);
      throw error;
    }
  }

  private parseCsv(filePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
      const results: CsvRow[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  private inferSchema(rows: CsvRow[]): ColumnInfo[] {
    if (rows.length === 0) return [];

    const sampleRow = rows[0];
    const columns: ColumnInfo[] = [];

    for (const columnName of Object.keys(sampleRow)) {
      const sampleValues = rows.slice(0, 100).map(row => row[columnName]).filter(val => val !== '');
      const type = this.inferColumnType(sampleValues);
      
      columns.push({
        name: this.sanitizeColumnName(columnName),
        type
      });
    }

    return columns;
  }

  private inferColumnType(values: string[]): 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' {
    if (values.length === 0) return 'TEXT';

    const isInteger = values.every(val => /^-?\d+$/.test(val));
    if (isInteger) return 'INTEGER';

    const isReal = values.every(val => /^-?\d*\.?\d+$/.test(val));
    if (isReal) return 'REAL';

    return 'TEXT';
  }

  private sanitizeColumnName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[^a-zA-Z_]/, '_')
      .toLowerCase();
  }

  private createTable(tableName: string, columns: ColumnInfo[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const columnDefs = columns.map(col => `${col.name} ${col.type}`).join(', ');
      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;
      
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private insertData(tableName: string, rows: CsvRow[], columns: ColumnInfo[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const columnNames = columns.map(col => col.name).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

      const stmt = this.db.prepare(sql);
      
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            stmt.finalize();
            return reject(err);
          }
          
          let completed = 0;
          const total = rows.length;
          let hasError = false;

          rows.forEach((row, index) => {
            const values = columns.map(col => {
              const originalKey = Object.keys(row).find(key => 
                this.sanitizeColumnName(key) === col.name
              );
              return originalKey ? row[originalKey] : null;
            });

            stmt.run(values, (err) => {
              if (err) {
                console.error(`Error inserting row ${index}:`, err);
                hasError = true;
              }
              
              completed++;
              if (completed === total) {
                if (hasError) {
                  this.db.run('ROLLBACK');
                  stmt.finalize();
                  return reject(new Error('Some rows failed to insert'));
                }
                
                this.db.run('COMMIT', (commitErr) => {
                  stmt.finalize();
                  if (commitErr) reject(commitErr);
                  else resolve();
                });
              }
            });
          });
        });
      });
    });
  }

  close(): void {
    this.db.close();
  }
}

async function main() {
  const csvFilePath = process.argv[2];
  const outputPath = process.argv[3] || './data/database.sqlite';
  const tableName = process.argv[4] || 'control_m_data';

  if (!csvFilePath) {
    console.error('Usage: npm run convert-csv <csv-file-path> [output-db-path] [table-name]');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const converter = new CsvToSqliteConverter(outputPath);
  
  try {
    await converter.convertCsvToSqlite(csvFilePath, tableName);
    console.log(`Database created at: ${outputPath}`);
  } catch (error) {
    console.error('Conversion failed:', error);
    process.exit(1);
  } finally {
    converter.close();
  }
}

if (require.main === module) {
  main();
}

export { CsvToSqliteConverter };