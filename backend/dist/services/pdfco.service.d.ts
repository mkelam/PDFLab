export interface AddTextOptions {
    text: string;
    x: number;
    y: number;
    pages?: string;
    size?: number;
    color?: string;
}
export declare class PdfCoService {
    private apiKey;
    private apiUrl;
    constructor();
    /**
     * Uploads a temporary file to PDF.co storage to get a URL
     */
    private uploadFile;
    /**
     * Add text to a PDF
     */
    addText(filePath: string, options: AddTextOptions): Promise<{
        url: string;
        pageCount: number;
        error: boolean;
        message: string;
    }>;
    /**
     * Convert PDF to JSON to get text coordinates
     */
    convertPdfToJson(filePath: string): Promise<{
        jsonUrl: string;
        error: boolean;
        message: string;
    }>;
    /**
     * Replace text in a PDF
     */
    replaceText(filePath: string, searchString: string, replacementString: string, pages?: string): Promise<{
        url: string;
        error: boolean;
        message: string;
    }>;
}
export declare const pdfCoService: PdfCoService;
//# sourceMappingURL=pdfco.service.d.ts.map