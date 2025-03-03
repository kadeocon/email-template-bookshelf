// logo-consistency.js
// This script ensures logo consistency across pages
// Add this script to both index.html and detail pages

document.addEventListener('DOMContentLoaded', function() {
  // The correct logo URL
  const correctLogoUrl = "https://kadeoconnor.com/staging/1137/wp-content/uploads/2024/11/Kade-Logo-flat.png";
  const correctLogoAlt = "Kade O'Connor Logo";
  
  // Update all logo images to ensure consistency
  const logoImages = document.querySelectorAll('.logo img');
  logoImages.forEach(img => {
    // Only update if it's not already the correct URL
    if (img.src !== correctLogoUrl) {
      img.src = correctLogoUrl;
    }
    
    // Ensure alt text is correct
    if (img.alt !== correctLogoAlt) {
      img.alt = correctLogoAlt;
    }
  });
  
  // Use configuration if available
  if (window.siteConfig && window.siteConfig.logoUrl) {
    logoImages.forEach(img => {
      img.src = window.siteConfig.logoUrl;
      img.alt = window.siteConfig.logoAlt || correctLogoAlt;
    });
  }
});
