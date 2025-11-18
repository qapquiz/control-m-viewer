# Control-M Viewer - Agent Guidelines

## Build Commands
- Build: `npm run build`
- Convert CSV to SQLite: `npm run convert-csv <csv-file> [output-db] [table-name]`
- Development: `npm run dev` (opens public/index.html)
- Lint: `npm run lint` (configure linter in package.json)
- Test: `npm test` (configure test runner in package.json)
- Single test: `npm test -- --testNamePattern="test-name"`

## Project Structure
```
src/csv-to-sqlite.ts    # CSV to SQLite converter script
public/index.html       # Main viewer with sql.js integration
data/database.sqlite    # Generated SQLite database
```

## Code Style Guidelines
- Use TypeScript for type safety
- Import order: external libraries → internal modules → relative imports
- Use camelCase for variables and functions, PascalCase for classes/types
- Handle errors with try/catch blocks and proper error types
- Add JSDoc comments for public APIs
- Follow ESLint/Prettier configuration (to be added)
- Keep functions small and focused on single responsibility
- Use meaningful variable and function names

## Key Features
- Pure client-side SQLite viewer using sql.js
- Drag & drop database file support
- Responsive table with sorting, filtering, and pagination
- Automatic schema inference from CSV headers
- No server required - can be hosted statically