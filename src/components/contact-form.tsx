"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [status, setStatus] = useState<"error" | "idle" | "success">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(formData: FormData) {
    setStatus("idle");
    setMessage("");

    const payload = {
      name: formData.get("name"),
      contact: formData.get("contact"),
      content: formData.get("content"),
    };

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(result.message ?? "Failed to send message.");
      return;
    }

    setStatus("success");
    setMessage("Message sent. We will contact you soon.");
  }

  return (
    <form action={onSubmit} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact">Phone / Email</Label>
        <Input id="contact" name="contact" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Message</Label>
        <Textarea id="content" name="content" rows={6} required />
      </div>

      <Button type="submit">Send</Button>
      {message ? (
        <p className={status === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
