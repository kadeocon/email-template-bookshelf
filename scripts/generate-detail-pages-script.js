// generate-detail-pages.js
// Script to automatically generate detail pages for each email template

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

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
  }
  
  // Load template data
  const templateData = JSON.parse(fs.readFileSync(config.templateDataFile, 'utf8'));
  
  // Load detail page template
  const pageTemplate = fs.readFileSync(config.detailPageTemplate, 'utf8');
  
  // Process each template
  for (const template of templateData) {
    try {
      await generateDetailPage(template, pageTemplate);
    } catch (error) {
      console.error(`Error generating detail page for ${template.id}:`, error);
    }
  }
  
  console.log('Detail page generation complete!');
}

/**
 * Generate a detail page for a specific template
 */
async function generateDetailPage(template, pageTemplate) {
  console.log(`Generating detail page for ${template.id}...`);
  
  // Process markdown content if needed
  let processedDescription = template.fullDescription || template.description;
  if (template.fullDescription && template.fullDescription.includes('\n')) {
    processedDescription = marked(template.fullDescription);
  }
  
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
  const tagsHTML = template.tags.map(tag => 
    `<span class="tag">${tag}</span>`
  ).join('\n');
  
  // Generate compatible with HTML
  let subjectLineHTML = '';
  if (template.subjectLine) {
    subjectLineHTML = `
      <div class="meta-line">
        <span class="meta-label">Subject Line:</span> ${template.subjectLine}
      </div>
    `;
  }
  
  // Format dates
  const createdDate = formatDate(template.dateCreated || template.date);
  const updatedDate = template.dateUpdated ? formatDate(template.dateUpdated) : createdDate;
  
  // Replace placeholders in template
  let pageHTML = pageTemplate
    // Basic metadata
    .replace(/{{templateId}}/g, template.id)
    .replace(/{{templateTitle}}/g, template.title)
    .replace(/{{clientName}}/g, template.client)
    .replace(/{{createdDate}}/g, createdDate)
    .replace(/{{updatedDate}}/g, updatedDate)
    .replace(/{{htmlPath}}/g, template.path.replace('templates/', ''))
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

// Run the script
generateDetailPages().catch(console.error);
