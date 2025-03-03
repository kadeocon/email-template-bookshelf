// diagnostic.js
// Script to diagnose issues with the Email Template Bookshelf

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  templatesDir: 'templates',
  docsDir: 'docs',
  detailPagesDir: 'docs/templates',
  templateDataFile: 'docs/data/templates.json',
};

async function runDiagnostics() {
  console.log('=========================================');
  console.log('Email Template Bookshelf Diagnostics Tool');
  console.log('=========================================\n');
  
  // Check template directory structure
  console.log('CHECKING TEMPLATE DIRECTORY STRUCTURE:');
  const templateDirs = getDirectories(config.templatesDir);
  console.log(`Found ${templateDirs.length} template directories:`);
  templateDirs.forEach(dir => console.log(` - ${dir}`));
  console.log('');

  // Find HTML files
  console.log('CHECKING HTML TEMPLATE FILES:');
  const htmlFiles = getAllHtmlFiles(config.templatesDir);
  console.log(`Found ${htmlFiles.length} HTML template files:`);
  htmlFiles.forEach(file => console.log(` - ${file}`));
  console.log('');

  // Check metadata in HTML files
  console.log('CHECKING METADATA IN HTML FILES:');
  for (const file of htmlFiles) {
    checkMetadataInFile(file);
  }
  console.log('');

  // Check templates.json
  console.log('CHECKING TEMPLATES.JSON FILE:');
  checkTemplatesJson();
  console.log('');

  // Check generated detail pages
  console.log('CHECKING GENERATED DETAIL PAGES:');
  checkDetailPages();
  console.log('');

  // Check index.html and search.js for hardcoded values
  console.log('CHECKING FOR HARDCODED VALUES:');
  checkHardcodedValues();
  console.log('');

  console.log('=========================================');
  console.log('DIAGNOSTIC SUMMARY:');
  console.log('1. Check if all template HTML files have correct metadata');
  console.log('2. Verify that templates.json contains entries for all templates');
  console.log('3. Confirm detail pages are generated in the correct location');
  console.log('4. Look for hardcoded values in JavaScript files that might override dynamic content');
  console.log('=========================================');
}

function getDirectories(source) {
  if (!fs.existsSync(source)) return [];
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(source, dirent.name));
}

function getAllHtmlFiles(directory) {
  const results = [];
  
  function traverseDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
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

function checkMetadataInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    console.log(`\nFile: ${filePath}`);
    
    // Check for metadata comment
    const metadataMatch = content.match(/<!--\s*METADATA:([\s\S]*?)-->/i);
    if (metadataMatch) {
      console.log('  ✅ Metadata comment found');
      
      try {
        const metadata = JSON.parse(metadataMatch[1].trim());
        console.log(`  ✅ Metadata is valid JSON`);
        console.log(`  📋 Title: ${metadata.title || 'Not specified'}`);
        console.log(`  📋 Description: ${metadata.description ? 'Present' : 'Not specified'}`);
        console.log(`  📋 Tags: ${metadata.tags ? metadata.tags.join(', ') : 'Not specified'}`);
      } catch (e) {
        console.log(`  ❌ Metadata is not valid JSON: ${e.message}`);
      }
    } else {
      console.log('  ❌ No metadata comment found');
    }
    
    // Check for title
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      console.log(`  ✅ Title tag found: "${titleMatch[1].trim()}"`);
    } else {
      console.log('  ❌ No title tag found');
    }
  } catch (error) {
    console.log(`  ❌ Error reading file: ${error.message}`);
  }
}

function checkTemplatesJson() {
  const templateJsonPath = config.templateDataFile;
  
  if (!fs.existsSync(templateJsonPath)) {
    console.log(`❌ templates.json file not found at ${templateJsonPath}`);
    return;
  }
  
  try {
    const templatesData = JSON.parse(fs.readFileSync(templateJsonPath, 'utf8'));
    console.log(`✅ templates.json file found with ${templatesData.length} entries`);
    
    templatesData.forEach((template, index) => {
      console.log(`\nTemplate #${index + 1}: ${template.id}`);
      console.log(`  📋 Title: ${template.title || 'Not specified'}`);
      console.log(`  📋 Path: ${template.path || 'Not specified'}`);
      console.log(`  📋 Tags: ${template.tags ? template.tags.join(', ') : 'Not specified'}`);
      
      // Check if the HTML file exists
      if (template.path && fs.existsSync(template.path)) {
        console.log(`  ✅ HTML file exists at path: ${template.path}`);
      } else if (template.path) {
        console.log(`  ❌ HTML file NOT found at path: ${template.path}`);
      } else {
        console.log(`  ❌ No path specified`);
      }
      
      // Check if preview images exist
      if (template.previewStatic) {
        const fullPathStatic = path.join(config.docsDir, template.previewStatic);
        if (fs.existsSync(fullPathStatic)) {
          console.log(`  ✅ Static preview exists: ${fullPathStatic}`);
        } else {
          console.log(`  ❌ Static preview NOT found: ${fullPathStatic}`);
        }
      }
      
      if (template.previewAnimated) {
        const fullPathAnimated = path.join(config.docsDir, template.previewAnimated);
        if (fs.existsSync(fullPathAnimated)) {
          console.log(`  ✅ Animated preview exists: ${fullPathAnimated}`);
        } else {
          console.log(`  ❌ Animated preview NOT found: ${fullPathAnimated}`);
        }
      }
    });
  } catch (error) {
    console.log(`❌ Error parsing templates.json: ${error.message}`);
  }
}

function checkDetailPages() {
  if (!fs.existsSync(config.detailPagesDir)) {
    console.log(`❌ Detail pages directory not found at ${config.detailPagesDir}`);
    return;
  }
  
  const detailPages = fs.readdirSync(config.detailPagesDir)
    .filter(file => file.endsWith('.html'));
  
  console.log(`Found ${detailPages.length} detail pages in ${config.detailPagesDir}:`);
  detailPages.forEach(file => console.log(` - ${file}`));
  
  // Check if we have templates.json to compare
  if (fs.existsSync(config.templateDataFile)) {
    try {
      const templatesData = JSON.parse(fs.readFileSync(config.templateDataFile, 'utf8'));
      const templateIds = templatesData.map(template => `${template.id}.html`);
      
      console.log('\nComparing detail pages with templates.json:');
      templateIds.forEach(id => {
        if (detailPages.includes(id)) {
          console.log(`  ✅ Detail page exists for template: ${id}`);
        } else {
          console.log(`  ❌ Detail page MISSING for template: ${id}`);
        }
      });
      
      detailPages.forEach(page => {
        if (!templateIds.includes(page)) {
          console.log(`  ⚠️ Detail page exists but no matching template in templates.json: ${page}`);
        }
      });
    } catch (error) {
      console.log(`❌ Error comparing detail pages: ${error.message}`);
    }
  }
}

function checkHardcodedValues() {
  // Check index.html for hardcoded template cards
  if (fs.existsSync('docs/index.html')) {
    const indexContent = fs.readFileSync('docs/index.html', 'utf8');
    if (indexContent.includes('template-fallback')) {
      console.log('⚠️ Found hardcoded fallback template in index.html');
    }
    
    if (indexContent.includes('Sample Email Template')) {
      console.log('⚠️ Found hardcoded "Sample Email Template" text in index.html');
    }
  }
  
  // Check search.js for hardcoded template values
  if (fs.existsSync('docs/js/search.js')) {
    const searchJsContent = fs.readFileSync('docs/js/search.js', 'utf8');
    if (searchJsContent.includes('addFallbackTemplate')) {
      console.log('⚠️ Found fallback template generator in search.js');
      
      // Extract fallback template details
      const fallbackMatch = searchJsContent.match(/templates\s*=\s*\[\s*\{([^}]+)\}\s*\]/);
      if (fallbackMatch) {
        console.log('📋 Fallback template details:');
        console.log(fallbackMatch[1].trim().split('\n').map(line => `    ${line.trim()}`).join('\n'));
      }
    }
    
    // Check for path remapping
    if (searchJsContent.includes('template.path = ')) {
      console.log('⚠️ Found path remapping in search.js');
    }
  }
}

// Run the diagnostics
runDiagnostics().catch(console.error);
