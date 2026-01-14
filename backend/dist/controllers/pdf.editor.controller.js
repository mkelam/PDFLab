"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replacePdfText = exports.analyzePdf = exports.addTextToPDF = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("../config/logger"));
const pdfco_service_1 = require("../services/pdfco.service");
const addTextToPDF = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const { text, x, y, pages } = req.body;
        if (!text || x === undefined || y === undefined) {
            // Clean up uploaded file
            fs_1.default.unlinkSync(req.file.path);
            return res
                .status(400)
                .json({ success: false, error: 'Missing required parameters: text, x, y' });
        }
        const result = await pdfco_service_1.pdfCoService.addText(req.file.path, {
            text,
            x: parseInt(x),
            y: parseInt(y),
            pages: pages || '0-'
        });
        // Clean up uploaded input file
        try {
            if (fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
        }
        catch (e) {
            logger_1.default.error('Failed to cleanup temp file', e);
        }
        if (result.error) {
            return res.status(500).json({ success: false, error: result.message });
        }
        return res.status(200).json({
            success: true,
            url: result.url,
            message: result.message
        });
    }
    catch (error) {
        logger_1.default.error('Controller error in addTextToPDF:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
};
exports.addTextToPDF = addTextToPDF;
const analyzePdf = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const result = await pdfco_service_1.pdfCoService.convertPdfToJson(req.file.path);
        // Clean up
        try {
            if (fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
        }
        catch (e) {
            logger_1.default.error('Failed to cleanup temp file', e);
        }
        if (result.error) {
            return res.status(500).json({ success: false, error: result.message });
        }
        // Optional: We could fetch the JSON here and return the object directly,
        // but returning the URL is also fine if the frontend fetches it.
        // Let's fetch it to save the frontend a CORS headache or extra step.
        try {
            const jsonResponse = await axios_1.default.get(result.jsonUrl);
            return res.status(200).json({
                success: true,
                data: jsonResponse.data
            });
        }
        catch (fetchErr) {
            logger_1.default.error('Failed to fetch JSON result from PDF.co', fetchErr);
            return res.status(200).json({
                success: true,
                jsonUrl: result.jsonUrl, // Fallback
                message: 'Converted, but failed to inline JSON. Use jsonUrl.'
            });
        }
    }
    catch (error) {
        logger_1.default.error('Controller error in analyzePdf:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
};
exports.analyzePdf = analyzePdf;
const replacePdfText = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const { searchString, replacementString, pages } = req.body;
        if (!searchString || replacementString === undefined) {
            fs_1.default.unlinkSync(req.file.path);
            return res
                .status(400)
                .json({ success: false, error: 'Missing searchString or replacementString' });
        }
        const result = await pdfco_service_1.pdfCoService.replaceText(req.file.path, searchString, replacementString, pages);
        // Clean up
        try {
            if (fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
        }
        catch (e) {
            logger_1.default.error('Failed to cleanup temp file', e);
        }
        if (result.error) {
            return res.status(500).json({ success: false, error: result.message });
        }
        return res.status(200).json({
            success: true,
            url: result.url,
            message: result.message
        });
    }
    catch (error) {
        logger_1.default.error('Controller error in replacePdfText:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
};
exports.replacePdfText = replacePdfText;
//# sourceMappingURL=pdf.editor.controller.js.map