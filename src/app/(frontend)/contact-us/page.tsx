import { ContactForm } from "@/components/contact-form";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
        <h1 className="text-3xl font-semibold">Contact Us</h1>
        <p className="text-zinc-600">
          Tell us your idea, preferred material, or budget. We will reply with suggestions and an
          estimate.
        </p>
        <ContactForm />
      </div>
    </>
  );
}
