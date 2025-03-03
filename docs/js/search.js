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

// Maximum number of tags to display per card before truncating
const MAX_TAGS_PER_CARD = 3;

// Load template data
async function loadTemplateData() {
  try {
    const response = await fetch('data/templates.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    templates = await response.json();
    
    // Check if we have templates loaded
    if (templates.length === 0) {
      console.log('No templates found in templates.json');
      displayNoTemplatesMessage();
      return;
    }
    
    // Render template cards
    renderTemplateCards(templates);
    
    // Update filter buttons based on available tags
    updateFilterButtons(templates);
    
    // Initialize search and filters
    initializeSearch();
    
    // Handle tag overflow
    handleTagOverflow();
    
    // Initial announcement
    updateScreenReaderAnnouncement(`Loaded ${templates.length} templates.`);
    
    console.log('Templates loaded:', templates.length);
  } catch (error) {
    console.error('Error loading template data:', error);
    displayNoTemplatesMessage();
  }
}

// Display message when no templates are found
function displayNoTemplatesMessage() {
  templateContainer.innerHTML = '<div class="no-templates">No email templates found. Add templates to the "templates" directory to get started.</div>';
}

// Render template cards based on data
function renderTemplateCards(templates) {
  // Clear existing content
  templateContainer.innerHTML = '';
  
  if (templates.length === 0) {
    displayNoTemplatesMessage();
    return;
  }
  
  // Create a card for each template
  templates.forEach(template => {
    const card = document.createElement('div');
    card.className = 'email-card';
    card.setAttribute('role', 'listitem');
    card.id = `template-${template.id}`;
    
    // Format date for display
    const dateObj = new Date(template.dateCreated || template.date || new Date());
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    // Create tags HTML - all tags are created but only a subset will be visible
    const tagsHTML = template.tags.map(tag => 
      `<span class="tag">${tag}</span>`
    ).join('');
    
    // Define the template URL - point to detail page if it exists
    const templateDetailUrl = `templates/${template.id}.html`;
    
    card.innerHTML = `
      <a href="${templateDetailUrl}" class="email-link">View ${template.title} Template</a>
      <div class="client-badge">${template.client}</div>
      <div class="email-thumbnail">
        <img src="${template.previewAnimated || template.previewStatic}" 
             alt="Preview of ${template.title} email template" 
             onerror="this.src='images/placeholder-email.svg'" />
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
  
  // Handle tag overflow after rendering cards
  handleTagOverflow();
}

/**
 * Handles tag overflow in email cards
 * Adds an ellipsis if tags overflow and limits displayed tags
 */
function handleTagOverflow() {
  const tagContainers = document.querySelectorAll('.tags');
  
  tagContainers.forEach(container => {
    const tags = container.querySelectorAll('.tag');
    if (tags.length <= MAX_TAGS_PER_CARD) return; // No need to truncate if under the limit
    
    // Remove any existing ellipsis
    const existingEllipsis = container.querySelector('.tag-ellipsis');
    if (existingEllipsis) {
      existingEllipsis.remove();
    }
    
    // Hide excess tags
    for (let i = MAX_TAGS_PER_CARD; i < tags.length; i++) {
      tags[i].style.display = 'none';
    }
    
    // Calculate how many tags are hidden
    const hiddenCount = tags.length - MAX_TAGS_PER_CARD;
    
    // Add ellipsis element
    const ellipsis = document.createElement('span');
    ellipsis.className = 'tag-ellipsis';
    ellipsis.textContent = `+${hiddenCount} more`;
    ellipsis.title = Array.from(tags).slice(MAX_TAGS_PER_CARD).map(tag => tag.textContent).join(', ');
    container.appendChild(ellipsis);
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
  
  // Re-apply tag overflow handling since cards may have been hidden/shown
  handleTagOverflow();
  
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
