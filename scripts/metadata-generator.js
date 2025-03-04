// fixed-metadata-generator.js
// A simpler, more robust version of the metadata generator

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  templatesDir: 'templates',
  outputDir: 'docs/data',
  outputFile: 'templates.json'
};

// Main function
async function generateMetadata() {
  console.log('Starting metadata generation...');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    console.log(`Created output directory: ${config.outputDir}`);
  }
  
  // Get all HTML files in templates directory
  const templateFiles = getAllHtmlFiles(config.templatesDir);
  console.log(`Found ${templateFiles.length} HTML template files`);
  
  if (templateFiles.length === 0) {
    console.error('ERROR: No HTML template files found');
    console.log(`Checked in directory: ${path.resolve(config.templatesDir)}`);
    
    // List contents of templates directory to debug
    if (fs.existsSync(config.templatesDir)) {
      console.log('Contents of templates directory:');
      listDirectoryContents(config.templatesDir);
    } else {
      console.error(`Templates directory does not exist: ${config.templatesDir}`);
    }
    
    return;
  }
  
  // Print found files
  console.log('Template files found:');
  templateFiles.forEach(file => console.log(` - ${file}`));
  
  // Process each file
  const templates = [];
  
  for (const filePath of templateFiles) {
    try {
      console.log(`\nProcessing: ${filePath}`);
      
      // Extract metadata
      const metadata = extractMetadata(filePath);
      console.log(`Extracted metadata for: ${metadata.id}`);
      
      templates.push(metadata);
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }
  
  // Save metadata to file
  const outputPath = path.join(config.outputDir, config.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(templates, null, 2));
  
  console.log(`\nMetadata generation complete!`);
  console.log(`Saved ${templates.length} templates to: ${outputPath}`);
  
  // Output the templates.json content for debugging
  console.log('\ntemplates.json content:');
  console.log(JSON.stringify(templates, null, 2));
}

// Get all HTML files recursively in a directory
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

// List directory contents for debugging
function listDirectoryContents(directory) {
  try {
    const items = fs.readdirSync(directory);
    
    items.forEach(item => {
      const itemPath = path.join(directory, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        console.log(` [DIR] ${itemPath}`);
      } else {
        console.log(` [FILE] ${itemPath} (${stat.size} bytes)`);
      }
    });
  } catch (error) {
    console.error(`Error listing directory contents: ${error.message}`);
  }
}

// Extract metadata from an HTML file
function extractMetadata(filePath) {
  // Create a new metadata object
  const fileName = path.basename(filePath, '.html');
  
  // Make path use forward slashes for web compatibility
  const relativePath = path.relative('.', filePath).replace(/\\/g, '/');
  
  // Default metadata
  const metadata = {
    id: fileName,
    title: fileName.split('-').map(capitalizeWord).join(' '),
    description: '',
    path: relativePath,
    client: 'Generic',
    tags: ['Template'],
    previewStatic: `previews/static/${fileName}.png`,
    previewAnimated: `previews/animated/${fileName}.gif`
  };
  
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Use title tag if available
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }
    
    // Extract metadata comment
    const metadataMatch = content.match(/<!--\s*METADATA:([\s\S]*?)-->/i);
    if (metadataMatch) {
      try {
        // Parse the metadata JSON
        const commentMetadata = JSON.parse(metadataMatch[1].trim());
        
        // Merge with existing metadata
        Object.assign(metadata, commentMetadata);
        
        console.log(`Successful metadata extraction from: ${fileName}`);
      } catch (e) {
        console.error(`Error parsing metadata JSON in ${filePath}: ${e.message}`);
        console.log('Raw metadata content:');
        console.log(metadataMatch[1].trim());
      }
    } else {
      console.log(`No METADATA comment found in ${filePath}`);
    }
    
    // Set client based on directory
    if (relativePath.includes('client-templates')) {
      // Extract client name from path or filename
      metadata.client = path.dirname(relativePath).split('/').pop() || 
                       fileName.split('-')[0] || 'Client';
      metadata.client = metadata.client.replace(/^client-/, '').split('-').map(capitalizeWord).join(' ');
    } else if (relativePath.includes('cmg-demo-templates')) {
      metadata.client = 'CMG Demo';
      metadata.isCMGDemo = true;
      
      // Add CMG Demo tag if not already present
      if (!metadata.tags.includes('CMG Demo')) {
        metadata.tags.push('CMG Demo');
      }
    }
  } catch (error) {
    console.error(`Error reading ${filePath}: ${error.message}`);
  }
  
  return metadata;
}

// Capitalize first letter of a word
function capitalizeWord(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Run the script
generateMetadata().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
