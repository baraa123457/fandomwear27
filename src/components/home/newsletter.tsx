"use client";

import { useState, FormEvent } from "react";
import { Send, CheckCircle2, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { useToast } from "@/context/toast-context";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      toast({
        variant: "error",
        title: "Email address required",
        description: "Please enter your email to subscribe.",
      });
      return;
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      toast({
        variant: "error",
        title: "Invalid email format",
        description: "Please enter a valid email address (e.g. name@example.com).",
      });
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);
    setSubscribed(true);
    toast({
      variant: "success",
      title: "You're on the list! 🎉",
      description: "You'll be the first to know when new limited drops arrive.",
    });
  };

  return (
    <section className="border-t border-line bg-surface/30 py-20 sm:py-28">
      <Reveal className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-purple/15 text-accent-purple shadow-xl">
          <Mail className="h-7 w-7" />
        </div>

        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1 text-xs font-semibold text-accent-purple">
          <Sparkles className="h-3.5 w-3.5" /> VIP Drops & Early Access
        </span>

        <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Be First to Know About New Drops
        </h2>
        <p className="mt-3 max-w-xl mx-auto text-sm text-ink-dim sm:text-base leading-relaxed">
          Join our community of over 5,000+ anime, gaming, and streetwear enthusiasts. Get secret discounts, drop alerts, and exclusive restock notifications.
        </p>

        {subscribed ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-400">
            <CheckCircle2 className="h-5 w-5" /> You&apos;re subscribed! Keep an eye on your inbox for our next drop.
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="mt-8 mx-auto flex w-full max-w-lg flex-col gap-3.5 sm:flex-row sm:gap-3" noValidate>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className="min-h-[56px] h-14 w-full shrink-0 flex-1 rounded-2xl border-2 border-line bg-surface px-6 py-4 text-base font-normal text-ink placeholder:text-ink-dim/50 shadow-sm transition-all focus:border-accent-purple focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent-purple/15"
            />
            <Button
              type="submit"
              size="lg"
              variant="accent"
              disabled={loading}
              className="min-h-[56px] h-14 w-full shrink-0 gap-2.5 rounded-2xl px-8 text-base font-bold shadow-lg shadow-accent-purple/20 sm:w-auto"
            >
              <Send className="h-4 w-4" /> {loading ? "Joining..." : "Subscribe"}
            </Button>
          </form>
        )}

      </Reveal>
    </section>
  );
}
