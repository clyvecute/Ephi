import { GoogleAIFileManager } from "@google/generative-ai/server";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ Error: VITE_GEMINI_API_KEY is not set in your .env file.");
  process.exit(1);
}

const fileManager = new GoogleAIFileManager(API_KEY);

async function uploadBook() {
  const filePath = process.argv[2]; // Path to your PDF or TXT
  const displayName = process.argv[3] || path.basename(filePath || "Reference Book");

  if (!filePath) {
    console.error("❌ Usage: node upload-book.js <path-to-pdf> [Display Name]");
    process.exit(1);
  }

  try {
    console.log(`Uploading ${filePath} to Gemini... This may take a moment.`);
    
    // Upload the file
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: filePath.endsWith('.pdf') ? "application/pdf" : "text/plain",
      displayName: displayName,
    });
    
    console.log("\n✅ Upload Complete!");
    console.log(`- Display Name: ${uploadResult.file.displayName}`);
    console.log(`- File URI: ${uploadResult.file.uri}`);
    console.log(`- File ID: ${uploadResult.file.name}`);
    
    console.log("\n👉 IMPORTANT: Copy the File URI above. We'll use it in lib/gemini.js");

  } catch (err) {
    console.error("❌ Upload failed:", err.message);
  }
}

uploadBook();
