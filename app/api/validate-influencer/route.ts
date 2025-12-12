import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Validate by calling the partner dashboard endpoint.
    // Use the Next.js rewrite proxy so this works in Docker + local dev.
    const origin = new URL(request.url).origin;
    const response = await fetch(
      `${origin}/api/partners/${encodeURIComponent(code)}/dashboard`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json({ valid: false }, { status: 200 }); // Return 200 with valid: false for clean frontend handling
    }

    const data = await response.json();

    return NextResponse.json({
      valid: true,
      partnerName: data.partner.name,
      partnerPlatform: data.partner.platform,
    });
  } catch (error) {
    console.error("Error validating influencer code:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
