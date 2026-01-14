"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const PdfEditorClient = dynamic(() => import("./PdfEditorClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Editor...</p>
      </div>
    </div>
  ),
});

export default function PdfEditorPage() {
  return <PdfEditorClient />;
}
