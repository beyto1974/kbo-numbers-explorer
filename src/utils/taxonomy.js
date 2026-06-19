/**
 * KBO Codes Taxonomy Utilities
 */

/**
 * Robust CSV parser that handles quotes and commas inside fields.
 * @param {string} text 
 * @returns {string[][]}
 */
export function parseCSV(text) {
  const result = [];
  let row = [];
  let inQuotes = false;
  let currentValue = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue.trim());
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      if (currentValue || row.length > 0) {
        row.push(currentValue.trim());
        result.push(row);
      }
      row = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  if (currentValue || row.length > 0) {
    row.push(currentValue.trim());
    result.push(row);
  }

  return result;
}

/**
 * Loads the code.csv file, parses it, and constructs the hierarchical structure.
 * @returns {Promise<{ categories: Object, categoryRoots: Object, allCodes: Array }>}
 */
export async function loadTaxonomy() {
  const response = await fetch(`${import.meta.env.BASE_URL}code.csv`);
  if (!response.ok) {
    throw new Error('Failed to fetch code.csv');
  }
  const csvText = await response.text();
  const rows = parseCSV(csvText);

  // Group by category, then by code
  const categories = {};
  
  // Headers are in rows[0]: ["Category", "Code", "Language", "Description"]
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 4) continue;
    
    const [category, code, language, description] = row;
    if (!category || !code || !language) continue;

    if (!categories[category]) {
      categories[category] = {};
    }

    if (!categories[category][code]) {
      categories[category][code] = {
        code,
        category,
        descriptions: {},
        parent: null,
        parentCode: null,
        children: [],
        path: []
      };
    }

    categories[category][code].descriptions[language] = description;
  }

  // Establish parent-child relationships for hierarchical categories
  for (const catName in categories) {
    const catMap = categories[catName];
    const nodes = Object.values(catMap);
    
    const isHierarchical = catName.startsWith('Nace');
    
    if (isHierarchical) {
      for (const node of nodes) {
        const code = node.code;
        let parentNode = null;
        
        // Find longest prefix that exists in the same category
        for (let len = code.length - 1; len > 0; len--) {
          const prefix = code.slice(0, len);
          if (catMap[prefix]) {
            parentNode = catMap[prefix];
            break;
          }
        }
        
        if (parentNode) {
          node.parent = parentNode;
          node.parentCode = parentNode.code;
          parentNode.children.push(node);
        }
      }
    }
    
    // Sort children for each node
    for (const node of nodes) {
      node.children.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    }
  }

  // Compute paths from root to each node
  for (const catName in categories) {
    const catMap = categories[catName];
    for (const node of Object.values(catMap)) {
      const path = [];
      let current = node;
      while (current) {
        path.unshift(current);
        current = current.parent;
      }
      node.path = path;
    }
  }

  // Get roots for each category and sort them
  const categoryRoots = {};
  const allCodes = [];
  
  for (const catName in categories) {
    const catMap = categories[catName];
    const nodes = Object.values(catMap);
    
    categoryRoots[catName] = nodes
      .filter(node => !node.parent)
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      
    allCodes.push(...nodes);
  }

  return {
    categories,
    categoryRoots,
    allCodes
  };
}

/**
 * Searches the taxonomy.
 * @param {Object} categories 
 * @param {string} query 
 * @param {string|null} selectedCategory 
 * @returns {Array} Matching nodes
 */
export function searchTaxonomy(categories, query, selectedCategory = null) {
  if (!query) return [];
  const cleanQuery = query.toLowerCase().trim();
  const results = [];

  for (const catName in categories) {
    if (selectedCategory && catName !== selectedCategory) continue;

    const catMap = categories[catName];
    for (const node of Object.values(catMap)) {
      const codeMatch = node.code.toLowerCase().includes(cleanQuery);
      
      let descMatch = false;
      for (const lang in node.descriptions) {
        if (node.descriptions[lang].toLowerCase().includes(cleanQuery)) {
          descMatch = true;
          break;
        }
      }

      if (codeMatch || descMatch) {
        let score = 0;
        if (node.code.toLowerCase() === cleanQuery) score += 100;
        else if (node.code.toLowerCase().startsWith(cleanQuery)) score += 50;
        else if (codeMatch) score += 10;
        
        results.push({
          node,
          score
        });
      }
    }
  }

  return results
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.node.category !== b.node.category) return a.node.category.localeCompare(b.node.category);
      return a.node.code.localeCompare(b.node.code, undefined, { numeric: true });
    })
    .map(r => r.node);
}
