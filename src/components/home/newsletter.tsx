"use client";

import { useState, FormEvent } from "react";
import { Send, CheckCircle2, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { useToast } from "@/context/toast-context";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

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
          <form onSubmit={handleSubscribe} className="mt-8 mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className="h-14 w-full flex-1 rounded-2xl border border-line bg-void px-5 text-base text-ink placeholder:text-ink-faint focus:border-accent-purple focus:outline-none sm:h-12 sm:rounded-xl sm:text-sm"
            />
            <Button type="submit" size="lg" variant="accent" disabled={loading} className="h-14 w-full gap-2 rounded-2xl text-base sm:h-12 sm:w-auto sm:shrink-0 sm:rounded-xl sm:text-sm">
              <Send className="h-4 w-4" /> {loading ? "Joining..." : "Subscribe"}
            </Button>
          </form>

        )}
      </Reveal>
    </section>
  );
}
