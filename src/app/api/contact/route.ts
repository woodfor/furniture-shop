import { NextResponse } from "next/server";
import { z } from "zod";

import { getPayloadClient } from "@/lib/payload";

const contactSchema = z.object({
  name: z.string().min(1),
  contact: z.string().min(1),
  content: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid form data." }, { status: 400 });
    }

    const payload = await getPayloadClient();
    const settings = await payload.findGlobal({
      slug: "site-settings",
    });

    const recipient = settings.contactRecipientEmail;
    if (!recipient) {
      return NextResponse.json(
        { message: "Missing recipient email in CMS settings." },
        { status: 400 },
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { message: "Missing RESEND_API_KEY environment variable." },
        { status: 500 },
      );
    }

    await payload.sendEmail({
      to: recipient,
      subject: `Furniture inquiry from ${parsed.data.name}`,
      text: `Name: ${parsed.data.name}\nContact: ${parsed.data.contact}\n\n${parsed.data.content}`,
      html: `
        <p><strong>Name:</strong> ${parsed.data.name}</p>
        <p><strong>Contact:</strong> ${parsed.data.contact}</p>
        <p><strong>Message:</strong></p>
        <p>${parsed.data.content.replace(/\n/g, "<br />")}</p>
      `,
    });

    return NextResponse.json({ message: "ok" });
  } catch {
    return NextResponse.json({ message: "Failed to send message." }, { status: 500 });
  }
}
