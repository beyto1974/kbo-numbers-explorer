<template>
  <div class="miller-columns-container" ref="containerRef">
    <!-- Render each column dynamically -->
    <div 
      v-for="(col, colIndex) in columns" 
      :key="colIndex" 
      class="column"
      :style="{ minWidth: columnWidth + 'px', maxWidth: columnWidth + 'px' }"
    >
      <!-- Column Header -->
      <div class="column-header">
        <h3>{{ getColumnHeader(colIndex, col) }}</h3>
        <span class="column-count">{{ col.filteredItems.length }}</span>
      </div>

      <!-- Column Search/Filter -->
      <div class="column-search">
        <input 
          v-model="col.filterText" 
          type="text" 
          :placeholder="colIndex === 0 ? 'Filter categories...' : 'Filter codes...'" 
          class="column-filter-input"
        />
      </div>

      <!-- Items List -->
      <div class="column-items">
        <!-- Category Column -->
        <template v-if="colIndex === 0">
          <button 
            v-for="cat in col.filteredItems" 
            :key="cat.name"
            class="item-btn"
            :class="{ active: activeCategoryName === cat.name }"
            @click="selectCategory(cat.name)"
          >
            <span class="item-text font-bold">{{ cat.name }}</span>
            <span class="item-badge">{{ cat.count }}</span>
            <span class="item-arrow">></span>
          </button>
        </template>

        <!-- Code Column -->
        <template v-else>
          <button 
            v-for="node in col.filteredItems" 
            :key="node.code"
            class="item-btn"
            :class="{ active: isNodeActive(node, colIndex) }"
            @click="selectNode(node, colIndex)"
          >
            <div class="item-content">
              <span class="item-code font-mono">{{ node.code }}</span>
              <span class="item-desc">{{ node.descriptions[activeLang] || node.descriptions.NL || node.descriptions.FR }}</span>
            </div>
            <span v-if="node.children && node.children.length > 0" class="item-arrow">></span>
          </button>
        </template>

        <div v-if="col.filteredItems.length === 0" class="no-results">
          No matches found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue';

const props = defineProps({
  categories: {
    type: Object,
    required: true
  },
  categoryRoots: {
    type: Object,
    required: true
  },
  activeLang: {
    type: String,
    required: true
  },
  selectedNode: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['select-node', 'select-category']);

const containerRef = ref(null);
const columnWidth = ref(280);

// Active navigation state for columns
const activeCategoryName = ref(null);
const activeNodePath = ref([]); // Array of active nodes at each level

// Simple local state to track column-specific filters
const columnFilters = ref([]);

// We generate columns dynamically based on selection state
const columns = computed(() => {
  const list = [];

  // Column 1: Categories
  const categoryFilter = columnFilters.value[0] || '';
  const categoryItems = Object.keys(props.categories).map(name => ({
    name,
    count: Object.keys(props.categories[name]).length
  })).sort((a, b) => b.count - a.count);

  const filteredCategories = categoryItems.filter(cat => 
    cat.name.toLowerCase().includes(categoryFilter.toLowerCase())
  );

  list.push({
    type: 'category',
    items: categoryItems,
    filteredItems: filteredCategories,
    filterText: '' // bind to filter text in custom watchers
  });

  // Column 2: Selected Category Roots
  if (activeCategoryName.value && props.categoryRoots[activeCategoryName.value]) {
    const roots = props.categoryRoots[activeCategoryName.value];
    const filterText = columnFilters.value[1] || '';
    const filteredRoots = filterItems(roots, filterText);

    list.push({
      type: 'root-codes',
      category: activeCategoryName.value,
      items: roots,
      filteredItems: filteredRoots,
      filterText: ''
    });

    // Column 3+: Nested child levels based on activeNodePath
    for (let i = 0; i < activeNodePath.value.length; i++) {
      const parentNode = activeNodePath.value[i];
      if (parentNode && parentNode.children && parentNode.children.length > 0) {
        const children = parentNode.children;
        const colIdx = i + 2;
        const filterText = columnFilters.value[colIdx] || '';
        const filteredChildren = filterItems(children, filterText);

        list.push({
          type: 'child-codes',
          parentNode,
          items: children,
          filteredItems: filteredChildren,
          filterText: ''
        });
      }
    }
  }

  return list;
});

// Watch the columns array length to automatically scroll the container to the right
watch(() => columns.value.length, () => {
  nextTick(() => {
    if (containerRef.value) {
      containerRef.value.scrollTo({
        left: containerRef.value.scrollWidth,
        behavior: 'smooth'
      });
    }
  });
});

// Sync filter models with columnFilters ref
watch(columns, (newCols) => {
  newCols.forEach((col, idx) => {
    // Watch and copy the filter text if changed
    if (col.filterText !== undefined) {
      // Set value on container
      nextTick(() => {
        // We bind using index to maintain local search filter persistence
        const inputs = containerRef.value?.querySelectorAll('.column-filter-input');
        if (inputs && inputs[idx]) {
          inputs[idx].oninput = (e) => {
            columnFilters.value[idx] = e.target.value;
          };
          inputs[idx].value = columnFilters.value[idx] || '';
        }
      });
    }
  });
}, { immediate: true, deep: true });

// Sync external selection (like search selection) back to the column explorer
watch(() => props.selectedNode, (newNode) => {
  if (!newNode) return;
  
  // Set category
  activeCategoryName.value = newNode.category;
  
  // Set path of nodes in activeNodePath (all nodes except the leaf node itself)
  if (newNode.path && newNode.path.length > 0) {
    // If it's a leaf, the activeNodePath contains its parents.
    // e.g. path is [74, 741, 7411]. The activeNodePath will be [74, 741].
    activeNodePath.value = newNode.path.slice(0, -1);
  } else {
    activeNodePath.value = [];
  }
  
  // Clear sibling filters for columns higher than the new path length
  columnFilters.value = columnFilters.value.slice(0, activeNodePath.value.length + 2);
}, { immediate: true });

// Filter logic for code items
function filterItems(items, filterText) {
  if (!filterText) return items;
  const q = filterText.toLowerCase().trim();
  return items.filter(node => {
    const codeMatch = node.code.toLowerCase().includes(q);
    const descMatch = Object.values(node.descriptions).some(desc => 
      desc.toLowerCase().includes(q)
    );
    return codeMatch || descMatch;
  });
}

function selectCategory(catName) {
  activeCategoryName.value = catName;
  activeNodePath.value = [];
  columnFilters.value = ['', '']; // clear search on second column
  emit('select-category', catName);
}

function selectNode(node, colIndex) {
  // colIndex:
  // 1 is roots
  // 2 is first level child, etc.
  const pathIndex = colIndex - 1;
  
  // Truncate activeNodePath to this level
  activeNodePath.value = activeNodePath.value.slice(0, pathIndex);
  activeNodePath.value.push(node);
  
  // Clear filters for columns beyond this
  columnFilters.value = columnFilters.value.slice(0, colIndex + 1);
  columnFilters.value.push(''); // add empty for next column
  
  emit('select-node', node);
}

function isNodeActive(node, colIndex) {
  // In a specific column, a node is active if it is selected, OR
  // if it is part of the path leading to the selected child.
  const pathIndex = colIndex - 1;
  const nextPathNode = activeNodePath.value[pathIndex];
  if (nextPathNode && nextPathNode.code === node.code) {
    return true;
  }
  return props.selectedNode && props.selectedNode.code === node.code;
}

// Translate column index into standard NACE or general terminology
function getColumnHeader(index, col) {
  if (index === 0) return 'Categories';
  
  const cat = activeCategoryName.value;
  const isNace = cat && cat.startsWith('Nace');
  
  if (isNace) {
    // NACE structure: Division, Group, Class, Subclass, National
    const naceLevels = ['Division', 'Group', 'Class', 'Subclass', 'National Subclass'];
    return naceLevels[index - 1] || `Level ${index}`;
  }
  
  // General fallback
  if (index === 1) return 'Codes';
  return `Subcodes (Level ${index - 1})`;
}
</script>

<style scoped>
.miller-columns-container {
  display: flex;
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg-card);
  height: calc(100vh - 220px);
  box-shadow: var(--shadow-sm);
  scroll-behavior: smooth;
}

/* Scrollbar styling */
.miller-columns-container::-webkit-scrollbar {
  height: 10px;
}
.miller-columns-container::-webkit-scrollbar-track {
  background: var(--color-bg-card);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}
.miller-columns-container::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 5px;
}
.miller-columns-container::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}

.column {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.column:last-child {
  border-right: none;
}

/* Column Header */
.column-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-bg-body);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.column:first-child .column-header {
  border-top-left-radius: 11px;
}

.column-header h3 {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: 0.05em;
}

.column-count {
  font-size: 0.75rem;
  background: var(--color-border);
  color: var(--color-text-secondary);
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
}

/* Column Search */
.column-search {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.column-filter-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-body);
  color: var(--color-text-primary);
  outline: none;
  box-sizing: border-box;
}

.column-filter-input:focus {
  border-color: var(--color-primary);
}

/* Items List */
.column-items {
  flex-grow: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 8px;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.item-btn:hover {
  background: var(--color-bg-body);
}

.item-btn.active {
  background: var(--color-primary-light);
  border-color: var(--color-primary-light);
  color: var(--color-primary);
}

.item-text {
  font-size: 0.9rem;
  color: var(--color-text-primary);
}

.item-btn.active .item-text {
  color: var(--color-primary);
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  overflow: hidden;
  flex-grow: 1;
  margin-right: 0.5rem;
}

.item-code {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.item-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-btn.active .item-code {
  color: var(--color-primary);
}

.item-btn.active .item-desc {
  color: var(--color-primary);
  opacity: 0.85;
}

.item-arrow {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: bold;
}

.item-btn.active .item-arrow {
  color: var(--color-primary);
}

.item-badge {
  font-size: 0.7rem;
  background: var(--color-bg-body);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 0.05rem 0.35rem;
  border-radius: 6px;
  font-family: var(--font-mono);
  margin-left: auto;
  margin-right: 0.5rem;
}

.item-btn.active .item-badge {
  background: rgba(var(--color-primary-rgb), 0.15);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.no-results {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 2rem 1rem;
}

.font-bold {
  font-weight: 600;
}
.font-mono {
  font-family: var(--font-mono);
}
</style>
