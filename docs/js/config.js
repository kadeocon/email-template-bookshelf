// config.js - Centralized configuration for Email Template Bookshelf

const config = {
  // Site information
  siteName: "Email Template Bookshelf",
  siteAuthor: "Kade O'Connor",
  authorUrl: "https://kadeoconnor.com",
  
  // Visual elements
  logoUrl: "https://kadeoconnor.com/staging/1137/wp-content/uploads/2024/11/Kade-Logo-flat.png",
  logoAlt: "Kade O'Connor Logo",
  placeholderImage: "images/placeholder-email.svg",
  
  // Repository information
  repoUrl: "https://github.com/username/email-templates",
  
  // Card display settings
  maxTagsPerCard: 3,
  cardHeight: 370, // Pixels
  
  // Directory structure
  directories: {
    templates: "templates",
    docs: "docs",
    previews: {
      static: "docs/previews/static",
      animated: "docs/previews/animated"
    },
    data: "docs/data",
    detailPages: "docs/templates"
  },
  
  // Get current year for copyright notices
  getCurrentYear: function() {
    return new Date().getFullYear();
  }
};

// Make config available globally
window.siteConfig = config;
