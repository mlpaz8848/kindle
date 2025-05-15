// utils/mail-drop-handler.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { ipcMain } = require('electron');
const execPromise = promisify(exec);

class MailDropHandler {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'kindle-mail-drop');

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      try {
        fs.mkdirSync(this.tempDir, { recursive: true });
      } catch (err) {
        console.warn(`[Mail Drop] Could not create temp directory: ${err.message}`);
      }
    }
  }

  async handleMailDrop(filePaths) {
    console.log('[Mail Drop Handler] Received file paths:', filePaths);

    // Ensure filePaths is always an array
    if (!Array.isArray(filePaths)) {
      console.error('[Mail Drop Handler] Invalid input, converting to array:', filePaths);
      // If it's a string, make it a single-element array
      if (typeof filePaths === 'string') {
        filePaths = [filePaths];
      } else if (filePaths && typeof filePaths === 'object') {
        // If it's an object with paths property, use that
        if (Array.isArray(filePaths.paths)) {
          filePaths = filePaths.paths;
        } else {
          // Last resort, try to convert object to array
          filePaths = Object.values(filePaths);
        }
      } else {
        // If all else fails, return empty array
        console.error('[Mail Drop Handler] Could not convert input to array:', filePaths);
        return [];
      }
    }

    const validFiles = filePaths.filter(filePath => {
      if (!filePath) {
        return false;
      }
      
      console.log('[Mail Drop Handler] Checking file path:', filePath);
      
      // Convert to string if somehow not a string
      const pathStr = String(filePath);
      
      try {
        if (!fs.existsSync(pathStr)) {
          console.warn('[Mail Drop Handler] File not found:', pathStr);
          return false;
        }
        return true;
      } catch (err) {
        console.error('[Mail Drop Handler] Error checking file:', err.message);
        return false;
      }
    });

    console.log('[Mail Drop Handler] Valid files:', validFiles);
    return validFiles;
  }

  async extractMailContent() {
    // This is a placeholder for the actual Mail extraction logic
    // In a full implementation, this would use AppleScript or similar
    // to extract files from Mail.app
    return null;
  }

  async createTestFiles(filePaths) {
    // Ensure filePaths is always an array
    if (!Array.isArray(filePaths)) {
      if (typeof filePaths === 'string') {
        filePaths = [filePaths];
      } else {
        return [];
      }
    }
    
    // This is a helper method to create test files when needed
    // Only used during development for testing
    try {
      const testPaths = [];

      for (const filePath of filePaths) {
        // Get just the filename
        const fileName = path.basename(String(filePath));
        const testFilePath = path.join(this.tempDir, fileName);

        // Create a simple .eml file for testing
        const testContent = `From: test@example.com
To: recipient@example.com
Subject: ${fileName.replace('.eml', '')}
Date: ${new Date().toUTCString()}

This is a test email content for ${fileName}.
It was automatically created by the Kindle Newsletter Formatter for testing purposes.

Regards,
Test System`;

        // Write the file
        fs.writeFileSync(testFilePath, testContent);
        console.log(`[Mail Drop] Created test file at: ${testFilePath}`);
        testPaths.push(testFilePath);
      }

      return testPaths;
    } catch (error) {
      console.error(`[Mail Drop] Error creating test files: ${error.message}`);
      return [];
    }
  }
}

// Add a safe wrapper for ipcMain events
ipcMain.on('process-dropped-files', (event, data) => {
  if (!data || !data.paths) {
    console.error('[Mail Drop Handler] Missing paths in data:', data);
    event.sender.send('error', 'No valid files found for processing.');
    return;
  }
  
  const filePaths = data.paths;
  
  // Ensure filePaths is an array
  const pathsArray = Array.isArray(filePaths) ? filePaths : 
                    (typeof filePaths === 'string' ? [filePaths] : []);
  
  if (pathsArray.length === 0) {
    event.sender.send('error', 'No valid files found for processing.');
    return;
  }
  
  const validFiles = pathsArray.filter(filePath => 
    filePath && typeof filePath === 'string' && fs.existsSync(filePath)
  );
  
  if (validFiles.length === 0) {
    event.sender.send('error', 'No valid files found for processing.');
    return;
  }
  
  // Proceed with processing valid files...
  console.log('[Mail Drop Handler] Processing valid files:', validFiles);
  
  // Instead of processing here, just send back to continue normal flow
  event.sender.send('file-dropped', validFiles);
});

module.exports = new MailDropHandler();