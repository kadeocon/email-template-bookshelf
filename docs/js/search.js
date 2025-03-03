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

// Initialize search and filter functionality
function initializeSearch() {
  // Set up search input
  searchInput.addEventListener('input', performSearch);
  
  // Set up filter buttons
  filterButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      // Update active button UI
      filterButtons.forEach(btn => {
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
