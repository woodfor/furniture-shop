import Link from "next/link";

import { DEFAULT_NAV_ITEMS } from "@/lib/constants";
import { getSiteSettings } from "@/lib/payload";

type NavItem = {
  href: string;
  label: string;
};

export async function SiteHeader() {
  const settings = await getSiteSettings();
  const rawNavItems: unknown[] = Array.isArray(settings?.navigationItems)
    ? settings.navigationItems
    : [];
  const navItems: NavItem[] =
    rawNavItems.length > 0
      ? rawNavItems
          .filter(
            (item): item is { href: string; label: string } =>
              typeof item === "object" &&
              item !== null &&
              "href" in item &&
              "label" in item &&
              typeof item.href === "string" &&
              typeof item.label === "string",
          )
          .map((item) => ({
            href: item.href,
            label: item.label,
          }))
      : [...DEFAULT_NAV_ITEMS];

  return (
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Furniture Studio
        </Link>
        <nav className="flex flex-wrap items-center gap-5 text-sm text-zinc-700">
          {navItems.map((item, index) => (
            <Link key={`${item.href}-${index}`} href={item.href} className="hover:text-zinc-900">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
