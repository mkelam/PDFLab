"use client";

import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pdflabAPI } from "@/lib/api";
import { Download, Edit3, FileText, Loader2, Save, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export default function PdfEditorClient() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // State for OCR
  const [ocrElements, setOcrElements] = useState<any[]>([]);
  const [originalElements, setOriginalElements] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setOcrElements([]);
      setResultUrl(null);
      setError(null);

      // Auto-analyze on upload
      analyzeFile(selectedFile);
    }
  };

  // Analyze File for Text
  const analyzeFile = async (currentFile: File) => {
    setIsAnalyzing(true);
    try {
      const response = await pdflabAPI.analyzePdf(currentFile);
      console.log("Analysis Data:", response);

      if (!response.success) {
        throw new Error(response.error || "Analysis failed on server");
      }

      const pdfData = response.data;
      const root = pdfData.body?.document || pdfData.document;
      const pages = root?.page;
      const extracted: any[] = [];

      if (pages) {
        const pageArray = Array.isArray(pages) ? pages : [pages];
        pageArray.forEach((p: any, pageIndex: number) => {
          if (pageIndex > 0) return;

          const rows = p.row;
          if (rows) {
            const rowArray = Array.isArray(rows) ? rows : [rows];
            rowArray.forEach((r: any) => {
              const cols = r.column;
              if (cols) {
                const colArray = Array.isArray(cols) ? cols : [cols];
                colArray.forEach((c: any) => {
                  const textObj = c.text;
                  if (textObj) {
                    extracted.push({
                      id: Math.random().toString(36).substr(2, 9),
                      originalText: textObj["text"] || textObj["#text"] || "",
                      text: textObj["text"] || textObj["#text"] || "",
                      x: parseFloat(textObj["x"] || textObj["left"] || "0"),
                      y: parseFloat(textObj["y"] || textObj["top"] || "0"),
                      width: parseFloat(textObj["width"] || "100"),
                      height: parseFloat(textObj["height"] || "20"),
                      fontSize: textObj["fontSize"] || "12",
                      fontName: textObj["fontName"] || "Arial",
                    });
                  }
                });
              }
            });
          }
        });
      }

      setOcrElements(extracted);
      setOriginalElements(JSON.parse(JSON.stringify(extracted)));
    } catch (err: any) {
      console.error("Analysis Failed", err);
      setError(`Failed to analyze text: ${err.message || "Unknown error"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateOcrText = (id: string, newText: string) => {
    setOcrElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, text: newText } : el))
    );
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResultUrl(null);

    try {
      const modifications = ocrElements.filter((el) => {
        const original = originalElements.find((orig) => orig.id === el.id);
        return original && original.text !== el.text;
      });

      if (modifications.length === 0) {
        setError("No changes detected to save.");
        setIsProcessing(false);
        return;
      }

      let lastUrl = "";

      for (const mod of modifications) {
        const response = await pdflabAPI.replacePdfText(
          file,
          mod.originalText,
          mod.text
        );
        if (response.url) {
          lastUrl = response.url;
          break;
        }
      }

      if (lastUrl) {
        setResultUrl(lastUrl);
      } else {
        setError("Failed to apply changes.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-24 pb-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Edit3 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-bold text-3xl md:text-4xl">
              Visual PDF Editor
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Upload a PDF, click on any text to edit it, then download your
            modified document.
          </p>
        </div>
      </section>

      {/* Main Editor Section */}
      <section className="pb-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Controls */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="glass-strong border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Upload Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition-all bg-secondary/30 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary/50">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium text-muted-foreground text-center">
                    {file ? file.name : "Drop PDF here or click to browse"}
                  </span>
                  <input
                    type="file"
                    name="file_upload"
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                </label>
              </CardContent>
            </Card>

            {/* Actions Card */}
            {ocrElements.length > 0 && (
              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>

                  {resultUrl && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20"
                    >
                      <a href={resultUrl} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </a>
                    </Button>
                  )}

                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tips Card */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• Click on any text in the PDF to edit it</p>
                <p>• Changes are highlighted automatically</p>
                <p>• Click "Save Changes" to apply edits</p>
              </CardContent>
            </Card>
          </div>

          {/* Editor Canvas */}
          <div className="lg:col-span-9">
            <Card className="glass-strong border-border/50 h-[calc(100vh-280px)] min-h-[500px]">
              <CardContent className="p-2 h-full">
                <div className="bg-secondary/20 rounded-lg h-full flex justify-center items-start overflow-auto">
                  {file ? (
                    <div
                      className="relative shadow-2xl rounded-lg overflow-hidden"
                      ref={containerRef}
                    >
                      <Document
                        file={file}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="max-w-full"
                        loading={
                          <div className="flex items-center gap-2 text-muted-foreground p-8">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading
                            PDF...
                          </div>
                        }
                        error={
                          <div className="text-destructive p-8">
                            Failed to load PDF. Please try another file.
                          </div>
                        }
                      >
                        <Page
                          pageNumber={1}
                          scale={scale}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>

                      {/* Overlay Layer */}
                      <div className="absolute inset-0 pointer-events-none">
                        {isAnalyzing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                            <div className="flex flex-col items-center">
                              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                              <p className="text-sm font-medium text-primary">
                                Analyzing Text...
                              </p>
                            </div>
                          </div>
                        )}

                        {ocrElements.map((el) => {
                          const getFontFamily = (pdfFont: string) => {
                            const lower = pdfFont.toLowerCase();
                            if (
                              lower.includes("times") ||
                              lower.includes("serif")
                            )
                              return '"Times New Roman", Times, serif';
                            if (
                              lower.includes("courier") ||
                              lower.includes("mono")
                            )
                              return '"Courier New", Courier, monospace';
                            return "Arial, Helvetica, sans-serif";
                          };

                          return (
                            <div
                              key={el.id}
                              style={{
                                transform: `translate(${el.x - 2}px, ${
                                  el.y - 2
                                }px)`,
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: `${el.width + 4}px`,
                                height: `${el.height + 4}px`,
                              }}
                              className="pointer-events-auto z-10"
                            >
                              <input
                                type="text"
                                value={el.text}
                                onChange={(e) =>
                                  updateOcrText(el.id, e.target.value)
                                }
                                className="w-full h-full bg-white border border-transparent hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-black px-1 rounded-sm transition-all"
                                style={{
                                  fontSize: `${Math.max(
                                    10,
                                    parseFloat(el.fontSize.toString())
                                  )}px`,
                                  fontFamily: getFontFamily(el.fontName || ""),
                                  lineHeight: 1.1,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-20">
                      <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-10 h-10 opacity-50" />
                      </div>
                      <p className="text-lg font-medium mb-1">No PDF loaded</p>
                      <p className="text-sm">Upload a PDF to start editing</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 PDFLab.Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
