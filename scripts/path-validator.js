// path-validator.js
// Validate and fix paths in templates.json

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  templatesDir: 'templates',
  docsDir: 'docs',
  dataFile: 'docs/data/templates.json',
  previewsDir: 'docs/previews',
  detailPagesDir: 'docs/templates'
};

async function main() {
  console.log('Starting path validation and correction...');
  
  // Check if templates.json exists
  if (!fs.existsSync(config.dataFile)) {
    console.error(`ERROR: templates.json file not found at ${config.dataFile}`);
    return;
  }
  
  // Load templates data
  console.log(`Loading templates data from ${config.dataFile}...`);
  let templatesData;
  try {
    templatesData = JSON.parse(fs.readFileSync(config.dataFile, 'utf8'));
    console.log(`Loaded ${templatesData.length} template entries`);
  } catch (error) {
    console.error(`ERROR parsing templates.json: ${error.message}`);
    return;
  }
  
  // Validate and correct paths
  let correctedCount = 0;
  
  for (let i = 0; i < templatesData.length; i++) {
    const template = templatesData[i];
    console.log(`\nValidating template: ${template.id}`);
    
    // Check if template.path points to a valid file
    if (template.path) {
      console.log(`- Template path: ${template.path}`);
      
      const absolutePath = path.resolve(template.path);
      const fileExists = fs.existsSync(absolutePath);
      
      console.log(`- File exists: ${fileExists}`);
      
      if (!fileExists) {
        // Try to find the correct file path
        const possiblePaths = findPossibleTemplatePaths(template.id);
        console.log(`- Possible alternative paths: ${possiblePaths.length}`);
        
        if (possiblePaths.length > 0) {
          // Use the first found path as a replacement
          const newPath = possiblePaths[0].replace(/\\/g, '/');
          console.log(`- Correcting path from "${template.path}" to "${newPath}"`);
          template.path = newPath;
          correctedCount++;
        }
      }
    } else {
      console.log(`- No path specified for template ${template.id}`);
      
      // Try to find a path for this template
      const possiblePaths = findPossibleTemplatePaths(template.id);
      if (possiblePaths.length > 0) {
        const newPath = possiblePaths[0].replace(/\\/g, '/');
        console.log(`- Adding path: "${newPath}"`);
        template.path = newPath;
        correctedCount++;
      }
    }
    
    // Check and correct preview paths
    const staticPreviewPath = `previews/static/${template.id}.png`;
    const animatedPreviewPath = `previews/animated/${template.id}.gif`;
    
    if (template.previewStatic !== staticPreviewPath) {
      console.log(`- Correcting static preview path from "${template.previewStatic}" to "${staticPreviewPath}"`);
      template.previewStatic = staticPreviewPath;
      correctedCount++;
    }
    
    if (template.previewAnimated !== animatedPreviewPath) {
      console.log(`- Correcting animated preview path from "${template.previewAnimated}" to "${animatedPreviewPath}"`);
      template.previewAnimated = animatedPreviewPath;
      correctedCount++;
    }
  }
  
  // Save corrected data if changes were made
  if (correctedCount > 0) {
    console.log(`\nSaving ${correctedCount} path corrections to templates.json...`);
    fs.writeFileSync(config.dataFile, JSON.stringify(templatesData, null, 2));
    console.log('Save complete');
  } else {
    console.log('\nNo path corrections needed');
  }
  
  // Verify detail pages
  console.log('\nVerifying detail pages...');
  verifyDetailPages(templatesData);
}

// Find possible paths for a template with the given ID
function findPossibleTemplatePaths(templateId) {
  const possiblePaths = [];
  
  function searchDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        searchDirectory(fullPath);
      } else if (item === `${templateId}.html` || 
                 item.toLowerCase() === `${templateId.toLowerCase()}.html`) {
        possiblePaths.push(fullPath);
      }
    }
  }
  
  searchDirectory(config.templatesDir);
  return possiblePaths;
}

// Verify detail pages match templates.json data
function verifyDetailPages(templatesData) {
  if (!fs.existsSync(config.detailPagesDir)) {
    console.error(`Detail pages directory does not exist: ${config.detailPagesDir}`);
    return;
  }
  
  const detailPages = fs.readdirSync(config.detailPagesDir)
    .filter(file => file.endsWith('.html'));
  
  console.log(`Found ${detailPages.length} detail pages`);
  
  // Check if all templates have detail pages
  for (const template of templatesData) {
    const detailPageName = `${template.id}.html`;
    const detailPagePath = path.join(config.detailPagesDir, detailPageName);
    
    if (detailPages.includes(detailPageName)) {
      console.log(`- Detail page exists for ${template.id}`);
      
      // Optional: check content of detail page
      if (fs.existsSync(detailPagePath)) {
        const content = fs.readFileSync(detailPagePath, 'utf8');
        
        // Check if path in live preview tab matches template.path
        const templatePath = template.path.replace('templates/', '');
        const liveTabPattern = new RegExp(`src=["']\\.\\./${templatePath}["']`);
        
        if (!liveTabPattern.test(content)) {
          console.log(`  - WARNING: Live preview path in detail page doesn't match template.path`);
          console.log(`    Expected: ../[${templatePath}]`);
        }
      }
    } else {
      console.log(`- Missing detail page for ${template.id}`);
    }
  }
}

// For local testing and GitHub Actions
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error in path validation:', error);
    process.exit(1);
  });
}

module.exports = { main };
