"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Clock, Mail, MessageCircle, Send, Sparkles } from "lucide-react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Dropdown } from "@/components/shared/dropdown";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/context/store-settings-context";
import { fadeInUp, revealOnScroll } from "@/lib/motion";


const topics = [
  { value: "order", label: "An order I placed" },
  { value: "product", label: "Product / sizing question" },
  { value: "returns", label: "Returns or exchange request" },
  { value: "partnership", label: "Partnership or business inquiry" },
  { value: "other", label: "Something else" },
];

export default function ContactView() {
  const { settings } = useStoreSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [orderId, setOrderId] = useState("");
  const [topic, setTopic] = useState("order");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    // Simulate instantaneous async dispatch
    await new Promise((resolve) => setTimeout(resolve, 600));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Breadcrumbs items={[{ label: "Contact Us" }]} />

      <motion.div variants={fadeInUp} initial="hidden" animate="show" className="mt-6 max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1 text-xs font-semibold text-accent-cyan">
          <Sparkles className="h-3.5 w-3.5" /> Customer Care Team
        </span>
        <h1 className="mt-4 text-balance font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Get in touch with us.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-dim">
          Have questions about sizing, a recent order, returns, or future drops? Send us a message or chat with us directly on WhatsApp — our Cairo team responds within 24 hours.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Form */}
        <motion.div variants={fadeInUp} {...revealOnScroll} className="rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-xl">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-4 py-16 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-cyan/15 text-accent-cyan shadow-lg">
                <Check className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink">Message Received!</h2>
              <p className="max-w-md text-sm text-ink-dim leading-relaxed">
                Thank you, <strong className="text-ink">{name.split(" ")[0]}</strong>. Your message has been routed to our support specialists. We will reply to <strong className="text-ink">{email}</strong> within 24 hours.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubmitted(false);
                    setName("");
                    setEmail("");
                    setOrderId("");
                    setMessage("");
                    setTopic("order");
                  }}
                >
                  Send another message
                </Button>
                <Button asChild size="sm" variant="accent">
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-semibold text-ink">Full Name *</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Omar Tarek"
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold text-ink">Email Address *</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-semibold text-ink">Topic *</span>
                  <Dropdown
                    className="mt-1.5"
                    fullWidth
                    ariaLabel="Select Topic"
                    value={topic}
                    options={topics}
                    onChange={setTopic}
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold text-ink">Order ID (Optional)</span>
                  <input
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. ORD-1049"
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
                  />
                </label>
              </div>

              <label>
                <span className="text-xs font-semibold text-ink">Your Message *</span>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry, sizing question, or order details..."
                  className="mt-1.5 w-full resize-none rounded-xl border border-line bg-void px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
                />
              </label>

              <Button type="submit" size="lg" variant="accent" disabled={loading} className="justify-self-start gap-2">
                <Send className="h-4 w-4" /> {loading ? "Sending..." : "Submit Message"}
              </Button>
            </form>
          )}
        </motion.div>

        {/* Side info & WhatsApp Quick Connect */}
        <motion.div variants={fadeInUp} {...revealOnScroll} className="flex flex-col gap-4">
          {/* WhatsApp Direct Chat Card */}
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-6 shadow-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-ink">WhatsApp Live Support</h3>
            <p className="mt-1.5 text-xs text-ink-dim leading-relaxed">
              Need immediate help with sizing, address changes, or live order tracking?
            </p>
            {(() => {
              const cleanPhone = (settings.whatsappPhone || settings.contactPhone || "").replace(/[^0-9]/g, "");
              const waHref = `https://wa.me/${cleanPhone || "201000000000"}?text=${encodeURIComponent(
                "Hello FandomWear, I have a question about my order"
              )}`;
              return (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-void transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="h-4 w-4 fill-current" /> Chat on WhatsApp
                </a>
              );
            })()}
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/15 text-accent-purple">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-ink">Direct Email</h3>
            <a
              href={`mailto:${settings.storeEmail || "support@fandomwear.store"}`}
              className="mt-1 block text-xs text-ink-dim hover:text-accent-cyan"
            >
              {settings.storeEmail || "support@fandomwear.store"}
            </a>
          </div>


          <div className="rounded-3xl border border-line bg-surface p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-ink">Working Hours</h3>
            <p className="mt-1 text-xs text-ink-dim">Saturday – Thursday: 10:00 AM – 10:00 PM (Cairo Time)</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
