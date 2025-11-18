# Control-M Viewer

A pure client-side SQLite database viewer built with sql.js for viewing Control-M data converted from CSV files.

## Features

- **Pure Client-Side**: No server required - can be hosted statically
- **Drag & Drop Support**: Simply drop your SQLite database file to view
- **Interactive Table**: Sort, filter, and paginate through your data
- **CSV to SQLite Conversion**: Built-in tool to convert CSV files to SQLite databases
- **Responsive Design**: Works on desktop and mobile devices
- **Automatic Schema Inference**: Headers are automatically detected from CSV files

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

```bash
git clone <repository-url>
cd control-m-viewer
npm install
```

### Usage

#### Convert CSV to SQLite

```bash
npm run convert-csv path/to/your/data.csv [output-db.sqlite] [table-name]
```

Example:
```bash
npm run convert-csv data/control-m-data.csv data/database.sqlite controlm_jobs
```

#### Development

```bash
npm run dev
```

This will open `public/index.html` in your default browser.

#### Build for Production

```bash
npm run build
```

#### View Data

1. Open `public/index.html` in your browser
2. Drag and drop your SQLite database file onto the page
3. Browse your data with sorting, filtering, and pagination

## Project Structure

```
├── src/
│   └── csv-to-sqlite.ts    # CSV to SQLite converter script
├── public/
│   └── index.html          # Main viewer with sql.js integration
├── data/
│   └── database.sqlite     # Generated SQLite database
├── package.json
└── README.md
```

## Available Scripts

- `npm run build` - Build the project
- `npm run convert-csv <csv-file> [output-db] [table-name]` - Convert CSV to SQLite
- `npm run dev` - Start development server
- `npm run lint` - Run linter
- `npm test` - Run tests
- `npm test -- --testNamePattern="test-name"` - Run specific test

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **sql.js** - SQLite compiled to WebAssembly
- **HTML5/CSS3/JavaScript** - Modern web standards

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
