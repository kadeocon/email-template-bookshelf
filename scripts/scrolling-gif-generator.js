// scrolling-gif-generator.js
// Script to generate scrolling GIFs of email templates using Puppeteer and GIF encoding

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const GIFEncoder = require('gifencoder');
const { createCanvas, Image } = require('canvas');
const pngFileStream = require('png-file-stream');

// Configuration
const config = {
  templatesDir: 'templates',
  outputDir: 'docs/previews/animated',
  tempDir: 'temp-frames',
  width: 600,         // Width of the email view
  height: 800,        // Height of the visible window
  quality: 10,        // GIF quality (10 is good)
  delay: 100,         // Delay between frames in ms
  repeat: 0,          // 0 for repeat, -1 for no-repeat
  totalFrames: 30,    // Number of frames to capture
};

async function main() {
  console.log('Starting scrolling GIF generation...');
  
  // Get HTML files to process
  const filesToProcess = process.argv.slice(2);
  const htmlFiles = filesToProcess.length > 0 
    ? filesToProcess 
    : getAllHtmlFiles(config.templatesDir);
  
  if (htmlFiles.length === 0) {
    console.log('No HTML files found to process.');
    return;
  }
  
  console.log(`Found ${htmlFiles.length} HTML files to process for GIF generation:`);
  htmlFiles.forEach(file => console.log(` - ${file}`));
  
  // Create directories if they don't exist
  ensureDirectoriesExist();
  
  // Launch browser
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // Process each file
  for (const filePath of htmlFiles) {
    await generateScrollingGif(filePath, browser);
  }
  
  // Close browser
  await browser.close();
  
  // Clean up temp directory
  cleanupTempDirectory();
  
  console.log('Scrolling GIF generation complete!');
}

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

function ensureDirectoriesExist() {
  [config.outputDir, config.tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
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
    // Keep the directory for now
    console.log(`Cleaned up ${files.length} temporary frame files`);
  }
}

async function generateScrollingGif(htmlFilePath, browser) {
  const fileName = path.basename(htmlFilePath, '.html');
  const outputPath = path.join(config.outputDir, `${fileName}.gif`);
  
  console.log(`Generating scrolling GIF for ${htmlFilePath}...`);
  
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Read the HTML file
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    
    // Set viewport
    await page.setViewport({
      width: config.width,
      height: config.height,
      deviceScaleFactor: 1,
    });
    
    // Load the HTML content
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // Get the full height of the email
    const emailHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
    });
    
    console.log(`Email height for ${fileName}: ${emailHeight}px`);
    
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
      
      // Add a small delay to allow rendering
      await page.waitForTimeout(50);
      
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
      });
      
      framePaths.push(framePath);
      
      if (i % 5 === 0) {
        console.log(`  - Captured frame ${i+1}/${config.totalFrames} for ${fileName}`);
      }
    }
    
    // Close the page
    await page.close();
    
    // Create GIF from frames
    await createGifFromFrames(framePaths, outputPath);
    
    console.log(`Created scrolling GIF: ${outputPath}`);
  } catch (error) {
    console.error(`Error generating GIF for ${htmlFilePath}:`, error);
  }
}

async function createGifFromFrames(framePaths, outputPath) {
  console.log(`Creating GIF from ${framePaths.length} frames...`);
  
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
        console.warn(`Frame file does not exist: ${framePath}`);
        continue;
      }
      
      const image = new Image();
      
      // Wait for the image to load from file
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = framePath;
      });
      
      // Draw the image on the canvas
      ctx.drawImage(image, 0, 0);
      
      // Add the frame from canvas
      encoder.addFrame(ctx);
      frameCount++;
      
      if (frameCount % 5 === 0 || frameCount === framePaths.length) {
        console.log(`  - Added frame ${frameCount}/${framePaths.length} to GIF`);
      }
    } catch (err) {
      console.error(`Error processing frame ${framePath}:`, err);
    }
  }
  
  // Finish encoding
  encoder.finish();
  
  // Return when stream is finished
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// For local testing
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
