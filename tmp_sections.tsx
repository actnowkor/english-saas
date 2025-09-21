// Í≤ΩÎ°ú: components/marketing/sections.tsx
// ??ï†: ?úÎî© ?πÏÖò??Hero/Empathy/Features/Pricing/FAQ/Testimonials/CTA/Footer)

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { koCopy } from "@/lib/copy/ko"

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 pb-10 md:pt-16 md:pb-16">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            {koCopy.hero.title}
          </h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {koCopy.hero.sub}
          </p>
          <ul className="flex flex-wrap gap-2 mb-6 text-sm text-muted-foreground">
            {koCopy.hero.bullets.map((b) => (
              <li key={b} className="px-2 py-1 rounded-full bg-muted">{b}</li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/signin">{koCopy.hero.primary}</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/learn?demo=true">{koCopy.hero.secondary}</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{koCopy.hero.social}</p>
        </div>
        <div className="relative aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/10 to-muted overflow-hidden shadow-sm">
          <Image alt="illustration" src="/hero-illustration.png" fill className="object-cover" priority={false} />
        </div>
      </div>
    </section>
  )
}

export function Empathy() {
  return (
    <section id="empathy" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{koCopy.empathy.title}</h2>
          <ul className="space-y-2 text-muted-foreground mb-4">
            {koCopy.empathy.points.map((p) => (
              <li key={p}>??{p}</li>
            ))}
          </ul>
          <p className="font-medium">{koCopy.empathy.reframe}</p>
        </div>
        <div className="relative aspect-[4/3] rounded-2xl bg-muted overflow-hidden shadow-sm">
          <Image alt="empathy" src="/empathy.png" fill className="object-cover" />
        </div>
      </div>
    </section>
  )
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{koCopy.features.title}</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {koCopy.features.items.map((f) => (
          <div key={f.title} className="rounded-2xl border p-4 bg-card shadow-sm">
            <div className="text-lg font-semibold mb-2">{f.title}</div>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-2 mt-6 text-sm text-muted-foreground">
        {koCopy.features.checklist.map((c) => (
          <li key={c} className="px-2 py-1 rounded-full bg-muted">{c}</li>
        ))}
      </ul>
    </section>
  )
}

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{koCopy.pricing.title}</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {koCopy.pricing.plans.map((p) => (
          <div key={p.name} className="rounded-2xl border p-6 bg-card shadow-sm flex flex-col">
            <div className="text-lg font-semibold">{p.name}</div>
            <div className="text-3xl font-extrabold mt-2">{p.price}</div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground flex-1">
              {p.features.map((f) => (
                <li key={f}>??{f}</li>
              ))}
            </ul>
            <Button className="mt-4" data-plan={p.name.toLowerCase()} aria-label={`${p.name} ?†ÌÉù`}>
              ?†ÌÉù?òÍ∏∞
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{koCopy.pricing.note}</p>
    </section>
  )
}

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{koCopy.faq.title}</h2>
      <div className="space-y-3">
        {koCopy.faq.items.map((item, idx) => (
          <details key={idx} className="rounded-2xl border p-4 bg-card shadow-sm">
            <summary className="cursor-pointer font-medium">{item.q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Testimonials() {
  return (
    <section id="posts" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{koCopy.testimonials.title}</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {koCopy.testimonials.items.map((t) => (
          <div key={t.name} className="rounded-2xl border p-4 bg-card shadow-sm">
            <blockquote className="text-sm leading-relaxed">??t.quote}??/blockquote>
            <div className="text-xs text-muted-foreground mt-2">??{t.name}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 text-center">
      <h2 className="text-2xl md:text-3xl font-bold mb-4">{koCopy.cta.title}</h2>
      <div className="flex justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/signin">{koCopy.cta.primary}</Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/learn?demo=true">{koCopy.cta.secondary}</Link>
        </Button>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            {koCopy.footer.links.map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`}>{l}</a>
            ))}
          </div>
          <div className="opacity-80">¬© {new Date().getFullYear()} Starting English</div>
        </div>
        <div className="mt-2 text-xs">{koCopy.footer.built}</div>
      </div>
    </footer>
  )
}


