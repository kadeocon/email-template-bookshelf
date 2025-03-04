// puppeteer-diagnostic.js
// Script to diagnose Puppeteer issues in GitHub Actions environment

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runDiagnostics() {
  console.log('🔍 Starting Puppeteer diagnostics...');
  console.log('📊 Node.js version:', process.version);
  console.log('🖥️ Platform:', process.platform);
  
  // Check puppeteer version
  try {
    const puppeteerVersion = require('puppeteer/package.json').version;
    console.log('🤖 Puppeteer version:', puppeteerVersion);
  } catch (error) {
    console.error('❌ Could not determine Puppeteer version:', error.message);
  }
  
  // Create a simple HTML file for testing
  const testHtmlPath = path.join(__dirname, 'test.html');
  const testScreenshotPath = path.join(__dirname, 'test-screenshot.png');
  
  try {
    fs.writeFileSync(testHtmlPath, `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Puppeteer Test</title>
          <style>
            body { 
              background-color: #f0f0f0; 
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .container {
              background-color: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              text-align: center;
            }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Puppeteer Test Page</h1>
            <p>If you can see this text in the screenshot, Puppeteer is working correctly!</p>
            <p>Generated: ${new Date().toISOString()}</p>
          </div>
        </body>
      </html>
    `);
    
    console.log('✅ Created test HTML file at', testHtmlPath);
  } catch (error) {
    console.error('❌ Failed to create test HTML file:', error.message);
    return;
  }
  
  console.log('🚀 Launching Puppeteer browser...');
  
  try {
    // Launch the browser with all potential arguments
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
    });
    
    console.log('✅ Browser launched successfully');
    
    // Create a new page
    const page = await browser.newPage();
    console.log('✅ Page created successfully');
    
    // Set viewport
    await page.setViewport({
      width: 800,
      height: 600,
      deviceScaleFactor: 1,
    });
    console.log('✅ Viewport set successfully');
    
    // Load the file
    console.log('⏱️ Loading HTML file...');
    await page.goto(`file://${testHtmlPath}`, {
      waitUntil: ['load', 'networkidle2'],
      timeout: 30000
    });
    console.log('✅ HTML file loaded successfully');
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({
      path: testScreenshotPath,
      fullPage: true
    });
    
    // Verify screenshot was created
    if (fs.existsSync(testScreenshotPath)) {
      const stats = fs.statSync(testScreenshotPath);
      console.log(`✅ Screenshot created: ${testScreenshotPath} (${stats.size} bytes)`);
    } else {
      console.log('❌ Screenshot was not created');
    }
    
    // Close browser
    await browser.close();
    console.log('✅ Browser closed successfully');
    
    console.log('🎉 Diagnostics completed successfully! Puppeteer appears to be working correctly.');
  } catch (error) {
    console.error('❌ Puppeteer error:', error);
    
    // Print more details if available
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    console.error('❌ Diagnostics failed. Puppeteer cannot take screenshots properly.');
  }
}

// Run the diagnostics
runDiagnostics().catch(console.error);
