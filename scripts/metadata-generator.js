// metadata-generator.js
// Script to generate metadata JSON files for email templates

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Configuration
const config = {
  templatesDir: 'templates',
  outputDir: 'docs/data',
  outputFile: 'templates.json',
  metadataTemplate: {
    id: '',
    title: '',
    description: '',
    subjectLine: '',
    path: '',
    client: '',
    dateCreated: '',
    dateUpdated: '',
    tags: [],
    isCMGDemo: false,
    previewStatic: '',
    previewAnimated: '',
    html: '',
    fullDescription: ''
  }
};

/**
 * Main function to generate metadata for all templates
 */
async function generateMetadata() {
  console.log('Starting metadata generation...');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  // Get all HTML files in templates directory
  const templateFiles = getAllHtmlFiles(config.templatesDir);
  
  if (templateFiles.length === 0) {
    console.log('No HTML files found in templates directory.');
    return;
  }
  
  console.log(`Found ${templateFiles.length} template files.`);
  
  // Process each file
  const templateMetadata = [];
  
  for (const filePath of templateFiles) {
    try {
      const metadata = await extractMetadata(filePath);
      templateMetadata.push(metadata);
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }
  
  // Write metadata to JSON file
  const outputPath = path.join(config.outputDir, config.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(templateMetadata, null, 2));
  
  console.log(`Metadata generation complete! Output: ${outputPath}`);
}

/**
 * Get all HTML files recursively in a directory
 */
function getAllHtmlFiles(directory) {
  const results = [];
  
  function traverseDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (file.endsWith('.html')) {
        results.push(fullPath);
      }
    }
  }
  
  traverseDirectory(directory);
  return results;
}

/**
 * Extract metadata from an HTML file
 */
async function extractMetadata(filePath) {
  console.log(`Processing: ${filePath}`);
  
  // Create a new metadata object from template
  const metadata = { ...config.metadataTemplate };
  
  // Basic file info
  const relativePath = path.relative('.', filePath);
  const fileName = path.basename(filePath, '.html');
  const fileDir = path.dirname(filePath);
  const dirSegments = fileDir.split(path.sep);
  
  // File stats
  const stats = fs.statSync(filePath);
  
  // Set basic metadata
  metadata.id = fileName;
  metadata.path = relativePath;
  metadata.dateCreated = formatDate(stats.birthtime);
  metadata.dateUpdated = formatDate(stats.mtime);
  
  // Set preview paths
  metadata.previewStatic = `previews/static/${fileName}.png`;
  metadata.previewAnimated = `previews/animated/${fileName}.gif`;
  
  // Set client from directory structure
  if (dirSegments.includes('client-templates')) {
    const clientIndex = dirSegments.indexOf('client-templates') + 1;
    if (clientIndex < dirSegments.length) {
      metadata.client = dirSegments[clientIndex].replace(/^client-/, '').split('-').map(capitalizeWord).join(' ');
    }
  } else if (dirSegments.includes('generic-templates')) {
    metadata.client = 'Generic';
  } else if (dirSegments.includes('cmg-demo-templates')) {
    metadata.client = 'CMG Demo';
    metadata.isCMGDemo = true;
    metadata.tags.push('CMG Demo');
  }
  
  // Read file content
  const htmlContent = fs.readFileSync(filePath, 'utf8');
  metadata.html = htmlContent;
  
  // Use cheerio to parse HTML and extract metadata
  const $ = cheerio.load(htmlContent);
  
  // Try to extract title
  metadata.title = $('title').text() || 
                   $('meta[name="og:title"]').attr('content') || 
                   $('h1').first().text() || 
                   fileName.split('-').map(capitalizeWord).join(' ');
  
  // Try to extract description
  metadata.description = $('meta[name="description"]').attr('content') || 
                         $('meta[name="og:description"]').attr('content') || 
                         extractTextContent($, 'p', 150);
                         
  // Try to extract subject line from title or metadata
  metadata.subjectLine = $('meta[name="subject-line"]').attr('content') || 
                         $('title').text() || 
                         fileName.split('-').map(capitalizeWord).join(' ');
  
  // Look for metadata in comments
  const metadataComment = htmlContent.match(/<!--\s*METADATA:([\s\S]*?)-->/i);
  if (metadataComment && metadataComment[1]) {
    try {
      const commentMetadata = JSON.parse(metadataComment[1].trim());
      Object.assign(metadata, commentMetadata);
    } catch (e) {
      console.warn(`Error parsing metadata comment in ${filePath}: ${e.message}`);
    }
  }
  
  // Infer tags based on content and filename if not provided
  if (metadata.tags.length === 0) {
    metadata.tags = inferTags(htmlContent, fileName);
  }
  
  // Generate a default full description if not provided
  if (!metadata.fullDescription) {
    metadata.fullDescription = `This ${metadata.title.toLowerCase()} template provides a professional design for ${metadata.client} emails. It features a clean layout that's fully responsive and compatible with all major email clients.`;
  }
  
  return metadata;
}

/**
 * Extract text content from a selector with truncation
 */
function extractTextContent($, selector, maxLength = 200) {
  const elements = $(selector);
  if (elements.length === 0) return '';
  
  let text = '';
  
  for (let i = 0; i < Math.min(3, elements.length); i++) {
    text += $(elements[i]).text() + ' ';
    if (text.length > maxLength) break;
  }
  
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...';
  }
  
  return text.trim();
}

// metadata-generator-fix.js
// Additions to ensure proper template processing

// After extracting metadata from the HTML file, add this section to ensure
// files are properly registered:

// Add this to the extractMetadata function in metadata-generator.js
// after all metadata extraction is complete

function ensureRequiredFields(metadata) {
  // If the file is sample-email-template.html, update ID to match templates.json
  if (metadata.path.includes('sample-email-template.html')) {
    metadata.id = 'abandoned-cart';
  }
  
  // Ensure we have the minimum required fields
  if (!metadata.title) {
    metadata.title = metadata.id.split('-').map(capitalizeWord).join(' ');
  }
  
  if (!metadata.description) {
    metadata.description = `${metadata.title} email template`;
  }
  
  if (!metadata.tags || metadata.tags.length === 0) {
    metadata.tags = ['Template'];
    
    // Add CMG Demo tag if in the CMG Demo directory
    if (metadata.path.includes('cmg-demo-templates')) {
      metadata.tags.push('CMG Demo');
      metadata.isCMGDemo = true;
    }
  }
  
  // Ensure we have preview paths
  if (!metadata.previewStatic) {
    metadata.previewStatic = `previews/static/${metadata.id}.png`;
  }
  
  if (!metadata.previewAnimated) {
    metadata.previewAnimated = `previews/animated/${metadata.id}.gif`;
  }
  
  return metadata;
}

// Add ensureRequiredFields call before returning metadata in extractMetadata function
// metadata = ensureRequiredFields(metadata);
// return metadata;

// Add to generateDetailPage function in generate-detail-pages.js to handle missing properties
function ensureTemplateProperties(template) {
  if (!template.features || template.features.length === 0) {
    template.features = [{
      title: "Responsive Design",
      description: "This template is optimized to display correctly on all devices and email clients."
    }];
  }
  
  if (!template.designNotes) {
    template.designNotes = "This template uses a clean, modern design with a focus on readability and engagement.";
  }
  
  return template;
}

// Add this to the render function for index.html
function addPlaceholderTemplates() {
  if (document.querySelector('.bookshelf').children.length === 0 || 
      document.querySelector('.bookshelf').innerHTML.includes('No templates found')) {
    
    // Create a placeholder template card
    const card = document.createElement('div');
    card.className = 'email-card';
    card.setAttribute('role', 'listitem');
    card.id = 'template-sample';
    
    card.innerHTML = `
      <a href="templates/cmg-demo-templates/sample-email-template.html" class="email-link">View Sample Template</a>
      <div class="client-badge">CMG Demo</div>
      <div class="email-thumbnail">
        <img src="images/placeholder-email.svg" alt="Preview of Sample Email template" />
      </div>
      <div class="email-info">
        <h3 class="email-title">Sample Template</h3>
        <div class="email-meta">
          <div class="tags">
            <span class="tag">Demo</span>
            <span class="tag">CMG Demo</span>
          </div>
          <div class="date">Mar 2025</div>
        </div>
      </div>
    `;
    
    document.querySelector('.bookshelf').innerHTML = '';
    document.querySelector('.bookshelf').appendChild(card);
  }
}

// This function would be added to index.html
// document.addEventListener('DOMContentLoaded', function() {
//   setTimeout(addPlaceholderTemplates, 1000); // Wait for main script to run first
// });

/**
 * Infer tags based on content and filename
 */
function inferTags(htmlContent, fileName) {
  const tags = new Set();
  
  // Common tag mappings
  const tagMappings = {
    'welcome': 'Welcome',
    'newsletter': 'Newsletter',
    'promo': 'Promotional',
    'promotion': 'Promotional',
    'product': 'Product',
    'launch': 'Launch',
    'event': 'Event',
    'invitation': 'Event',
    'invite': 'Event',
    'confirm': 'Transactional',
    'transaction': 'Transactional',
    'receipt': 'Transactional',
    'cart': 'E-commerce',
    'abandon': 'Recovery',
    'recovery': 'Recovery'
  };
  

  // Check filename
  Object.keys(tagMappings).forEach(key => {
    if (fileName.toLowerCase().includes(key)) {
      tags.add(tagMappings[key]);
    }
  });
  
  // Check for layout characteristics
  if (htmlContent.includes('table') && htmlContent.includes('tr') && htmlContent.includes('td')) {
    if ((htmlContent.match(/<table/g) || []).length > 5) {
      tags.add('Complex Layout');
    }
  }
  
  if ((htmlContent.match(/<img/g) || []).length > 3) {
    tags.add('Image Heavy');
  }
  
  // Return as array
  return Array.from(tags);
}

/**
 * Format a date object to YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Capitalize first letter of a word
 */
function capitalizeWord(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Run the script
generateMetadata().catch(console.error);
