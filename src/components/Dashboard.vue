<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>Taxonomy Overview</h2>
      <p>Analytical statistics and data metrics of the KBO Crossroads Bank dataset.</p>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-content">
          <h3>{{ Object.keys(categories).length }}</h3>
          <p>Total Categories</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏷️</div>
        <div class="stat-content">
          <h3>{{ totalCodesCount.toLocaleString() }}</h3>
          <p>Unique Codes</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌿</div>
        <div class="stat-content">
          <h3>{{ totalHierarchicalCount.toLocaleString() }}</h3>
          <p>NACE Activities</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌐</div>
        <div class="stat-content">
          <h3>3 Languages</h3>
          <p>NL, FR, & DE Descriptions</p>
        </div>
      </div>
    </div>

    <!-- Main Visualizations Grid -->
    <div class="dashboard-main-grid">
      <!-- Category distribution chart -->
      <div class="dashboard-card chart-card">
        <h3>Code Distribution by Category</h3>
        <div class="distribution-chart">
          <div 
            v-for="cat in sortedCategoryStats" 
            :key="cat.name" 
            class="chart-bar-row"
          >
            <div class="chart-label">
              <span class="category-badge" :class="cat.name.toLowerCase()">{{ cat.name }}</span>
              <span class="count-val">{{ cat.count.toLocaleString() }} codes</span>
            </div>
            <div class="bar-container">
              <div 
                class="bar-fill" 
                :style="{ width: cat.percentage + '%' }"
                :title="cat.name + ': ' + cat.count + ' codes'"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Language coverage metrics -->
      <div class="dashboard-card lang-card">
        <h3>Language Completeness</h3>
        <p class="section-desc">Percentage of codes having descriptions in each official language.</p>
        
        <div class="lang-stats">
          <div class="lang-stat-item">
            <div class="lang-info">
              <span class="flag-icon">🇳🇱</span>
              <span class="lang-name">Dutch (NL)</span>
              <span class="lang-pct">100%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill nl" style="width: 100%"></div></div>
            <p class="lang-count">{{ langCounts.NL.toLocaleString() }} descriptions</p>
          </div>

          <div class="lang-stat-item">
            <div class="lang-info">
              <span class="flag-icon">🇫🇷</span>
              <span class="lang-name">French (FR)</span>
              <span class="lang-pct">100%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill fr" style="width: 100%"></div></div>
            <p class="lang-count">{{ langCounts.FR.toLocaleString() }} descriptions</p>
          </div>

          <div class="lang-stat-item">
            <div class="lang-info">
              <span class="flag-icon">🇩🇪</span>
              <span class="lang-name">German (DE)</span>
              <span class="lang-pct">{{ dePercentage.toFixed(1) }}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill de" :style="{ width: dePercentage + '%' }"></div></div>
            <p class="lang-count">{{ langCounts.DE.toLocaleString() }} descriptions</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Categories Directory Table -->
    <div class="dashboard-card table-card">
      <h3>Taxonomy Directory</h3>
      <div class="table-responsive">
        <table class="directory-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Type</th>
              <th>Description</th>
              <th class="text-right">Code Count</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categoryDirectory" :key="cat.name">
              <td>
                <span class="category-badge" :class="cat.name.toLowerCase()">{{ cat.name }}</span>
              </td>
              <td>
                <span class="type-badge" :class="cat.type">{{ cat.type }}</span>
              </td>
              <td class="cat-description">{{ cat.desc }}</td>
              <td class="text-right font-mono">{{ cat.count.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  categories: {
    type: Object,
    required: true
  }
});

// Category static metadata descriptions
const categoryMeta = {
  Nace2025: { type: 'hierarchical', desc: 'New nomenclature of economic activities in Belgium (2025 version).' },
  Nace2008: { type: 'hierarchical', desc: 'Current nomenclature of economic activities in Belgium (2008 version).' },
  Nace2003: { type: 'hierarchical', desc: 'Older nomenclature of economic activities in Belgium (2003 version).' },
  JuridicalForm: { type: 'flat', desc: 'Legal forms of Belgian enterprises (e.g., NV, BV, VZW, Commanditaire Vennootschap).' },
  JuridicalSituation: { type: 'flat', desc: 'Legal situations and statuses of Belgian companies (e.g., normal, dissolution).' },
  ActivityGroup: { type: 'flat', desc: 'Broad classification grouping of activities.' },
  TypeOfAddress: { type: 'flat', desc: 'Classifications of addresses (headquarters, business units, branches).' },
  TypeOfDenomination: { type: 'flat', desc: 'Classifications of entity names (official, abbreviation, translation).' },
  TypeOfEnterprise: { type: 'flat', desc: 'Types of registered enterprise (natural person or legal entity).' },
  ContactType: { type: 'flat', desc: 'Types of contact details (telephone, email, website).' },
  EntityContact: { type: 'flat', desc: 'Administrative contact entities (enterprise or establishment branch).' },
  Language: { type: 'flat', desc: 'Languages recognized by Belgian administration.' },
  Status: { type: 'flat', desc: 'Operating status of a business (active, inactive).' },
  Classification: { type: 'flat', desc: 'Role of a business activity (principal activity or secondary/auxiliary activity).' }
};

const totalCodesCount = computed(() => {
  let total = 0;
  for (const cat in props.categories) {
    total += Object.keys(props.categories[cat]).length;
  }
  return total;
});

const totalHierarchicalCount = computed(() => {
  let total = 0;
  for (const cat of ['Nace2003', 'Nace2008', 'Nace2025']) {
    if (props.categories[cat]) {
      total += Object.keys(props.categories[cat]).length;
    }
  }
  return total;
});

const langCounts = computed(() => {
  const counts = { NL: 0, FR: 0, DE: 0 };
  for (const cat in props.categories) {
    for (const code in props.categories[cat]) {
      const descObj = props.categories[cat][code].descriptions;
      if (descObj.NL) counts.NL++;
      if (descObj.FR) counts.FR++;
      if (descObj.DE) counts.DE++;
    }
  }
  return counts;
});

const dePercentage = computed(() => {
  const de = langCounts.value.DE;
  const nl = langCounts.value.NL; // use NL as baseline total unique codes (since NL is 100% complete)
  return nl > 0 ? (de / nl) * 100 : 0;
});

const sortedCategoryStats = computed(() => {
  const stats = [];
  let maxCount = 0;

  for (const cat in props.categories) {
    const count = Object.keys(props.categories[cat]).length;
    if (count > maxCount) maxCount = count;
    stats.push({ name: cat, count });
  }

  // Sort descending
  stats.sort((a, b) => b.count - a.count);

  // Add percentages relative to the largest category for the visual chart
  return stats.map(s => ({
    ...s,
    percentage: maxCount > 0 ? (s.count / maxCount) * 100 : 0
  }));
});

const categoryDirectory = computed(() => {
  const dir = [];
  for (const cat in props.categories) {
    const meta = categoryMeta[cat] || { type: 'flat', desc: 'General KBO code classification.' };
    const count = Object.keys(props.categories[cat]).length;
    dir.push({
      name: cat,
      type: meta.type,
      desc: meta.desc,
      count
    });
  }
  return dir.sort((a, b) => b.count - a.count);
});
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.dashboard-header p {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  font-size: 2.25rem;
  background: var(--color-bg-body);
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
}

.stat-content h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}

.stat-content p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 500;
}

/* Main Grid */
.dashboard-main-grid {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .dashboard-main-grid {
    grid-template-columns: 1fr;
  }
}

.dashboard-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.dashboard-card h3 {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-top: 0;
  margin-bottom: 1rem;
}

.section-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-top: -0.5rem;
  margin-bottom: 1.25rem;
}

/* Distribution Chart */
.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chart-bar-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chart-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.count-val {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.bar-container {
  height: 8px;
  background: var(--color-bg-body);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-light), var(--color-primary));
  border-radius: 4px;
}

/* Language Stats */
.lang-stats {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.lang-stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.lang-info {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 500;
}

.flag-icon {
  margin-right: 0.5rem;
  font-size: 1.1rem;
}

.lang-name {
  color: var(--color-text-primary);
  flex-grow: 1;
}

.lang-pct {
  color: var(--color-primary);
  font-weight: 600;
}

.progress-bar {
  height: 6px;
  background: var(--color-bg-body);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
}

.progress-fill.nl { background: #3b82f6; }
.progress-fill.fr { background: #10b981; }
.progress-fill.de { background: #f59e0b; }

.lang-count {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* Directory Table */
.table-card {
  padding: 1.5rem;
}

.table-responsive {
  overflow-x: auto;
}

.directory-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.directory-table th {
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.directory-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.directory-table tbody tr:last-child td {
  border-bottom: none;
}

.cat-description {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  max-width: 400px;
  white-space: normal;
}

.font-mono {
  font-family: var(--font-mono);
}

.text-right {
  text-align: right;
}

/* Badges */
.category-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-mono);
  background: var(--color-bg-body);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

/* Special category badge colors for key categories */
.category-badge.nace2025 { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #10b981; }
.category-badge.nace2008 { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.category-badge.nace2003 { background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.category-badge.juridicalform { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); color: #f59e0b; }

.type-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.type-badge.hierarchical {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.type-badge.flat {
  background: var(--color-bg-body);
  color: var(--color-text-secondary);
  border: 1px dashed var(--color-border);
}
</style>
