<template>
  <div class="details-panel">
    <div v-if="!node" class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>No Code Selected</h3>
      <p>Select a category and code from the columns to view detailed translations, hierarchy path, children, and export options.</p>
    </div>

    <div v-else class="details-content">
      <!-- Header Section -->
      <div class="details-header">
        <span class="category-badge" :class="node.category.toLowerCase()">{{ node.category }}</span>
        <h2 class="code-title">{{ node.code }}</h2>
        <h3 class="main-desc">{{ node.descriptions[activeLang] || node.descriptions.NL || node.descriptions.FR }}</h3>
      </div>

      <!-- Breadcrumbs Path -->
      <div class="details-section">
        <h4>Hierarchy Path</h4>
        <div class="breadcrumbs">
          <div 
            v-for="(pathNode, index) in node.path" 
            :key="pathNode.code" 
            class="breadcrumb-item"
          >
            <button 
              @click="$emit('select-node', pathNode)" 
              class="breadcrumb-btn"
              :class="{ active: pathNode.code === node.code }"
            >
              <span class="crumb-code">{{ pathNode.code }}</span>
              <span class="crumb-text">{{ pathNode.descriptions[activeLang] || pathNode.descriptions.NL }}</span>
            </button>
            <span v-if="index < node.path.length - 1" class="chevron">></span>
          </div>
        </div>
      </div>

      <!-- Translations -->
      <div class="details-section">
        <h4>Translations</h4>
        <div class="translations-list">
          <div class="trans-row">
            <span class="flag-icon">🇳🇱 NL</span>
            <span class="trans-desc">{{ node.descriptions.NL || '—' }}</span>
          </div>
          <div class="trans-row">
            <span class="flag-icon">🇫🇷 FR</span>
            <span class="trans-desc">{{ node.descriptions.FR || '—' }}</span>
          </div>
          <div class="trans-row">
            <span class="flag-icon">🇩🇪 DE</span>
            <span class="trans-desc">{{ node.descriptions.DE || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Action Exports -->
      <div class="details-section">
        <h4>Export Subtree</h4>
        <p class="section-desc">Download this node and all of its nested children as JSON or CSV.</p>
        <div class="export-buttons">
          <button @click="exportSubtreeJSON" class="btn btn-secondary">
            📥 Export JSON
          </button>
          <button @click="exportSubtreeCSV" class="btn btn-secondary">
            📊 Export CSV
          </button>
        </div>
      </div>

      <!-- Children list if NACE/hierarchical -->
      <div class="details-section" v-if="node.children && node.children.length > 0">
        <div class="section-header-row">
          <h4>Children ({{ node.children.length }})</h4>
          <input 
            v-model="childrenSearch" 
            type="text" 
            placeholder="Filter children..." 
            class="filter-input"
          />
        </div>
        
        <div class="children-list">
          <button 
            v-for="child in filteredChildren" 
            :key="child.code" 
            @click="$emit('select-node', child)"
            class="child-btn"
          >
            <span class="child-code">{{ child.code }}</span>
            <span class="child-desc">{{ child.descriptions[activeLang] || child.descriptions.NL }}</span>
          </button>
        </div>
      </div>

      <!-- Siblings list if NACE/hierarchical -->
      <div class="details-section" v-if="siblings && siblings.length > 1">
        <h4>Siblings ({{ siblings.length - 1 }})</h4>
        <div class="siblings-list">
          <button 
            v-for="sib in siblings.filter(s => s.code !== node.code)" 
            :key="sib.code" 
            @click="$emit('select-node', sib)"
            class="sibling-btn"
          >
            <span class="sibling-code">{{ sib.code }}</span>
            <span class="sibling-desc">{{ sib.descriptions[activeLang] || sib.descriptions.NL }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  node: {
    type: Object,
    default: null
  },
  activeLang: {
    type: String,
    required: true
  }
});

defineEmits(['select-node']);

const childrenSearch = ref('');

// Filtered children list based on search text
const filteredChildren = computed(() => {
  if (!props.node || !props.node.children) return [];
  const q = childrenSearch.value.toLowerCase().trim();
  if (!q) return props.node.children;
  return props.node.children.filter(child => {
    const codeMatch = child.code.toLowerCase().includes(q);
    const descMatch = Object.values(child.descriptions).some(desc => 
      desc.toLowerCase().includes(q)
    );
    return codeMatch || descMatch;
  });
});

// Find siblings (children of the parent, or other roots of the same category)
const siblings = computed(() => {
  if (!props.node) return [];
  if (props.node.parent) {
    return props.node.parent.children;
  }
  // If it's a root node, we can't easily fetch other roots from here, 
  // so we let the parent component pass them or we just skip siblings list for roots.
  return [];
});

// Helper to recursively collect all nodes in a subtree
function collectSubtree(rootNode) {
  const result = [rootNode];
  function traverse(n) {
    if (n.children && n.children.length > 0) {
      for (const child of n.children) {
        result.push(child);
        traverse(child);
      }
    }
  }
  traverse(rootNode);
  return result;
}

// Export subtree as JSON
function exportSubtreeJSON() {
  if (!props.node) return;
  const nodes = collectSubtree(props.node);
  
  // Format nodes as a clean serializable object
  const cleanNodes = nodes.map(n => ({
    code: n.code,
    category: n.category,
    parentCode: n.parentCode,
    descriptions: n.descriptions
  }));

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanNodes, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `kbo_taxonomy_${props.node.category}_${props.node.code}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Export subtree as CSV
function exportSubtreeCSV() {
  if (!props.node) return;
  const nodes = collectSubtree(props.node);
  
  // Build CSV rows
  const csvRows = [
    ['Category', 'Code', 'Language', 'Description']
  ];

  for (const n of nodes) {
    for (const lang in n.descriptions) {
      csvRows.push([
        n.category,
        n.code,
        lang,
        n.descriptions[lang]
      ]);
    }
  }

  // Escape quotes and join
  const csvContent = csvRows
    .map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", url);
  downloadAnchor.setAttribute("download", `kbo_taxonomy_${props.node.category}_${props.node.code}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.details-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  height: calc(100vh - 220px);
  overflow-y: auto;
  position: sticky;
  top: 100px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  color: var(--color-text-secondary);
  padding: 1rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.empty-state p {
  font-size: 0.85rem;
  max-width: 280px;
  line-height: 1.5;
}

/* Header */
.details-header {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1.25rem;
  margin-bottom: 1.25rem;
}

.code-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  margin: 0.5rem 0;
  letter-spacing: -0.02em;
}

.main-desc {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
}

/* Sections */
.details-section {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1.25rem;
  margin-bottom: 1.25rem;
}

.details-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.details-section h4 {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-top: 0;
  margin-bottom: 0.75rem;
  letter-spacing: 0.05em;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-header-row h4 {
  margin-bottom: 0;
}

/* Breadcrumbs */
.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-bg-body);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
  text-align: left;
  transition: background 0.15s;
}

.breadcrumb-btn:hover {
  background: var(--color-border);
}

.breadcrumb-btn.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.crumb-code {
  font-family: var(--font-mono);
  font-weight: 700;
}

.crumb-text {
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-secondary);
}

.breadcrumb-btn.active .crumb-text {
  color: var(--color-primary);
}

.chevron {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: bold;
}

/* Translations */
.translations-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.trans-row {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
}

.flag-icon {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-text-secondary);
  min-width: 55px;
}

.trans-desc {
  color: var(--color-text-primary);
  line-height: 1.4;
}

/* Export Buttons */
.section-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: -0.25rem;
  margin-bottom: 0.75rem;
}

.export-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background 0.15s, border-color 0.15s;
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
}

.btn-secondary:hover {
  background: var(--color-bg-body);
  border-color: var(--color-text-secondary);
}

/* Filter Input */
.filter-input {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-body);
  color: var(--color-text-primary);
  outline: none;
  max-width: 150px;
}

.filter-input:focus {
  border-color: var(--color-primary);
}

/* Children & Siblings Lists */
.children-list, .siblings-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  background: var(--color-bg-body);
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.child-btn, .sibling-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  text-align: left;
  font-size: 0.8rem;
  transition: background 0.15s, border-color 0.15s;
}

.child-btn:hover, .sibling-btn:hover {
  background: var(--color-border);
  border-color: var(--color-text-secondary);
}

.child-code, .sibling-code {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-text-primary);
  background: var(--color-bg-body);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

.child-desc, .sibling-desc {
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
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

.category-badge.nace2025 { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #10b981; }
.category-badge.nace2008 { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.category-badge.nace2003 { background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
</style>
