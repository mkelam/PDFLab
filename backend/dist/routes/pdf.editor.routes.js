"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pdf_editor_controller_1 = require("../controllers/pdf.editor.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
// Add text to PDF
router.post('/edit/add-text', auth_middleware_1.optionalAuthMiddleware, // Allow guests for now, or enforce auth
upload_middleware_1.uploadMiddleware.single('file'), upload_middleware_1.handleUploadError, pdf_editor_controller_1.addTextToPDF);
// Analyze PDF (Convert to JSON)
router.post('/edit/analyze', auth_middleware_1.optionalAuthMiddleware, upload_middleware_1.uploadMiddleware.single('file'), upload_middleware_1.handleUploadError, pdf_editor_controller_1.analyzePdf);
// Replace Text in PDF
router.post('/edit/replace-text', auth_middleware_1.optionalAuthMiddleware, upload_middleware_1.uploadMiddleware.single('file'), upload_middleware_1.handleUploadError, pdf_editor_controller_1.replacePdfText);
exports.default = router;
//# sourceMappingURL=pdf.editor.routes.js.map