<template>
  <div class="app-container">
    <!-- Header/Navigation Bar -->
    <header class="app-header">
      <div class="header-main">
        <div class="logo-area">
          <span class="logo-icon">🇧🇪</span>
          <div class="logo-text">
            <h1>KBO/CBE Codes</h1>
            <p>Belgian Enterprise Taxonomy Explorer</p>
          </div>
        </div>

        <!-- Global Search Bar -->
        <div class="search-container" ref="searchRef">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search by code or description (NL/FR/DE)..." 
              class="global-search-input"
              @focus="isSearchFocused = true"
            />
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''" 
              class="clear-search-btn"
            >
              ✕
            </button>
          </div>

          <!-- Search Results Dropdown -->
          <div 
            v-if="isSearchFocused && searchQuery && searchResults.length > 0" 
            class="search-results-dropdown"
          >
            <div class="search-results-header">
              Found {{ searchResults.length }} matching codes
            </div>
            <div class="search-results-list">
              <button 
                v-for="node in searchResults.slice(0, 100)" 
                :key="node.category + '-' + node.code"
                class="search-result-item"
                @click="selectSearchResult(node)"
              >
                <div class="result-top">
                  <span class="result-code font-mono">{{ node.code }}</span>
                  <span class="category-badge mini" :class="node.category.toLowerCase()">
                    {{ node.category }}
                  </span>
                </div>
                <div class="result-desc">
                  {{ node.descriptions[activeLang] || node.descriptions.NL }}
                </div>
                <div class="result-path">
                  <span v-for="(pathNode, idx) in node.path" :key="pathNode.code">
                    {{ pathNode.code }}<span v-if="idx < node.path.length - 1"> › </span>
                  </span>
                </div>
              </button>
              <div v-if="searchResults.length > 100" class="search-results-footer">
                Showing top 100 results. Please refine your query for more.
              </div>
            </div>
          </div>
          <div 
            v-else-if="isSearchFocused && searchQuery && searchResults.length === 0" 
            class="search-results-dropdown empty"
          >
            No matches found for "{{ searchQuery }}"
          </div>
        </div>

        <!-- Global Actions (Language, Theme) -->
        <div class="header-actions">
          <!-- Language Toggle -->
          <div class="lang-selector">
            <button 
              v-for="lang in ['NL', 'FR', 'DE']" 
              :key="lang"
              class="lang-btn"
              :class="{ active: activeLang === lang }"
              @click="activeLang = lang"
              :title="'Switch description language to ' + lang"
            >
              <span class="flag-img">{{ getLangFlag(lang) }}</span>
              <span class="lang-text">{{ lang }}</span>
            </button>
          </div>

          <!-- Theme Toggle -->
          <button @click="toggleTheme" class="theme-toggle-btn" title="Toggle color theme">
            {{ theme === 'dark' ? '☀️' : '🌙' }}
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="app-nav">
        <button 
          class="nav-tab" 
          :class="{ active: activeTab === 'explorer' }"
          @click="activeTab = 'explorer'"
        >
          📂 Browser Explorer
        </button>
        <button 
          class="nav-tab" 
          :class="{ active: activeTab === 'dashboard' }"
          @click="activeTab = 'dashboard'"
        >
          📊 Taxonomy Overview
        </button>
        <button 
          class="nav-tab" 
          :class="{ active: activeTab === 'downloads' }"
          @click="activeTab = 'downloads'"
        >
          📥 Downloads
        </button>
      </nav>
    </header>

    <!-- Main Content Area -->
    <main class="app-main-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading Belgian KBO database codes...</p>
      </div>

      <!-- Main Router Views (Tabs) -->
      <div v-else class="tab-content">
        <!-- Explorer Tab -->
        <div v-if="activeTab === 'explorer'" class="explorer-layout">
          <div class="browser-col">
            <MillerColumns 
              :categories="taxonomy.categories"
              :categoryRoots="taxonomy.categoryRoots"
              :activeLang="activeLang"
              :selectedNode="selectedNode"
              @select-node="handleSelectNode"
              @select-category="handleSelectCategory"
            />
          </div>
          <div class="details-col">
            <DetailsPanel 
              :node="selectedNode"
              :activeLang="activeLang"
              @select-node="handleSelectNode"
            />
          </div>
        </div>

        <!-- Dashboard Tab -->
        <Dashboard 
          v-else-if="activeTab === 'dashboard'" 
          :categories="taxonomy.categories"
        />

        <!-- Downloads Tab -->
        <div v-else-if="activeTab === 'downloads'" class="downloads-page">
          <div class="downloads-container">
            <h2>Data Downloads</h2>
            <p class="subtitle">Download parts or the entirety of the Belgian enterprise classification code system.</p>
            
            <div class="downloads-grid">
              <!-- Full CSV card -->
              <div class="download-card">
                <div class="card-icon">📄</div>
                <h3>Original CSV Dataset</h3>
                <p>Download the unmodified source `code.csv` containing all 14 categories and 21,470 entries in NL, FR, and DE.</p>
                <a :href="`${baseUrl}code.csv`" download="code.csv" class="download-link-btn">
                  Download code.csv (1.94 MB)
                </a>
              </div>

              <!-- Full JSON card -->
              <div class="download-card">
                <div class="card-icon">📦</div>
                <h3>Unified JSON Dataset</h3>
                <p>Download the fully structured hierarchical taxonomy. All languages are merged into a single nested object model.</p>
                <button @click="downloadFullJSON" class="download-link-btn primary">
                  Generate & Download JSON
                </button>
              </div>

              <!-- Category specific JSON card -->
              <div class="download-card full-width">
                <div class="card-icon">⚡</div>
                <h3>Export Specific Categories</h3>
                <p>Select any individual category to generate and download its specific structured JSON file.</p>
                
                <div class="category-download-actions">
                  <div 
                    v-for="cat in Object.keys(taxonomy.categories).sort()" 
                    :key="cat"
                    class="category-download-row"
                  >
                    <span class="category-badge" :class="cat.toLowerCase()">{{ cat }}</span>
                    <span class="code-count-pill">{{ Object.keys(taxonomy.categories[cat]).length }} codes</span>
                    <button @click="downloadCategoryJSON(cat)" class="btn-mini">
                      Download JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <p>Data source: Belgian Crossroads Bank for Enterprises (KBO/CBE). Built with Vue 3 & Vite.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { loadTaxonomy, searchTaxonomy } from './utils/taxonomy';
import MillerColumns from './components/MillerColumns.vue';
import DetailsPanel from './components/DetailsPanel.vue';
import Dashboard from './components/Dashboard.vue';

const loading = ref(true);
const taxonomy = ref({ categories: {}, categoryRoots: {}, allCodes: [] });
const selectedNode = ref(null);
const activeCategory = ref(null);
const activeLang = ref('NL'); // Default to Dutch
const activeTab = ref('explorer');
const searchQuery = ref('');
const isSearchFocused = ref(false);
const searchRef = ref(null);
const theme = ref('light');
const baseUrl = import.meta.env.BASE_URL;

// Fetch and load taxonomy database
onMounted(async () => {
  try {
    taxonomy.value = await loadTaxonomy();
    // Default select first category roots if any
    const firstCat = Object.keys(taxonomy.value.categories).sort()[0];
    activeCategory.value = firstCat;
  } catch (error) {
    console.error('Error loading taxonomy database:', error);
  } finally {
    loading.value = false;
  }

  // Restore theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    theme.value = savedTheme;
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme.value = 'dark';
  }
  applyTheme();

  // Close search results on click outside
  document.addEventListener('click', handleClickOutside);
});

// Watch and apply theme changes
watch(theme, () => {
  applyTheme();
  localStorage.setItem('theme', theme.value);
});

// Compute matching search results
const searchResults = computed(() => {
  return searchTaxonomy(taxonomy.value.categories, searchQuery.value);
});

function handleSelectNode(node) {
  selectedNode.value = node;
}

function handleSelectCategory(catName) {
  activeCategory.value = catName;
  selectedNode.value = null;
}

function selectSearchResult(node) {
  selectedNode.value = node;
  activeCategory.value = node.category;
  searchQuery.value = '';
  isSearchFocused.value = false;
  activeTab.value = 'explorer';
}

function getLangFlag(lang) {
  switch (lang) {
    case 'NL': return '🇳🇱';
    case 'FR': return '🇫🇷';
    case 'DE': return '🇩🇪';
    default: return '🏳️';
  }
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

function applyTheme() {
  const root = document.documentElement;
  root.className = '';
  root.classList.add(`theme-${theme.value}`);
}

function handleClickOutside(event) {
  if (searchRef.value && !searchRef.value.contains(event.target)) {
    isSearchFocused.value = false;
  }
}

// Download dynamic full JSON file
function downloadFullJSON() {
  const categoriesData = {};
  for (const catName in taxonomy.value.categories) {
    categoriesData[catName] = {};
    for (const code in taxonomy.value.categories[catName]) {
      const node = taxonomy.value.categories[catName][code];
      categoriesData[catName][code] = {
        code: node.code,
        parentCode: node.parentCode,
        descriptions: node.descriptions
      };
    }
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(categoriesData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "kbo_taxonomy_all.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Download category specific JSON
function downloadCategoryJSON(categoryName) {
  const catMap = taxonomy.value.categories[categoryName];
  if (!catMap) return;

  const cleanCat = {};
  for (const code in catMap) {
    cleanCat[code] = {
      code: catMap[code].code,
      parentCode: catMap[code].parentCode,
      descriptions: catMap[code].descriptions
    };
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanCat, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `kbo_taxonomy_${categoryName}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
</script>

<style>
/* Layout Variables */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Header */
.app-header {
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  gap: 1.5rem;
}

@media (max-width: 800px) {
  .header-main {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1rem;
  }
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 2rem;
}

.logo-text h1 {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1.1;
  margin: 0;
  letter-spacing: -0.01em;
}

.logo-text p {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  margin: 0;
}

/* Search bar */
.search-container {
  position: relative;
  flex-grow: 1;
  max-width: 600px;
}

@media (max-width: 800px) {
  .search-container {
    max-width: 100%;
  }
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.85rem;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.global-search-input {
  width: 100%;
  padding: 0.65rem 1rem 0.65rem 2.25rem;
  font-size: 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-bg-body);
  color: var(--color-text-primary);
  outline: none;
  transition: all 0.2s;
}

.global-search-input:focus {
  border-color: var(--color-primary);
  background: var(--color-bg-card);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
}

.clear-search-btn {
  position: absolute;
  right: 0.85rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.clear-search-btn:hover {
  color: var(--color-text-primary);
}

/* Search results dropdown */
.search-results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-top: 0.5rem;
  box-shadow: var(--shadow-lg);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.search-results-dropdown.empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.search-results-header {
  padding: 0.6rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  background: var(--color-bg-body);
  border-bottom: 1px solid var(--color-border);
}

.search-results-list {
  display: flex;
  flex-direction: column;
}

.search-result-item {
  display: flex;
  flex-direction: column;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: var(--color-bg-body);
}

.result-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.result-code {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary);
}

.mini {
  transform: scale(0.85);
  transform-origin: left center;
}

.result-desc {
  font-size: 0.85rem;
  color: var(--color-text-primary);
  font-weight: 500;
  line-height: 1.3;
}

.result-path {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  margin-top: 0.2rem;
}

.search-results-footer {
  padding: 0.6rem 1rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
  background: var(--color-bg-body);
  border-top: 1px solid var(--color-border);
}

/* Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

@media (max-width: 800px) {
  .header-actions {
    justify-content: space-between;
  }
}

.lang-selector {
  display: flex;
  background: var(--color-bg-body);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 0.15rem;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 17px;
  color: var(--color-text-secondary);
  transition: all 0.15s;
}

.lang-btn.active {
  background: var(--color-bg-card);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.theme-toggle-btn {
  background: var(--color-bg-body);
  border: 1px solid var(--color-border);
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.15s;
}

.theme-toggle-btn:hover {
  background: var(--color-border);
}

/* Nav tabs */
.app-nav {
  display: flex;
  padding: 0 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  gap: 1.5rem;
}

.nav-tab {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.75rem 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.nav-tab:hover {
  color: var(--color-text-primary);
}

.nav-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* Main content */
.app-main-content {
  flex-grow: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10rem 1.5rem;
  color: var(--color-text-secondary);
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Explorer Layout */
.explorer-layout {
  display: grid;
  grid-template-columns: 2.2fr 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
}

@media (max-width: 1100px) {
  .explorer-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

/* Downloads tab design */
.downloads-page {
  padding: 2rem 1.5rem;
}

.downloads-container {
  max-width: 900px;
  margin: 0 auto;
}

.downloads-container h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.downloads-container .subtitle {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.downloads-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 700px) {
  .downloads-grid {
    grid-template-columns: 1fr;
  }
}

.download-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.download-card.full-width {
  grid-column: span 2;
}

@media (max-width: 700px) {
  .download-card.full-width {
    grid-column: span 1;
  }
}

.card-icon {
  font-size: 2rem;
}

.download-card h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 0.25rem;
}

.download-card p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: auto;
}

.download-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none !important;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  text-align: center;
  transition: all 0.15s;
}

.download-link-btn:hover {
  background: var(--color-bg-body);
  border-color: var(--color-text-secondary);
}

.download-link-btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.download-link-btn.primary:hover {
  opacity: 0.9;
}

/* Category downloads list */
.category-download-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

@media (max-width: 600px) {
  .category-download-actions {
    grid-template-columns: 1fr;
  }
}

.category-download-row {
  display: flex;
  align-items: center;
  background: var(--color-bg-body);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
}

.code-count-pill {
  font-size: 0.7rem;
  background: var(--color-border);
  color: var(--color-text-secondary);
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  margin-left: auto;
}

.btn-mini {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-mini:hover {
  background: var(--color-border);
}

/* Footer */
.app-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  background: var(--color-bg-card);
  margin-top: auto;
}

/* Helper Utilities */
.font-mono {
  font-family: var(--font-mono);
}
</style>
