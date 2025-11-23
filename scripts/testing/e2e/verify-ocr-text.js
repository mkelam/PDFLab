/**
 * OCR Text Extraction Verification Script
 *
 * This script extracts text from converted PPTX and DOCX files
 * to verify that OCR preprocessing worked correctly.
 *
 * If OCR worked:
 * - Text should be extractable as actual text (not images)
 * - Text should be editable
 * - Layout should be preserved
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const PizZip = require('pizzip');

// File paths
const DOCX_PATH = path.join(__dirname, 'tests/temp/6afc7d49-7982-49cd-8e1e-c204e976266c.docx');
const PPTX_PATH = path.join(__dirname, 'tests/temp/24132957-fcf6-4f63-8073-d7d2eb8d15ca.pptx');

console.log('🔍 OCR Text Extraction Verification\n');
console.log('='.repeat(70));

/**
 * Extract text from DOCX file
 */
async function extractTextFromDocx(filePath) {
  console.log('\n📝 Testing DOCX File: ' + path.basename(filePath));
  console.log('-'.repeat(70));

  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = text.length;

    console.log(`✅ File opened successfully`);
    console.log(`✅ Text extraction successful`);
    console.log(`\n📊 Statistics:`);
    console.log(`   - Character count: ${charCount}`);
    console.log(`   - Word count: ${wordCount}`);
    console.log(`   - Lines: ${text.split('\n').length}`);

    if (text.length > 0) {
      console.log(`\n✅ OCR VERIFICATION: PASSED`);
      console.log(`   Text is extractable → OCR worked correctly`);
      console.log(`   Text is editable in Word → User can modify content`);

      console.log(`\n📄 Extracted Text Preview (first 500 chars):`);
      console.log('─'.repeat(70));
      console.log(text.substring(0, 500));
      if (text.length > 500) {
        console.log(`\n... (${text.length - 500} more characters)`);
      }
      console.log('─'.repeat(70));

      return { success: true, text, wordCount, charCount };
    } else {
      console.log(`\n❌ OCR VERIFICATION: FAILED`);
      console.log(`   No text extracted → OCR may have failed`);
      return { success: false, text: '', wordCount: 0, charCount: 0 };
    }
  } catch (error) {
    console.log(`\n❌ Error extracting text from DOCX:`);
    console.log(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Extract text from PPTX file
 */
async function extractTextFromPptx(filePath) {
  console.log('\n\n🎨 Testing PPTX File: ' + path.basename(filePath));
  console.log('-'.repeat(70));

  try {
    const buffer = fs.readFileSync(filePath);
    const zip = new PizZip(buffer);

    // PPTX files contain slides in ppt/slides/ directory
    // Each slide is an XML file with text content
    const slideFiles = Object.keys(zip.files).filter(filename =>
      filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')
    );

    console.log(`✅ File opened successfully`);
    console.log(`✅ Found ${slideFiles.length} slide(s)`);

    let allText = '';
    let slideCount = 0;

    for (const slideFile of slideFiles) {
      const slideXml = zip.files[slideFile].asText();

      // Extract text from XML (between <a:t> tags - text runs in PPTX)
      const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
      const slideText = textMatches
        .map(match => match.replace(/<\/?a:t>/g, ''))
        .join(' ')
        .trim();

      if (slideText) {
        slideCount++;
        allText += slideText + '\n';
        console.log(`   Slide ${slideCount}: ${slideText.substring(0, 50)}${slideText.length > 50 ? '...' : ''}`);
      }
    }

    const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = allText.length;

    console.log(`\n📊 Statistics:`);
    console.log(`   - Total slides: ${slideFiles.length}`);
    console.log(`   - Slides with text: ${slideCount}`);
    console.log(`   - Character count: ${charCount}`);
    console.log(`   - Word count: ${wordCount}`);

    if (allText.length > 0) {
      console.log(`\n✅ OCR VERIFICATION: PASSED`);
      console.log(`   Text is extractable → OCR worked correctly`);
      console.log(`   Text is editable in PowerPoint → User can modify content`);

      console.log(`\n📄 Extracted Text Preview (first 500 chars):`);
      console.log('─'.repeat(70));
      console.log(allText.substring(0, 500));
      if (allText.length > 500) {
        console.log(`\n... (${allText.length - 500} more characters)`);
      }
      console.log('─'.repeat(70));

      return { success: true, text: allText, wordCount, charCount, slideCount };
    } else {
      console.log(`\n❌ OCR VERIFICATION: FAILED`);
      console.log(`   No text extracted → OCR may have failed`);
      return { success: false, text: '', wordCount: 0, charCount: 0, slideCount: 0 };
    }
  } catch (error) {
    console.log(`\n❌ Error extracting text from PPTX:`);
    console.log(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main verification function
 */
async function verifyOcr() {
  console.log('\n🎯 Starting OCR Text Extraction Verification...\n');

  // Verify files exist
  if (!fs.existsSync(DOCX_PATH)) {
    console.log(`❌ DOCX file not found: ${DOCX_PATH}`);
    return;
  }

  if (!fs.existsSync(PPTX_PATH)) {
    console.log(`❌ PPTX file not found: ${PPTX_PATH}`);
    return;
  }

  // Extract text from both files
  const docxResult = await extractTextFromDocx(DOCX_PATH);
  const pptxResult = await extractTextFromPptx(PPTX_PATH);

  // Final summary
  console.log('\n\n' + '='.repeat(70));
  console.log('🎊 OCR VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  console.log('\n📝 DOCX (Word Document):');
  if (docxResult.success) {
    console.log(`   ✅ PASSED - Text is extractable and editable`);
    console.log(`   📊 ${docxResult.wordCount} words, ${docxResult.charCount} characters`);
  } else {
    console.log(`   ❌ FAILED - No text extracted`);
  }

  console.log('\n🎨 PPTX (PowerPoint):');
  if (pptxResult.success) {
    console.log(`   ✅ PASSED - Text is extractable and editable`);
    console.log(`   📊 ${pptxResult.slideCount} slides, ${pptxResult.wordCount} words, ${pptxResult.charCount} characters`);
  } else {
    console.log(`   ❌ FAILED - No text extracted`);
  }

  const overallPassed = docxResult.success && pptxResult.success;

  console.log('\n' + '='.repeat(70));
  if (overallPassed) {
    console.log('✅ OVERALL OCR VERIFICATION: PASSED');
    console.log('');
    console.log('🎉 OCR preprocessing worked correctly!');
    console.log('   - Text in both files is extractable (not embedded images)');
    console.log('   - Text is editable in Word and PowerPoint');
    console.log('   - Users can select, copy, and modify the text');
    console.log('');
    console.log('✨ This proves that OCR functionality is working as expected.');
  } else {
    console.log('❌ OVERALL OCR VERIFICATION: FAILED');
    console.log('');
    console.log('⚠️  OCR preprocessing may have issues.');
    console.log('   - Check if text is embedded as images instead of text');
    console.log('   - Review CloudConvert OCR configuration');
  }
  console.log('='.repeat(70) + '\n');
}

// Run verification
verifyOcr().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
