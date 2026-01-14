"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load environment variables from the root .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
// Import service AFTER loading env vars
// We use require to ensure it loads with the env vars present
const { pdfCoService } = require('../services/pdfco.service');
const runTest = async () => {
    const apiKey = process.env.PDFCO_API_KEY?.trim();
    if (!apiKey) {
        console.error('❌ PDFCO_API_KEY is missing in .env');
        process.exit(1);
    }
    console.log('✅ Found API Key:', apiKey.substring(0, 5) + '...');
    // Create a dummy PDF file for testing
    const dummyPdfPath = path_1.default.resolve(__dirname, 'test.pdf');
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000263 00000 n \n0000000351 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n444\n%%EOF');
    fs_1.default.writeFileSync(dummyPdfPath, pdfBuffer);
    console.log('📄 Created dummy PDF at:', dummyPdfPath);
    try {
        // 1. Test Analyze (PDF to JSON)
        console.log('\n--- Testing PDF to JSON ---');
        const jsonResult = await pdfCoService.convertPdfToJson(dummyPdfPath);
        if (jsonResult.error) {
            console.error('❌ PDF to JSON Failed:', jsonResult.message);
        }
        else {
            console.log('PDF to JSON Result:', jsonResult);
            if (jsonResult.jsonUrl) {
                const axios = require('axios');
                const jsonResponse = await axios.get(jsonResult.jsonUrl);
                const root = jsonResponse.data.body?.document || jsonResponse.data.document;
                if (root?.page) {
                    const pages = Array.isArray(root.page) ? root.page : [root.page];
                    if (pages.length > 0) {
                        const p1 = pages[0];
                        const rows = p1.row ? (Array.isArray(p1.row) ? p1.row : [p1.row]) : [];
                        if (rows.length > 0) {
                            const r1 = rows[0];
                            const cols = r1.column ? (Array.isArray(r1.column) ? r1.column : [r1.column]) : [];
                            if (cols.length > 0) {
                                console.log('Sample Column 1:', JSON.stringify(cols[0], null, 2));
                            }
                        }
                    }
                }
            }
        }
        // 2. Test Text Replacement
        console.log('\n--- Testing Text Replacement ---');
        const replaceResult = await pdfCoService.replaceText(dummyPdfPath, 'Hello', 'Hi', '0-');
        if (replaceResult.error) {
            console.error('❌ Replace Text Failed:', replaceResult.message);
        }
        else {
            console.log('✅ Replace Text Success! URL:', replaceResult.url);
        }
    }
    catch (error) {
        console.error('❌ Unexpected Error:', error.message);
    }
    finally {
        // Cleanup
        if (fs_1.default.existsSync(dummyPdfPath)) {
            fs_1.default.unlinkSync(dummyPdfPath);
            console.log('\n🧹 Cleaned up test files');
        }
    }
};
runTest();
//# sourceMappingURL=test-pdfco-ocr.js.map