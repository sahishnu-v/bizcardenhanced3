// app/api/notify/route.ts
// Sends admin email via Resend when a new card is submitted
// Uses onboarding@resend.dev as sender (works without domain verification in test mode)

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { cardName, cardTitle, cardCompany, cardEmail } = await request.json();

    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL; // your verified email

    if (!resendApiKey || !adminEmail) {
      console.error("Missing RESEND_API_KEY or ADMIN_EMAIL env vars");
      return NextResponse.json({ error: "Email config missing" }, { status: 500 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: adminEmail,
        subject: `New card submission: ${cardName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-bottom: 8px;">📋 New Card Submission</h2>
            <p style="color: #64748b; margin-bottom: 24px;">A new business card is awaiting your approval.</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Name</td><td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${cardName}</td></tr>
              ${cardTitle ? `<tr><td style="padding: 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Title</td><td style="padding: 8px 0; color: #334155;">${cardTitle}</td></tr>` : ""}
              ${cardCompany ? `<tr><td style="padding: 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Company</td><td style="padding: 8px 0; color: #334155;">${cardCompany}</td></tr>` : ""}
              ${cardEmail ? `<tr><td style="padding: 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Email</td><td style="padding: 8px 0; color: #334155;">${cardEmail}</td></tr>` : ""}
            </table>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/submissions"
               style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Review Submission →
            </a>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return NextResponse.json({ error: "Email failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notify route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}