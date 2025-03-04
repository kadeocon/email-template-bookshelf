// extract-metadata.js
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

// Extract metadata from HTML file
function extractMetadata(filePath) {
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract metadata comment
    const metadataMatch = content.match(/<!--\s*METADATA:([\s\S]*?)-->/i);
    if (!metadataMatch) {
      return { error: "No METADATA comment found" };
    }
    
    // Get the metadata content
    const metadataContent = metadataMatch[1].trim();
    
    // Try to parse as JSON
    try {
      const metadata = JSON.parse(metadataContent);
      return { success: true, metadata };
    } catch (e) {
      return { 
        error: `Invalid JSON in METADATA: ${e.message}`,
        rawContent: metadataContent
      };
    }
  } catch (error) {
    return { error: `File read error: ${error.message}` };
  }
}

// Main function
function extractAllMetadata() {
  console.log('=========================================');
  console.log('Metadata Extraction Test');
  console.log('=========================================\n');
  
  // Find all HTML template files
  const htmlFiles = getAllHtmlFiles('templates');
  console.log(`Found ${htmlFiles.length} HTML template files`);
  
  // Simulate templates.json
  const templatesJson = [];
  
  // Process each file
  for (const file of htmlFiles) {
    console.log(`\nFile: ${file}`);
    
    // Extract metadata
    const result = extractMetadata(file);
    
    if (result.error) {
      console.error(`ERROR: ${result.error}`);
      if (result.rawContent) {
        console.log("Raw metadata content:");
        console.log(result.rawContent);
      }
    } else {
      console.log("Successfully extracted metadata:");
      console.log(JSON.stringify(result.metadata, null, 2));
      
      // Basic file info
      const relativePath = path.relative('.', file);
      const fileName = path.basename(file, '.html');
      
      // Create a template object for templates.json
      const templateObject = {
        id: fileName,
        title: result.metadata.title || fileName,
        description: result.metadata.description || '',
        path: relativePath,
        tags: result.metadata.tags || [],
        previewStatic: `previews/static/${fileName}.png`,
        previewAnimated: `previews/animated/${fileName}.gif`
      };
      
      templatesJson.push(templateObject);
    }
  }
  
  console.log('\n=========================================');
  console.log('Generated templates.json would be:');
  console.log(JSON.stringify(templatesJson, null, 2));
  console.log('=========================================');
  
  // Check if templates.json exists
  const templatesJsonPath = 'docs/data/templates.json';
  if (fs.existsSync(templatesJsonPath)) {
    try {
      const existingJson = JSON.parse(fs.readFileSync(templatesJsonPath, 'utf8'));
      console.log('\nExisting templates.json contains:');
      console.log(JSON.stringify(existingJson, null, 2));
      
      if (existingJson.length === 0) {
        console.log('\nWARNING: Existing templates.json is empty ([]). This explains why no templates are displayed.');
      }
    } catch (e) {
      console.error(`Error reading existing templates.json: ${e.message}`);
    }
  } else {
    console.log('\nNo existing templates.json found at:', templatesJsonPath);
  }
}

// Run the extraction
extractAllMetadata();
