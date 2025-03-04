// simple-check-templates.js
const fs = require('fs');
const path = require('path');

// Find all HTML files in templates directory
function getAllHtmlFiles(directory) {
  const results = [];
  
  function traverseDirectory(dir) {
    if (!fs.existsSync(dir)) {
      console.error(`Directory does not exist: ${dir}`);
      return;
    }
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (file.endsWith('.html') && !file.includes('detail-page-template')) {
        results.push(fullPath);
      }
    }
  }
  
  traverseDirectory(directory);
  return results;
}

// Main function
function checkTemplates() {
  console.log('=========================================');
  console.log('Email Template Validation Tool');
  console.log('=========================================\n');
  
  // Find all HTML template files
  const htmlFiles = getAllHtmlFiles('templates');
  console.log(`Found ${htmlFiles.length} HTML template files:`);
  
  for (const file of htmlFiles) {
    console.log(`\nFile: ${file}`);
    
    try {
      // Read file content
      const content = fs.readFileSync(file, 'utf8');
      
      // Check file size
      console.log(`- Size: ${content.length} characters`);
      
      // Check for metadata comment
      const hasMetadata = content.includes('METADATA:');
      console.log(`- Has METADATA comment: ${hasMetadata ? 'Yes' : 'No'}`);
      
      // Check for title tag
      const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
      console.log(`- Title tag: ${titleMatch ? titleMatch[1] : 'Not found'}`);
      
      // Check for basic HTML structure
      console.log(`- Has HTML tag: ${content.includes('<html') ? 'Yes' : 'No'}`);
      console.log(`- Has BODY tag: ${content.includes('<body') ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.error(`Error reading file: ${error.message}`);
    }
  }
  
  console.log('\n=========================================');
  console.log(`Total HTML files found: ${htmlFiles.length}`);
  console.log('=========================================');
}

// Run the checks
checkTemplates();