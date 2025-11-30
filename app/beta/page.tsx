import { Suspense } from "react";
import BetaApplicationClient from "./BetaApplicationClient";

// Force dynamic rendering to prevent static generation issues with client components
export const dynamic = 'force-dynamic';

export default function BetaApplicationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <BetaApplicationClient />
    </Suspense>
  );
}
