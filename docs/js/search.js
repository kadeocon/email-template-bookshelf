// search.js - Email Template Bookshelf search functionality

// Initialize variables
let templates = [];
let activeFilter = 'all';

// DOM elements
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-button');
const templateContainer = document.querySelector('.bookshelf');
const resultsAnnouncement = document.getElementById('search-results-announcement');

// Create and append no results message
const noResultsMessage = document.createElement('div');
noResultsMessage.classList.add('no-results');
noResultsMessage.textContent = 'No templates match your search criteria.';
noResultsMessage.style.display = 'none';
templateContainer.after(noResultsMessage);

// Load template data
async function loadTemplateData() {
  try {
    const response = await fetch('data/templates.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    templates = await response.json();
    
    // Render template cards
    renderTemplateCards(templates);
    
    // Update filter buttons based on available tags
    updateFilterButtons(templates);
    
    // Initialize search and filters
    initializeSearch();
    
    // Initial announcement
    updateScreenReaderAnnouncement(`Loaded ${templates.length} templates.`);
    
    console.log('Templates loaded:', templates.length);
  } catch (error) {
    console.error('Error loading template data:', error);
    
    // Fallback to demo cards if templates.json is not yet available
    console.log('Using placeholder templates');
    
    // Find all template cards and extract data
    const templateCards = document.querySelectorAll('.email-card');
    templates = Array.from(templateCards).map(card => {
      const id = card.id.replace('template-', '');
      const title = card.querySelector('.email-title').textContent;
      const clientBadge = card.querySelector('.client-badge').textContent;
      
      // Extract tags
      const tagElements = card.querySelectorAll('.tag');
      const tags = Array.from(tagElements).map(tag => tag.textContent);
      
      // Extract date
      const dateText = card.querySelector('.date').textContent;
      
      return {
        id: id,
        title: title,
        client: clientBadge,
        tags: tags,
        date: dateText,
        // Add other properties with defaults
        description: `${title} email template`,
        isCMGDemo: clientBadge === 'CMG Demo'
      };
    });
    
    // Initialize with demo data
    initializeSearch();
  }
}

// Render template cards based on data
function renderTemplateCards(templates) {
  // Clear existing content
  templateContainer.innerHTML = '';
  
  if (templates.length === 0) {
    templateContainer.innerHTML = '<p class="no-templates">No templates found. Add templates to the "templates" directory to get started.</p>';
    return;
  }
  
  // Create a card for each template
  templates.forEach(template => {
    const card = document.createElement('div');
    card.className = 'email-card';
    card.setAttribute('role', 'listitem');
    card.id = `template-${template.id}`;
    
    // Format date for display
    const dateObj = new Date(template.dateCreated || template.date);
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    // Create tags HTML
    const tagsHTML = template.tags.map(tag => 
      `<span class="tag">${tag}</span>`
    ).join('');
    
    card.innerHTML = `
      <a href="templates/${template.id}.html" class="email-link">View ${template.title} Template</a>
      <div class="client-badge">${template.client}</div>
      <div class="email-thumbnail">
        <img src="${template.previewAnimated || template.previewStatic}" 
             alt="Preview of ${template.title} email template" 
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgNjAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YwZjBmMCIvPjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSI1MDAiIHJ4PSI4IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNkZGRkZGQiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSI2MCIgcng9IjgiIGZpbGw9IiM0OTJkN2QiLz48cmVjdCB4PSI4MCIgeT0iNzAiIHdpZHRoPSIxMjAiIGhlaWdodD0iMjAiIHJ4PSI0IiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjgiLz48cmVjdCB4PSI3MCIgeT0iMTMwIiB3aWR0aD0iMjYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2FjZmZkOSIgb3BhY2l0eT0iMC41Ii8+PHJlY3QgeD0iMTIwIiB5PSIxNjAiIHdpZHRoPSIxNjAiIGhlaWdodD0iMjAiIHJ4PSI0IiBmaWxsPSIjMzMzMzMzIi8+PHJlY3QgeD0iMTYwIiB5PSIxOTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIyMCIgcng9IjQiIGZpbGw9IiMzMzMzMzMiIG9wYWNpdHk9IjAuNiIvPjxyZWN0IHg9IjcwIiB5PSIyNzAiIHdpZHRoPSIyNjAiIGhlaWdodD0iMSIgZmlsbD0iI2VlZWVlZSIvPjxyZWN0IHg9IjgwIiB5PSIyOTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgZmlsbD0iI2YwZjBmMCIvPjxyZWN0IHg9IjE4MCIgeT0iMzAwIiB3aWR0aD0iMTMwIiBoZWlnaHQ9IjE1IiByeD0iMiIgZmlsbD0iIzMzMzMzMyIgb3BhY2l0eT0iMC44Ii8+PHJlY3QgeD0iMTgwIiB5PSIzMjUiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAiIHJ4PSIyIiBmaWxsPSIjNjY2NjY2IiBvcGFjaXR5PSIwLjYiLz48cmVjdCB4PSIxODAiIHk9IjM0NSIgd2lkdGg9IjcwIiBoZWlnaHQ9IjE1IiByeD0iMiIgZmlsbD0iIzMzMzMzMyIvPjxyZWN0IHg9IjEzMCIgeT0iNDAwIiB3aWR0aD0iMTQwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzQ5MmQ3ZCIvPjxyZWN0IHg9IjE1NSIgeT0iNDE1IiB3aWR0aD0iOTAiIGhlaWdodD0iMTAiIHJ4PSIyIiBmaWxsPSIjZmZmZmZmIi8+PHJlY3QgeD0iNTAiIHk9IjQ5MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSI2MCIgcng9IjgiIGZpbGw9IiNmNWY1ZjUiLz48cmVjdCB4PSIxNTAiIHk9IjUxMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMCIgcng9IjIiIGZpbGw9IiM5OTk5OTkiIG9wYWNpdHk9IjAuNiIvPjxyZWN0IHg9IjE3MCIgeT0iNTMwIiB3aWR0aD0iNjAiIGhlaWdodD0iOCIgcng9IjIiIGZpbGw9IiM5OTk5OTkiIG9wYWNpdHk9IjAuNCIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE3NSwgNTAwKSBzY2FsZSgwLjYpIj48cGF0aCBkPSJNNDAsMCBMNDAsMzIgTDAsMzIgTDAsMCBMNDAsMCBaIE0zNiw0IEw0LDQgTDQsMjggTDM2LDI4IEwzNiw0IFoiIGZpbGw9IiM0OTJkN2QiIG9wYWNpdHk9IjAuMyIvPjxwYXRoIGQ9Ik0yMCwxOCBMNCw4IEw0LDI4IEwzNiwyOCBMMzYsOCBMMjAsMTggWiIgZmlsbD0iIzQ5MmQ3ZCIgb3BhY2l0eT0iMC4zIi8+PHBhdGggZD0iTTIwLDE0IEwzNiw0IEw0LDQgTDIwLDE0IFoiIGZpbGw9IiM0OTJkN2QiIG9wYWNpdHk9IjAuMyIvPjwvZz48L3N2Zz4='" />
      </div>
      <div class="email-info">
        <h3 class="email-title">${template.title}</h3>
        <div class="email-meta">
          <div class="tags">
            ${tagsHTML}
          </div>
          <div class="date">${displayDate}</div>
        </div>
      </div>
    `;
    
    templateContainer.appendChild(card);
  });
}

// Update filter buttons based on available tags
function updateFilterButtons(templates) {
  const filterContainer = document.querySelector('.filter-buttons');
  
  // Keep the "All" button
  filterContainer.innerHTML = '<button class="filter-button active" aria-pressed="true">All</button>';
  
  // Extract all unique tags
  const allTags = new Set();
  templates.forEach(template => {
    template.tags.forEach(tag => allTags.add(tag));
  });
  
  // Add 'CMG Demo' as a special filter if there are any CMG Demo templates
  const hasCMGDemo = templates.some(template => template.isCMGDemo);
  if (hasCMGDemo) {
    allTags.add('CMG Demo');
  }
  
  // Sort tags alphabetically
  const sortedTags = Array.from(allTags).sort();
  
  // Create a button for each tag
  sortedTags.forEach(tag => {
    const button = document.createElement('button');
    button.className = 'filter-button';
    button.setAttribute('aria-pressed', 'false');
    button.textContent = tag;
    
    button.addEventListener('click', (event) => {
      // Update active button UI
      document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      
      event.target.classList.add('active');
      event.target.setAttribute('aria-pressed', 'true');
      
      // Apply filter
      activeFilter = event.target.textContent.toLowerCase();
      
      // Reapply current search with new filter
      performSearch();
    });
    
    filterContainer.appendChild(button);
  });
}

// Initialize search and filter functionality
function initializeSearch() {
  // Set up search input
  searchInput.addEventListener('input', performSearch);
  
  // Set up filter buttons
  document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', (event) => {
      // Update active button UI
      document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      
      event.target.classList.add('active');
      event.target.setAttribute('aria-pressed', 'true');
      
      // Apply filter
      activeFilter = event.target.textContent.toLowerCase();
      
      // Reapply current search with new filter
      performSearch();
    });
  });
}

// Perform search based on current input and filter
function performSearch() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  let filteredTemplates = [...templates];
  
  // Apply category filter first (if not "all")
  if (activeFilter !== 'all') {
    filteredTemplates = filteredTemplates.filter(template => {
      // Special case for CMG Demo
      if (activeFilter === 'cmg demo') {
        return template.isCMGDemo;
      }
      
      // For other categories, check tags
      return template.tags.some(tag => 
        tag.toLowerCase() === activeFilter
      );
    });
  }
  
  // Apply search term if present
  if (searchTerm) {
    filteredTemplates = filteredTemplates.filter(template => {
      return (
        // Search in title
        template.title.toLowerCase().includes(searchTerm) ||
        // Search in description
        (template.description && template.description.toLowerCase().includes(searchTerm)) ||
        // Search in tags
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        // Search in client
        template.client.toLowerCase().includes(searchTerm) ||
        // Search in subject line
        (template.subjectLine && template.subjectLine.toLowerCase().includes(searchTerm))
      );
    });
  }
  
  // Update display
  updateTemplateDisplay(filteredTemplates);
}

// Update template display based on search/filter results
function updateTemplateDisplay(filteredTemplates) {
  // Get all template cards
  const templateCards = document.querySelectorAll('.email-card');
  
  // First hide all templates
  templateCards.forEach(card => {
    card.style.display = 'none';
  });
  
  // Show no results message if needed
  if (filteredTemplates.length === 0) {
    noResultsMessage.style.display = 'block';
    updateScreenReaderAnnouncement('No templates match your search criteria.');
    return;
  }
  
  // Hide no results message
  noResultsMessage.style.display = 'none';
  
  // Show matching templates
  let visibleCount = 0;
  
  filteredTemplates.forEach(template => {
    const card = document.getElementById(`template-${template.id}`);
    if (card) {
      card.style.display = 'block';
      visibleCount++;
    }
  });
  
  // Update screen reader announcement
  updateScreenReaderAnnouncement(`Found ${visibleCount} templates matching your criteria.`);
}

// Update screen reader announcement
function updateScreenReaderAnnouncement(message) {
  if (resultsAnnouncement) {
    resultsAnnouncement.textContent = message;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadTemplateData);
