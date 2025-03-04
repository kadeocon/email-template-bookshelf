// fix-template-issues.js
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  detailPagesDir: 'docs/templates',
  stylesFile: 'docs/css/styles.css'
};

async function main() {
  console.log('Fixing template display issues...');
  
  // Fix CSS issues
  await fixCssIssues();
  
  // Fix detail page issues
  await fixDetailPageIssues();
  
  console.log('Template fixes complete!');
}

async function fixCssIssues() {
  console.log('Fixing CSS issues...');
  
  // Check if styles.css exists
  if (!fs.existsSync(config.stylesFile)) {
    console.log(`${config.stylesFile} not found, can't fix CSS`);
    return;
  }
  
  // Read the current CSS
  let cssContent = fs.readFileSync(config.stylesFile, 'utf8');
  
  // Check if we need to add the object-position rule
  if (!cssContent.includes('object-position: top')) {
    console.log('Adding image alignment CSS rule');
    
    // Find the email-thumbnail img rule
    const imgRuleMatch = cssContent.match(/\.email-thumbnail img \{[^}]*\}/);
    
    if (imgRuleMatch) {
      // Add object-position property
      const newRule = imgRuleMatch[0].replace(
        '}',
        '  object-position: top center;\n}'
      );
      
      cssContent = cssContent.replace(imgRuleMatch[0], newRule);
    } else {
      // Add new rule if not found
      cssContent += `
/* Added fix for image alignment */
.email-thumbnail img,
.related-thumbnail img {
  object-fit: cover;
  object-position: top center;
}
`;
    }
  }
  
  // Check if we need to fix related card title colors
  if (!cssContent.includes('.related-title-small {')) {
    console.log('Adding related card title color CSS rules');
    
    // Add new rules for related titles
    cssContent += `
/* Fixed related card title colors */
.related-title-small {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  margin: 0;
  font-size: 1rem;
  color: var(--primary-color);
}

.related-card:hover .related-title-small {
  color: var(--dark-accent);
  text-decoration: underline;
}
`;
  }
  
  // Check if we need to add iframe styling
  if (!cssContent.includes('.preview-iframe')) {
    console.log('Adding preview iframe CSS rule');
    
    // Add iframe styling
    cssContent += `
/* Fixing preview iframe */
.preview-iframe {
  width: 100%;
  height: 600px;
  border: none;
  display: block;
}
`;
  }
  
  // Save the updated CSS
  fs.writeFileSync(config.stylesFile, cssContent);
  console.log('Updated CSS file with fixes');
}

async function fixDetailPageIssues() {
  console.log('Fixing detail page issues...');
  
  // Check if detail pages directory exists
  if (!fs.existsSync(config.detailPagesDir)) {
    console.log(`${config.detailPagesDir} not found, can't fix detail pages`);
    return;
  }
  
  // Get all HTML files
  const detailPages = fs.readdirSync(config.detailPagesDir)
    .filter(file => file.endsWith('.html'));
  
  console.log(`Found ${detailPages.length} detail pages to fix`);
  
  // Process each detail page
  for (const pageFile of detailPages) {
    const pagePath = path.join(config.detailPagesDir, pageFile);
    console.log(`Processing ${pageFile}...`);
    
    // Read the page content
    let content = fs.readFileSync(pagePath, 'utf8');
    
    // Fix paths in Live Preview tab
    const livePreviewMatch = content.match(/'live-tab': '<iframe class="preview-iframe" src="\.\.\/([^"]+)"/);
    if (livePreviewMatch) {
      const currentPath = livePreviewMatch[1];
      
      // Make sure path starts with 'templates/'
      if (!currentPath.startsWith('templates/')) {
        const correctPath = currentPath.includes('/') 
          ? currentPath // Already has a directory prefix
          : `templates/${currentPath}`; // Needs the directory prefix
        
        content = content.replace(
          `src="../${currentPath}"`, 
          `src="../${correctPath}"`
        );
        
        console.log(`  Fixed live preview path: ${correctPath}`);
      }
    }
    
    // Fix empty tabs issue
    const tabContainerMatch = content.match(/<div class="preview-tabs">([\s\S]*?)<\/div>/);
    if (tabContainerMatch) {
      // Count actual tabs
      const tabMatches = tabContainerMatch[1].match(/<button class="preview-tab[^>]*>/g) || [];
      
      // If there are empty buttons, remove them
      if (tabMatches.some(match => match.includes('"></button>'))) {
        console.log('  Removing empty tab buttons');
        
        // Replace empty buttons
        content = content.replace(
          /<button class="preview-tab[^>]*><\/button>/g, 
          ''
        );
      }
    }
    
    // Save the updated content
    fs.writeFileSync(pagePath, content);
    console.log(`  Updated ${pageFile}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
