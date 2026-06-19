# 🇧🇪 KBO/CBE Codes Taxonomy Explorer

An interactive, responsive web-based taxonomy explorer for the Belgian **Crossroads Bank for Enterprises (KBO/CBE)** activity and classification codes. 

Inspired by the Shopify Product Taxonomy Explorer, this application provides an intuitive Miller Columns (Finder-like) interface to browse, search, analyze, and export Belgian classification codes.

## ✨ Features

- 📂 **Miller Columns Browser**: Drill down dynamically through hierarchical categories (such as NACE 2003, NACE 2008, NACE 2025) with smooth horizontal scrolling.
- 🔍 **Fuzzy Global Search**: Instant search by code or description in any supported language with rank-based relevance.
- 🇳🇱 🇫🇷 🇩🇪 **Multi-Language Support**: Instantly toggle taxonomy translations between Dutch (NL), French (FR), and German (DE).
- 📊 **Taxonomy Overview Dashboard**: Analytical overview detailing code distribution across categories, language completeness stats, and a full folder index.
- 📥 **Flexible Exporters**: Download the full dataset or export specific branches and subtrees to JSON or CSV format directly in the browser.
- 🌙 **Dark/Light Mode**: Full theme customization reflecting system preferences.
- 🚀 **GitHub Pages Deployment**: Pre-configured GitHub Actions workflow for zero-config CI/CD.

## 🛠️ Tech Stack

- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (Custom properties, dark mode tokens, micro-animations)
- **Deployment**: GitHub Actions

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173/](http://localhost:5173/) in your browser.

3. Build the project for production:
   ```bash
   npm run build
   ```
   The built output will be generated inside the `dist/` directory.

## 📁 Project Structure

- `code.csv`: The primary database file parsed at runtime.
- `src/utils/taxonomy.js`: Parsing engine and prefix-based parent-child tree constructor.
- `src/components/MillerColumns.vue`: Column layout browser with horizontal scrolling and index filters.
- `src/components/DetailsPanel.vue`: Side pane showing translations, clickable path breadcrumbs, direct children/siblings, and export utilities.
- `src/components/Dashboard.vue`: Charts and statistics overview page.
- `src/App.vue`: Coordinator shell managing tabs, global search, language toggles, themes, and downloads.

## ⚖️ Data Source Notice

The taxonomy data compiled in `code.csv` is sourced from the official public data releases of the **Crossroads Bank for Enterprises (KBO/CBE)** / **Kruispuntbank van Ondernemingen (KBO)** / **Banque-Carrefour des Entreprises (BCE)** of Belgium.

## 📝 License

This project is licensed under the [MIT License](LICENSE).
