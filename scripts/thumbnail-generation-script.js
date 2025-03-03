// thumbnail-generator.js
// This script will be used in a GitHub Action to automatically generate thumbnails

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

// Configuration
const config = {
  templatesDir: 'templates',
  staticThumbnailsDir: 'docs/previews/static',
  gifThumbnailsDir: 'docs/previews/animated',
  thumbnailWidth: 800,
  thumbnailHeight: 1200,
  customerIoUrl: 'https://customer.io/tools/scroll-my-email',
};

async function main() {
  console.log('Starting thumbnail generation process...');
  
  // Check if we should process all files or just changed ones
  const processAll = process.env.PROCESS_ALL === 'true';
  
  // Get list of HTML files to process
  let filesToProcess;
  
  if (processAll) {
    console.log('Processing ALL template files...');
    filesToProcess = getAllHtmlFiles();
  } else {
    console.log('Processing only CHANGED template files...');
    filesToProcess = getChangedHtmlFiles();
  }
  
  if (filesToProcess.length === 0) {
    console.log('No HTML files were found to process. Exiting.');
    return;
  }
  
  console.log(`Found ${filesToProcess.length} HTML files to process:`);
  filesToProcess.forEach(file => console.log(` - ${file}`));
  
  // Create directories if they don't exist
  ensureDirectoriesExist();
  
  // Launch browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Process each file
  for (const filePath of filesToProcess) {
    await processFile(filePath, page);
  }
  
  // Close browser
  await browser.close();
  
  console.log('Thumbnail generation complete!');
}

function getAllHtmlFiles() {
  const results = [];
  
  function traverseDirectory(dir) {
    if (!fs.existsSync(dir)) {
      console.log(`Directory does not exist: ${dir}`);
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
  
  traverseDirectory(config.templatesDir);
  return results;
}

function getChangedHtmlFiles() {
  try {
    // Get files changed in the most recent commit
    const gitOutput = execSync('git diff-tree --no-commit-id --name-only -r HEAD').toString();
    const allChangedFiles = gitOutput.split('\n').filter(Boolean);
    
    // Filter to only HTML files in the templates directory
    const changedHtmlFiles = allChangedFiles.filter(file => {
      return file.startsWith(config.templatesDir) && 
             file.endsWith('.html') && 
             !file.includes('detail-page-template');
    });
    
    // If no changed HTML files, try processing all files
    if (changedHtmlFiles.length === 0) {
      console.log('No changed HTML files detected. Falling back to processing all files.');
      return getAllHtmlFiles();
    }
    
    return changedHtmlFiles;
  } catch (error) {
    console.error('Error getting changed files:', error);
    console.log('Falling back to processing all files due to error.');
    return getAllHtmlFiles();
  }
}

function ensureDirectoriesExist() {
  [config.staticThumbnailsDir, config.gifThumbnailsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

async function processFile(filePath, page) {
  const fileName = path.basename(filePath, '.html');
  const staticThumbnailPath = path.join(config.staticThumbnailsDir, `${fileName}.png`);
  
  console.log(`Processing ${filePath}...`);
  
  try {
    // Generate static thumbnail
    await generateStaticThumbnail(filePath, staticThumbnailPath, page);
    console.log(`Created static thumbnail: ${staticThumbnailPath}`);
    
    // Create entry in the automated GIF generation list
    addToGifGenerationList(filePath);
    
    // Note: Full automation of scrolling GIF generation would require more complex
    // browser automation with the customer.io tool, or implementing our own solution
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function generateStaticThumbnail(htmlFilePath, outputPath, page) {
  // Read the HTML file
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
  
  // Set viewport to an email-like dimension
  await page.setViewport({
    width: config.thumbnailWidth,
    height: config.thumbnailHeight,
    deviceScaleFactor: 2, // for better quality
  });
  
  // Load the HTML content
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  // Take screenshot
  await page.screenshot({
    path: outputPath,
    fullPage: false,
    clip: {
      x: 0,
      y: 0,
      width: config.thumbnailWidth,
      height: config.thumbnailHeight,
    },
  });
}

function addToGifGenerationList(filePath) {
  const gifListPath = 'gif-generation-list.txt';
  
  // Get current content or create empty string
  let currentList = '';
  if (fs.existsSync(gifListPath)) {
    currentList = fs.readFileSync(gifListPath, 'utf8');
  }
  
  // Add the new file if it's not already in the list
  if (!currentList.includes(filePath)) {
    fs.appendFileSync(gifListPath, `${filePath}\n`);
    console.log(`Added ${filePath} to GIF generation list`);
  }
}

// For local testing
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
