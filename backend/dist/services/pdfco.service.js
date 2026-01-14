"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfCoService = exports.PdfCoService = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../config/logger"));
class PdfCoService {
    constructor() {
        this.apiUrl = 'https://api.pdf.co/v1';
        this.apiKey = process.env.PDFCO_API_KEY || '';
        if (!this.apiKey) {
            logger_1.default.warn('PDFCO_API_KEY is not set. PDF editing features will not work.');
        }
    }
    /**
     * Uploads a temporary file to PDF.co storage to get a URL
     */
    async uploadFile(filePath) {
        try {
            // Get presigned URL (GET request)
            const response = await axios_1.default.get(`${this.apiUrl}/file/upload/get-presigned-url`, {
                params: {
                    name: path_1.default.basename(filePath)
                },
                headers: {
                    'x-api-key': this.apiKey
                }
            });
            if (response.data.error) {
                throw new Error(response.data.message);
            }
            const { presignedUrl, url } = response.data;
            // Upload to the presigned URL
            await axios_1.default.put(presignedUrl, fs_1.default.readFileSync(filePath), {
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });
            return url;
        }
        catch (error) {
            logger_1.default.error('Error uploading file to PDF.co:', error.message);
            throw new Error('Failed to upload file to PDF service');
        }
    }
    /**
     * Add text to a PDF
     */
    async addText(filePath, options) {
        try {
            if (!this.apiKey) {
                throw new Error('PDF.co API key is not configured');
            }
            const fileUrl = await this.uploadFile(filePath);
            const response = await axios_1.default.post(`${this.apiUrl}/pdf/edit/add`, {
                url: fileUrl,
                async: false,
                textAnnotations: [
                    {
                        text: options.text,
                        x: options.x,
                        y: options.y,
                        pages: options.pages ?? '0-',
                        size: options.size ?? 12,
                        color: options.color ?? '000000'
                    }
                ]
            }, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.error) {
                throw new Error(response.data.message);
            }
            return {
                url: response.data.url,
                pageCount: response.data.pageCount,
                error: false,
                message: 'Text added successfully'
            };
        }
        catch (error) {
            logger_1.default.error('Error adding text with PDF.co:', error.response?.data || error.message);
            return {
                url: '',
                pageCount: 0,
                error: true,
                message: error.message || 'Failed to add text to PDF'
            };
        }
    }
    /**
     * Convert PDF to JSON to get text coordinates
     */
    async convertPdfToJson(filePath) {
        try {
            if (!this.apiKey) {
                throw new Error('PDF.co API key is not configured');
            }
            const fileUrl = await this.uploadFile(filePath);
            const response = await axios_1.default.post(`${this.apiUrl}/pdf/convert/to/json2`, {
                url: fileUrl,
                async: false,
                inline: false, // We want a URL to the JSON file
                profiles: '' // Optional: Add Profiles string to filter if needed
            }, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.error) {
                throw new Error(response.data.message);
            }
            return {
                jsonUrl: response.data.url,
                error: false,
                message: 'PDF converted to JSON successfully'
            };
        }
        catch (error) {
            logger_1.default.error('Error converting PDF to JSON:', error.response?.data || error.message);
            return {
                jsonUrl: '',
                error: true,
                message: error.message || 'Failed to convert PDF to JSON'
            };
        }
    }
    /**
     * Replace text in a PDF
     */
    async replaceText(filePath, searchString, replacementString, pages = '0-') {
        try {
            if (!this.apiKey) {
                throw new Error('PDF.co API key is not configured');
            }
            const fileUrl = await this.uploadFile(filePath);
            const response = await axios_1.default.post(`${this.apiUrl}/pdf/edit/replace-text`, {
                url: fileUrl,
                async: false,
                searchString: searchString,
                replacementString: replacementString,
                pages: pages
            }, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.error) {
                throw new Error(response.data.message);
            }
            return {
                url: response.data.url,
                error: false,
                message: 'Text replaced successfully'
            };
        }
        catch (error) {
            logger_1.default.error('Error replacing text:', error.response?.data || error.message);
            return {
                url: '',
                error: true,
                message: error.message || 'Failed to replace text'
            };
        }
    }
}
exports.PdfCoService = PdfCoService;
exports.pdfCoService = new PdfCoService();
//# sourceMappingURL=pdfco.service.js.map