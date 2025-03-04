// simple-detail-pages.js
// A simplified detail page generator without external dependencies

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  templatesDir: 'templates',
  docsDir: 'docs',
  detailPagesDir: 'docs/templates',
  templateDataFile: 'docs/data/templates.json',
  detailPageTemplate: 'templates/detail-page-template.html'
};

/**
 * Main function to generate detail pages
 */
async function generateDetailPages() {
  console.log('Starting detail page generation...');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.detailPagesDir)) {
    fs.mkdirSync(config.detailPagesDir, { recursive: true });
    console.log(`Created detail pages directory: ${config.detailPagesDir}`);
  }
  
  // Check if template data file exists
  if (!fs.existsSync(config.templateDataFile)) {
    console.error(`Template data file not found: ${config.templateDataFile}`);
    return;
  }
  
  // Check if detail page template exists
  if (!fs.existsSync(config.detailPageTemplate)) {
    console.error(`Detail page template not found: ${config.detailPageTemplate}`);
    return;
  }
  
  // Load template data
  let templateData;
  try {
    templateData = JSON.parse(fs.readFileSync(config.templateDataFile, 'utf8'));
    console.log(`Loaded ${templateData.length} templates from ${config.templateDataFile}`);
  } catch (error) {
    console.error(`Error loading template data: ${error.message}`);
    return;
  }
  
  // Load detail page template
  let pageTemplate;
  try {
    pageTemplate = fs.readFileSync(config.detailPageTemplate, 'utf8');
    console.log(`Loaded detail page template from ${config.detailPageTemplate}`);
  } catch (error) {
    console.error(`Error loading detail page template: ${error.message}`);
    return;
  }
  
  // Process each template
  for (const template of templateData) {
    try {
      console.log(`Generating detail page for template: ${template.id}`);
      
      // Ensure template has all required properties
      const enhancedTemplate = ensureTemplateProperties(template);
      
      // Generate the detail page
      await generateDetailPage(enhancedTemplate, pageTemplate);
    } catch (error) {
      console.error(`Error generating detail page for ${template.id}:`, error);
    }
  }
  
  console.log('Detail page generation complete!');
}

/**
 * Ensure template has all required properties
 */
function ensureTemplateProperties(template) {
  // Create a copy to avoid modifying the original
  const enhancedTemplate = { ...template };
  
  // Ensure basic properties exist
  if (!enhancedTemplate.title) {
    enhancedTemplate.title = enhancedTemplate.id.split('-').map(capitalizeWord).join(' ');
    console.log(`Added missing title for ${enhancedTemplate.id}: ${enhancedTemplate.title}`);
  }
  
  if (!enhancedTemplate.description) {
    enhancedTemplate.description = `${enhancedTemplate.title} email template`;
    console.log(`Added missing description for ${enhancedTemplate.id}`);
  }
  
  if (!enhancedTemplate.fullDescription) {
    enhancedTemplate.fullDescription = enhancedTemplate.description;
    console.log(`Added missing fullDescription for ${enhancedTemplate.id}`);
  }
  
  // Ensure features exist
  if (!enhancedTemplate.features || enhancedTemplate.features.length === 0) {
    enhancedTemplate.features = [{
      title: "Responsive Design",
      description: "This template is optimized to display correctly on all devices and email clients."
    }];
    console.log(`Added default features for ${enhancedTemplate.id}`);
  }
  
  // Ensure designNotes exist
  if (!enhancedTemplate.designNotes) {
    enhancedTemplate.designNotes = "This template uses a clean, modern design with a focus on readability and engagement.";
    console.log(`Added default designNotes for ${enhancedTemplate.id}`);
  }
  
  // Ensure preview paths exist
  if (!enhancedTemplate.previewStatic) {
    enhancedTemplate.previewStatic = `previews/static/${enhancedTemplate.id}.png`;
  }
  
  if (!enhancedTemplate.previewAnimated) {
    enhancedTemplate.previewAnimated = `previews/animated/${enhancedTemplate.id}.gif`;
  }
  
  // Ensure client and tags
  if (!enhancedTemplate.client) {
    enhancedTemplate.client = "Generic";
  }
  
  if (!enhancedTemplate.tags || enhancedTemplate.tags.length === 0) {
    enhancedTemplate.tags = ["Template"];
  }
  
  return enhancedTemplate;
}

/**
 * Generate a detail page for a specific template
 */
async function generateDetailPage(template, pageTemplate) {
  console.log(`Generating detail page for ${template.id}...`);
  
  // No markdown processing in this simplified version
  let processedDescription = template.fullDescription || template.description;
  
  // Generate features HTML
  let featuresHTML = '';
  if (template.features && template.features.length > 0) {
    featuresHTML = '<div class="features-list">';
    
    for (const feature of template.features) {
      featuresHTML += `
        <div class="feature-item">
          <h3 class="feature-title">${feature.title}</h3>
          <p>${feature.description}</p>
        </div>
      `;
    }
    
    featuresHTML += '</div>';
  }
  
  // Generate tags HTML
  const tagsHTML = (template.tags || []).map(tag => 
    `<span class="tag">${tag}</span>`
  ).join('\n');
  
  // Generate subject line HTML
  let subjectLineHTML = '';
  if (template.subjectLine) {
    subjectLineHTML = `
      <div class="meta-line">
        <span class="meta-label">Subject Line:</span> ${template.subjectLine}
      </div>
    `;
  }
  
  // Format dates
  const createdDate = formatDate(template.dateCreated || template.date || new Date().toISOString());
  const updatedDate = template.dateUpdated ? formatDate(template.dateUpdated) : createdDate;
  
  // Replace placeholders in template
  let pageHTML = pageTemplate
    // Basic metadata
    .replace(/{{templateId}}/g, template.id)
    .replace(/{{templateTitle}}/g, template.title)
    .replace(/{{clientName}}/g, template.client)
    .replace(/{{createdDate}}/g, createdDate)
    .replace(/{{updatedDate}}/g, updatedDate)
    .replace(/{{htmlPath}}/g, template.path.replace('templates/', '').replace(/\\/g, '/'))
    .replace(/{{staticPreview}}/g, template.previewStatic)
    .replace(/{{animatedPreview}}/g, template.previewAnimated)
    
    // HTML sections
    .replace(/{{tagsHTML}}/g, tagsHTML)
    .replace(/{{subjectLineHTML}}/g, subjectLineHTML)
    .replace(/{{fullDescription}}/g, processedDescription)
    .replace(/{{featuresHTML}}/g, featuresHTML)
    
    // Optional sections
    .replace(/{{designNotes}}/g, template.designNotes || '');
  
  // Remove any unused placeholders with empty strings
  pageHTML = pageHTML.replace(/{{[^}]+}}/g, '');
  
  // Write the file
  const outputPath = path.join(config.detailPagesDir, `${template.id}.html`);
  fs.writeFileSync(outputPath, pageHTML);
  
  console.log(`Detail page created: ${outputPath}`);
}

/**
 * Format a date string (YYYY-MM-DD) into a month year format
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown Date';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Capitalize first letter of a word
 */
function capitalizeWord(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Run the script
generateDetailPages().catch(console.error);
