"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from the project root .env file
const envPath = path_1.default.resolve(__dirname, '../../../.env');
dotenv_1.default.config({ path: envPath });
const apiKey = process.env.PDFCO_API_KEY?.trim();
async function testConnection() {
    console.log('Testing PDF.co API connection...');
    if (!apiKey) {
        console.error('❌ Error: PDFCO_API_KEY is not set in environment variables.');
        process.exit(1);
    }
    // Mask the key for display
    const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
    console.log(`Using API Key: ${maskedKey}`);
    try {
        // Try to get a presigned URL as a lightweight auth check
        const response = await axios_1.default.get('https://api.pdf.co/v1/file/upload/get-presigned-url', {
            params: { name: 'test.pdf' },
            headers: {
                'x-api-key': apiKey
            }
        });
        if (response.status === 200 && !response.data.error) {
            console.log('✅ Connection Successful!');
            console.log('Generated Presigned URL:', response.data.presignedUrl);
        }
        else {
            console.error('❌ Connection Failed:', response.data.message);
        }
    }
    catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
        }
        else {
            console.error('❌ Network/System Error:', error.message);
        }
        process.exit(1);
    }
}
testConnection();
//# sourceMappingURL=test-pdfco.js.map