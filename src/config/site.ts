// site.ts — ZeroBudgeting per-site config (Phase 1.2 shared library)
export interface SiteConfig {
  name: string;
  tagline: string;
  url: string;
  logo?: { src: string; alt: string };
  nav: { href: string; label: string }[];
  footerColumns: { heading: string; links: { href: string; label: string }[] }[];
  social: { label: string; href: string }[];
  newsletter: { magnetName: string; valueProp: string; downloadUrl: string };
  legalNote: string;
}

export const site: SiteConfig = {
  name: 'ZeroBudgeting',
  tagline: 'Master your money with zero-based budgeting. Personal finance guides, tools, and strategies.',
  url: 'https://zerobudgeting.com',
  nav: [
    { href: '/', label: 'Home' },
    { href: '/all-articles', label: 'Articles' },
    { href: '/about', label: 'About' },
  ],
  footerColumns: [
    {
      heading: 'Quick Links',
      links: [
        { href: '/all-articles', label: 'All Articles' },
        { href: '/about', label: 'About' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { href: '/checklist', label: 'Checklist' },
        { href: '/products', label: 'Products' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { href: '/privacy', label: 'Privacy' },
        { href: '/disclaimer', label: 'Disclaimer' },
      ],
    },
  ],
  social: [
    { label: 'X', href: 'https://x.com/ZeroBudgeting' },
    { label: 'Pinterest', href: 'https://www.pinterest.com/zerobudgeting' },
  ],
  newsletter: {
    magnetName: 'Zero Budget Blueprint',
    valueProp: 'Get the free Zero Budget Blueprint — the exact system to give every dollar a job.',
    downloadUrl: '/downloads/zero-budget-blueprint.html',
  },
  legalNote: 'Educational content only, not financial advice.',
};
