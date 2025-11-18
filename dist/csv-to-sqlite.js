"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvToSqliteConverter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const sqlite3_1 = __importDefault(require("sqlite3"));
class CsvToSqliteConverter {
    constructor(dbPath) {
        this.db = new sqlite3_1.default.Database(dbPath);
    }
    async convertCsvToSqlite(csvFilePath, tableName = 'data') {
        try {
            console.log(`Reading CSV file: ${csvFilePath}`);
            const rows = await this.parseCsv(csvFilePath);
            if (rows.length === 0) {
                throw new Error('CSV file is empty or invalid');
            }
            console.log(`Found ${rows.length} rows in CSV`);
            const columns = this.inferSchema(rows);
            console.log('Inferred schema:', columns);
            await this.createTable(tableName, columns);
            await this.insertData(tableName, rows, columns);
            console.log(`Successfully converted CSV to SQLite table: ${tableName}`);
        }
        catch (error) {
            console.error('Error converting CSV to SQLite:', error);
            throw error;
        }
    }
    parseCsv(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            fs_1.default.createReadStream(filePath)
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    }
    inferSchema(rows) {
        if (rows.length === 0)
            return [];
        const sampleRow = rows[0];
        const columns = [];
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
    inferColumnType(values) {
        if (values.length === 0)
            return 'TEXT';
        const isInteger = values.every(val => /^-?\d+$/.test(val));
        if (isInteger)
            return 'INTEGER';
        const isReal = values.every(val => /^-?\d*\.?\d+$/.test(val));
        if (isReal)
            return 'REAL';
        return 'TEXT';
    }
    sanitizeColumnName(name) {
        return name
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^[^a-zA-Z_]/, '_')
            .toLowerCase();
    }
    createTable(tableName, columns) {
        return new Promise((resolve, reject) => {
            const columnDefs = columns.map(col => `${col.name} ${col.type}`).join(', ');
            const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;
            this.db.run(sql, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    insertData(tableName, rows, columns) {
        return new Promise((resolve, reject) => {
            const columnNames = columns.map(col => col.name).join(', ');
            const placeholders = columns.map(() => '?').join(', ');
            const sql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
            const stmt = this.db.prepare(sql);
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                let completed = 0;
                const total = rows.length;
                rows.forEach((row, index) => {
                    const values = columns.map(col => {
                        const originalKey = Object.keys(row).find(key => this.sanitizeColumnName(key) === col.name);
                        return originalKey ? row[originalKey] : null;
                    });
                    stmt.run(values, (err) => {
                        if (err) {
                            console.error(`Error inserting row ${index}:`, err);
                        }
                        completed++;
                        if (completed === total) {
                            this.db.run('COMMIT', (commitErr) => {
                                stmt.finalize();
                                if (commitErr)
                                    reject(commitErr);
                                else
                                    resolve();
                            });
                        }
                    });
                });
            });
        });
    }
    close() {
        this.db.close();
    }
}
exports.CsvToSqliteConverter = CsvToSqliteConverter;
async function main() {
    const csvFilePath = process.argv[2];
    const outputPath = process.argv[3] || './data/database.sqlite';
    const tableName = process.argv[4] || 'control_m_data';
    if (!csvFilePath) {
        console.error('Usage: npm run convert-csv <csv-file-path> [output-db-path] [table-name]');
        process.exit(1);
    }
    if (!fs_1.default.existsSync(csvFilePath)) {
        console.error(`CSV file not found: ${csvFilePath}`);
        process.exit(1);
    }
    const outputDir = path_1.default.dirname(outputPath);
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    const converter = new CsvToSqliteConverter(outputPath);
    try {
        await converter.convertCsvToSqlite(csvFilePath, tableName);
        console.log(`Database created at: ${outputPath}`);
    }
    catch (error) {
        console.error('Conversion failed:', error);
        process.exit(1);
    }
    finally {
        converter.close();
    }
}
if (require.main === module) {
    main();
}
