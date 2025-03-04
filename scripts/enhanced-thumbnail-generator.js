// enhanced-thumbnail-generator.js
// An improved version of thumbnail-generator.js with better error handling and GitHub Actions compatibility

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Configuration
const config = {
  templatesDir: 'templates',
  staticThumbnailsDir: 'docs/previews/static',
  thumbnailWidth: 800,
  thumbnailHeight: 1200,
  debug: true // Enable verbose logging
};

async function main() {
  console.log('Starting enhanced thumbnail generation process...');
  
  // Create directories if they don't exist
  ensureDirectoriesExist();
  
  // Get all HTML files
  const templateFiles = getAllHtmlFiles();
  console.log(`Found ${templateFiles.length} HTML template files to process`);
  
  if (templateFiles.length === 0) {
    console.error('ERROR: No HTML files found to process');
    return;
  }
  
  console.log('Files to process:');
  templateFiles.forEach(file => console.log(` - ${file}`));
  
  // Launch browser with settings optimized for GitHub Actions
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,1024'
    ],
    headless: true
  }).catch(err => {
    console.error('Failed to launch browser:', err);
    throw err;
  });
  
  console.log('Browser launched successfully');
  
  // Process each file
  let successCount = 0;
  let failureCount = 0;
  
  for (const filePath of templateFiles) {
    try {
      await processFile(filePath, browser);
      successCount++;
    } catch (error) {
      console.error(`ERROR processing ${filePath}:`, error);
      failureCount++;
    }
  }
  
  // Close browser
  await browser.close();
  console.log('Browser closed');
  
  console.log(`Thumbnail generation summary:`);
  console.log(`- Total files processed: ${templateFiles.length}`);
  console.log(`- Successful: ${successCount}`);
  console.log(`- Failed: ${failureCount}`);
}

function getAllHtmlFiles() {
  const results = [];
  
  function traverseDirectory(dir) {
    if (!fs.existsSync(dir)) {
      console.error(`Directory does not exist: ${dir}`);
      return;
    }
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      // Skip if path doesn't exist (safety check)
      if (!fs.existsSync(fullPath)) {
        console.warn(`Path does not exist: ${fullPath}`);
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (file.endsWith('.html') && !file.includes('detail-page-template')) {
        results.push(fullPath);
      }
    }
  }
  
  traverseDirectory(config.templatesDir);
  return results;
}

function ensureDirectoriesExist() {
  if (!fs.existsSync(config.staticThumbnailsDir)) {
    console.log(`Creating directory: ${config.staticThumbnailsDir}`);
    fs.mkdirSync(config.staticThumbnailsDir, { recursive: true });
  }
}

async function processFile(filePath, browser) {
  const fileName = path.basename(filePath, '.html');
  const staticThumbnailPath = path.join(config.staticThumbnailsDir, `${fileName}.png`);
  
  console.log(`\nProcessing ${filePath}...`);
  
  // Create a new page
  const page = await browser.newPage().catch(err => {
    console.error('Failed to create new page:', err);
    throw err;
  });
  
  try {
    // Log progress
    console.log(`- Reading file content for ${filePath}`);
    
    // Read the HTML file
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    console.log(`- File read successfully, size: ${htmlContent.length} bytes`);
    
    // Set viewport to an email-like dimension
    console.log(`- Setting viewport to ${config.thumbnailWidth}x${config.thumbnailHeight}`);
    await page.setViewport({
      width: config.thumbnailWidth,
      height: config.thumbnailHeight,
      deviceScaleFactor: 1, // Lower for better performance
    });
    
    // Load the HTML content with timeout and wait options
    console.log(`- Loading HTML content into page`);
    await page.setContent(htmlContent, { 
      waitUntil: ['load', 'networkidle2'],
      timeout: 30000 // 30 second timeout
    }).catch(err => {
      console.error(`- Failed to load HTML content: ${err.message}`);
      throw err;
    });
    
    console.log(`- Content loaded successfully`);
    
    // Wait a bit for any resources to load
    await page.waitForTimeout(1000);
    
    // Take screenshot
    console.log(`- Taking screenshot and saving to ${staticThumbnailPath}`);
    await page.screenshot({
      path: staticThumbnailPath,
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: config.thumbnailWidth,
        height: config.thumbnailHeight,
      },
      omitBackground: false
    }).catch(err => {
      console.error(`- Failed to take screenshot: ${err.message}`);
      throw err;
    });
    
    console.log(`✓ Created static thumbnail: ${staticThumbnailPath}`);
    
    // Verify the screenshot was created and has content
    if (fs.existsSync(staticThumbnailPath)) {
      const fileStats = fs.statSync(staticThumbnailPath);
      console.log(`- Thumbnail file size: ${fileStats.size} bytes`);
      
      if (fileStats.size < 100) {
        console.warn(`- WARNING: Thumbnail file is suspiciously small (${fileStats.size} bytes)`);
      }
    } else {
      throw new Error(`Failed to create thumbnail - file not found: ${staticThumbnailPath}`);
    }
  } catch (error) {
    console.error(`- Error generating thumbnail for ${filePath}:`, error);
    throw error;
  } finally {
    // Always close the page to free resources
    await page.close().catch(err => console.error('Error closing page:', err));
  }
}

// For local testing and GitHub Actions
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error in thumbnail generation:', error);
    process.exit(1);
  });
}

module.exports = { main };
