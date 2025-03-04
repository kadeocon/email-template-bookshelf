// enhanced-gif-generator.js
// A simplified and more robust version of the scrolling-gif-generator.js script

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const GIFEncoder = require('gifencoder');
const { createCanvas, Image } = require('canvas');

// Configuration
const config = {
  templatesDir: 'templates',
  outputDir: 'docs/previews/animated',
  tempDir: 'temp-frames',
  width: 600,         // Width of the email view
  height: 800,        // Height of the visible window
  quality: 10,        // GIF quality (10 is good)
  delay: 150,         // Delay between frames in ms (increased for better viewing)
  repeat: 0,          // 0 for repeat, -1 for no-repeat
  totalFrames: 10,    // Reduced frame count for better performance
  debug: true         // Enable verbose logging
};

async function main() {
  console.log('Starting enhanced GIF generation process...');
  
  // Create directories if they don't exist
  ensureDirectoriesExist();
  
  // Get all HTML files
  const templateFiles = getAllHtmlFiles();
  console.log(`Found ${templateFiles.length} HTML template files to process for GIFs`);
  
  if (templateFiles.length === 0) {
    console.error('ERROR: No HTML files found to process');
    return;
  }
  
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
      await generateScrollingGif(filePath, browser);
      successCount++;
    } catch (error) {
      console.error(`ERROR processing GIF for ${filePath}:`, error);
      failureCount++;
    }
  }
  
  // Close browser
  await browser.close();
  console.log('Browser closed');
  
  // Clean up temp directory
  cleanupTempDirectory();
  
  console.log(`GIF generation summary:`);
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
  [config.outputDir, config.tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function cleanupTempDirectory() {
  if (fs.existsSync(config.tempDir)) {
    const files = fs.readdirSync(config.tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(config.tempDir, file));
    }
    console.log(`Cleaned up ${files.length} temporary frame files`);
  }
}

// Helper function for delays that works in all Puppeteer versions
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateScrollingGif(htmlFilePath, browser) {
  const fileName = path.basename(htmlFilePath, '.html');
  const outputPath = path.join(config.outputDir, `${fileName}.gif`);
  
  console.log(`\nGenerating scrolling GIF for ${htmlFilePath}...`);
  
  // Create a new page
  const page = await browser.newPage().catch(err => {
    console.error('Failed to create new page:', err);
    throw err;
  });
  
  try {
    // Read the HTML file
    console.log(`- Reading file content for ${fileName}`);
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    console.log(`- File read successfully, size: ${htmlContent.length} bytes`);
    
    // Set viewport
    console.log(`- Setting viewport to ${config.width}x${config.height}`);
    await page.setViewport({
      width: config.width,
      height: config.height,
      deviceScaleFactor: 1,
    });
    
    // Load the HTML content
    console.log(`- Loading HTML content into page`);
    await page.setContent(htmlContent, { 
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000 // 30 second timeout
    }).catch(err => {
      console.error(`- Failed to load HTML content: ${err.message}`);
      throw err;
    });
    
    console.log(`- Content loaded successfully`);
    
    // Get the full height of the email
    const emailHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
    });
    
    console.log(`- Email height for ${fileName}: ${emailHeight}px`);
    
    // Calculate scroll step for smooth scrolling
    const scrollStep = Math.max(1, Math.floor((emailHeight - config.height) / (config.totalFrames - 1)));
    
    // Create frame files
    const framePaths = [];
    for (let i = 0; i < config.totalFrames; i++) {
      const scrollPosition = Math.min(i * scrollStep, emailHeight - config.height);
      
      // Scroll to position
      await page.evaluate((scrollTop) => {
        window.scrollTo(0, scrollTop);
      }, scrollPosition);
      
      // Add a small delay to allow rendering (using setTimeout instead of waitForTimeout)
      await delay(100);
      
      // Take screenshot
      const framePath = path.join(config.tempDir, `${fileName}-frame-${i.toString().padStart(3, '0')}.png`);
      await page.screenshot({
        path: framePath,
        clip: {
          x: 0,
          y: 0,
          width: config.width,
          height: config.height,
        }
      }).catch(err => {
        console.error(`- Failed to take screenshot for frame ${i}: ${err.message}`);
        throw err;
      });
      
      framePaths.push(framePath);
      
      console.log(`- Captured frame ${i+1}/${config.totalFrames} for ${fileName}`);
    }
    
    // Create GIF from frames
    console.log(`- Creating GIF from ${framePaths.length} frames`);
    await createGifFromFrames(framePaths, outputPath);
    
    // Verify GIF was created
    if (fs.existsSync(outputPath)) {
      const fileStats = fs.statSync(outputPath);
      console.log(`✓ Created scrolling GIF: ${outputPath}, size: ${fileStats.size} bytes`);
    } else {
      throw new Error(`Failed to create GIF - file not found: ${outputPath}`);
    }
  } catch (error) {
    console.error(`- Error generating GIF for ${htmlFilePath}:`, error);
    throw error;
  } finally {
    // Always close the page to free resources
    await page.close().catch(err => console.error('Error closing page:', err));
  }
}

async function createGifFromFrames(framePaths, outputPath) {
  console.log(`- Starting GIF encoding process`);
  
  // Create a GIF encoder
  const encoder = new GIFEncoder(config.width, config.height);
  
  // Create a write stream
  const stream = fs.createWriteStream(outputPath);
  
  // Pipe the encoder to the file
  encoder.createReadStream().pipe(stream);
  
  // Start encoding
  encoder.start();
  encoder.setRepeat(config.repeat);
  encoder.setDelay(config.delay);
  encoder.setQuality(config.quality);
  
  // Create canvas for drawing frames
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');
  
  // Add each frame to the GIF
  let frameCount = 0;
  for (const framePath of framePaths) {
    try {
      if (!fs.existsSync(framePath)) {
        console.warn(`- Frame file does not exist: ${framePath}`);
        continue;
      }
      
      const image = new Image();
      
      // Load the image from file
      image.src = framePath;
      
      // Draw the image on the canvas
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, config.width, config.height);
      ctx.drawImage(image, 0, 0);
      
      // Add the frame from canvas
      encoder.addFrame(ctx);
      frameCount++;
      
      console.log(`- Added frame ${frameCount}/${framePaths.length} to GIF`);
    } catch (err) {
      console.error(`- Error processing frame ${framePath}:`, err);
      // Continue with other frames instead of failing
    }
  }
  
  // Finish encoding
  encoder.finish();
  console.log(`- GIF encoding finished`);
  
  // Return when stream is finished
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// For local testing and GitHub Actions
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error in GIF generation:', error);
    process.exit(1);
  });
}

module.exports = { main };
