/**
 * Affiliate Banner Injector v1.0
 * Crown DS — Configurable affiliate link injection for all sites
 * 
 * Architecture:
 * - Self-contained (no dependency on articles-data.js)
 * - Site-aware (detects hostname, applies site config)
 * - Category-aware when articles-data.js available (falls back to site default)
 * - GA4 click tracking built in
 * - Config object at top — CMRC fills in actual affiliate URLs
 * 
 * === CONFIGURATION ===
 * CMRC: Edit AFFILIATE_CONFIG below with actual affiliate links/IDs
 * Each site has: site name, default link, category-specific links, banner HTML
 */

(function() {
    'use strict';

    // ============================================================
    // AFFILIATE CONFIG — EDIT THIS SECTION (CMRC)
    // ============================================================
    // Format: { site-domain: { default: { ... }, categories: { "cat-slug": { ... } } } }
    // Use [PLACEHOLDER] URLs until actual affiliate links are obtained.
    // ============================================================

    const AFFILIATE_CONFIG = {
        'lifesystemos.com': {
            default: {
                title: 'Supercharge Your Productivity',
                description: 'Get the tools and systems to build your personal operating system.',
                cta: 'Get Started →',
                url: 'https://app.systeme.io/PLACEHOLDER_LIFEOS',  // ← CMRC: Replace with Systeme.io affiliate link
                program: 'Systeme.io',
                commission: '60% recurring'
            },
            categories: {
                'productivity': {
                    title: 'The Ultimate Productivity System',
                    description: 'Stop browsing. Start building. Life OS gives you the exact system to get more done.',
                    cta: 'Build Your System →',
                    url: 'https://app.systeme.io/PLACEHOLDER_LIFEOS',
                    program: 'Systeme.io'
                },
                'habits': {
                    title: 'Habits That Stick — Atomic System',
                    description: 'Most habit trackers fail. This one is built on behavioral science that actually works.',
                    cta: 'Start Your Habits →',
                    url: 'https://app.systeme.io/PLACEHOLDER_HABITS',
                    program: 'Systeme.io'
                },
                'mental-health': {
                    title: 'Mental Clarity System',
                    description: 'Reduce anxiety, improve focus, and build a calm mind with proven protocols.',
                    cta: 'Find Clarity →',
                    url: 'https://app.systeme.io/PLACEHOLDER_MENTAL',
                    program: 'Systeme.io'
                },
                'time': {
                    title: 'Master Your Time',
                    description: 'Stop being busy. Start being productive. Time management that actually works.',
                    cta: 'Take Control →',
                    url: 'https://app.systeme.io/PLACEHOLDER_TIME',
                    program: 'Systeme.io'
                },
                'system': {
                    title: 'Build Your Second Brain',
                    description: 'A complete system for organizing your digital life. Notion templates, workflows, and more.',
                    cta: 'Build Your System →',
                    url: 'https://app.systeme.io/PLACEHOLDER_SYSTEM',
                    program: 'Systeme.io'
                },
                'notion': {
                    title: 'Notion Power User Bundle',
                    description: 'Pre-built Notion templates for goal tracking, project management, and daily planning.',
                    cta: 'Get the Bundle →',
                    url: 'https://app.systeme.io/PLACEHOLDER_NOTION',
                    program: 'Systeme.io'
                }
            }
        },

        'resumeprotips.com': {
            default: {
                title: 'Land Your Dream Job Faster',
                description: 'Professional resume templates, cover letter guides, and career tools that get you hired.',
                cta: 'Build Your Resume →',
                url: 'https://app.systeme.io/PLACEHOLDER_RESUME',  // ← CMRC: Replace
                program: 'Systeme.io',
                commission: '60% recurring'
            },
            categories: {
                'resume': {
                    title: 'ATS-Proof Resume Templates',
                    description: 'Resume templates designed to pass Applicant Tracking Systems and land interviews.',
                    cta: 'Get Templates →',
                    url: 'https://app.systeme.io/PLACEHOLDER_RESUME',
                    program: 'Systeme.io'
                },
                'career': {
                    title: 'Career Growth Toolkit',
                    description: 'From job search to promotion — the complete career advancement system.',
                    cta: 'Advance Your Career →',
                    url: 'https://app.systeme.io/PLACEHOLDER_CAREER',
                    program: 'Systeme.io'
                }
            }
        },

        'remoteworkhub.net': {
            default: {
                title: 'Start Your Remote Career',
                description: 'Comprehensive guides, job board access, and tools to land your first remote job.',
                cta: 'Go Remote →',
                url: 'https://app.systeme.io/PLACEHOLDER_REMOTE',  // ← CMRC: Replace
                program: 'Systeme.io',
                commission: '60% recurring'
            },
            categories: {
                'jobs': {
                    title: 'Remote Job Seeker Bundle',
                    description: 'Curated remote job listings, application trackers, and interview preparation guides.',
                    cta: 'Find Remote Jobs →',
                    url: 'https://app.systeme.io/PLACEHOLDER_JOBS',
                    program: 'Systeme.io'
                },
                'career': {
                    title: 'Remote Career Blueprint',
                    description: 'Step-by-step system to transition from office to remote work — with or without experience.',
                    cta: 'Start Your Journey →',
                    url: 'https://app.systeme.io/PLACEHOLDER_REMOTE_CAREER',
                    program: 'Systeme.io'
                },
                'tools': {
                    title: 'Essential Remote Work Toolkit',
                    description: 'The exact tools and software setup used by top remote professionals worldwide.',
                    cta: 'Get the Toolkit →',
                    url: 'https://app.systeme.io/PLACEHOLDER_TOOLS',
                    program: 'Systeme.io'
                },
                'nomad': {
                    title: 'Digital Nomad Starter Pack',
                    description: 'Everything you need to work from anywhere — visas, gear, insurance, and communities.',
                    cta: 'Start Nomading →',
                    url: 'https://app.systeme.io/PLACEHOLDER_NOMAD',
                    program: 'Systeme.io'
                },
                'general': {
                    title: 'Remote Work Essentials',
                    description: 'The definitive guide to thriving as a remote professional in 2026.',
                    cta: 'Learn More →',
                    url: 'https://app.systeme.io/PLACEHOLDER_REMOTE_GENERAL',
                    program: 'Systeme.io'
                },
                'productivity': {
                    title: 'Remote Productivity System',
                    description: 'Stay focused, avoid burnout, and deliver results — even when nobody is watching.',
                    cta: 'Get Productive →',
                    url: 'https://app.systeme.io/PLACEHOLDER_REMOTE_PROD',
                    program: 'Systeme.io'
                }
            }
        },

        'zerobudgeting.com': {
            default: {
                title: 'Master Your Money',
                description: 'Proven budgeting systems, savings plans, and investment strategies for financial freedom.',
                cta: 'Take Control →',
                url: 'https://app.systeme.io/PLACEHOLDER_BUDGET',  // ← CMRC: Replace
                program: 'Systeme.io',
                commission: '60% recurring'
            },
            categories: {
                'budgeting': {
                    title: 'Zero-Based Budgeting System',
                    description: 'The exact budgeting framework that helped thousands save their first $10K.',
                    cta: 'Start Budgeting →',
                    url: 'https://app.systeme.io/PLACEHOLDER_ZBB',
                    program: 'Systeme.io'
                },
                'general': {
                    title: 'Financial Freedom Roadmap',
                    description: 'From debt to financial independence — a complete 12-month action plan.',
                    cta: 'Get the Roadmap →',
                    url: 'https://app.systeme.io/PLACEHOLDER_FINANCE',
                    program: 'Systeme.io'
                }
            }
        }
    };

    // ============================================================
    // BANNER STYLES (injected dynamically)
    // ============================================================
    const BANNER_STYLES = `
        .affiliate-banner {
            margin: 2.5rem 0;
            padding: 2rem 2.5rem;
            border-radius: 16px;
            background: linear-gradient(135deg, var(--card-bg, #1a1a2e), var(--card-bg-alt, #16213e));
            border: 1px solid var(--border, #2a2a4a);
            text-align: center;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .affiliate-banner::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--gold, #f5b042), var(--gold-light, #f7c35c));
        }
        .affiliate-banner:hover {
            border-color: var(--gold, #f5b042);
            box-shadow: 0 8px 30px rgba(245, 176, 66, 0.1);
            transform: translateY(-2px);
        }
        .affiliate-banner h3 {
            font-size: 1.4rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
            color: var(--text, #e0d8f0);
        }
        .affiliate-banner p {
            font-size: 0.95rem;
            color: var(--text-secondary, #9990c4);
            margin: 0 0 1.2rem 0;
            line-height: 1.6;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
        }
        .affiliate-banner .affiliate-cta {
            display: inline-block;
            padding: 0.8rem 2rem;
            background: linear-gradient(135deg, var(--gold, #f5b042), var(--gold-light, #f7c35c));
            color: #0f0e1a;
            font-weight: 700;
            font-size: 1rem;
            border-radius: 10px;
            text-decoration: none;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        .affiliate-banner .affiliate-cta:hover {
            transform: scale(1.03);
            box-shadow: 0 4px 15px rgba(245, 176, 66, 0.3);
        }
        .affiliate-banner .affiliate-disclosure {
            display: block;
            margin-top: 0.8rem;
            font-size: 0.7rem;
            color: var(--text-muted, #666);
            opacity: 0.6;
        }
        .affiliate-banner .affiliate-badge {
            display: inline-block;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            background: rgba(245, 176, 66, 0.15);
            color: var(--gold, #f5b042);
            padding: 3px 10px;
            border-radius: 20px;
            margin-bottom: 0.8rem;
        }
        @media (max-width: 600px) {
            .affiliate-banner {
                padding: 1.5rem 1.2rem;
            }
            .affiliate-banner h3 {
                font-size: 1.15rem;
            }
        }
    `;

    // ============================================================
    // CORE LOGIC
    // ============================================================

    function getSiteConfig() {
        const hostname = window.location.hostname.toLowerCase();
        // Try exact match first, then partial match
        for (const domain in AFFILIATE_CONFIG) {
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                return AFFILIATE_CONFIG[domain];
            }
        }
        return null;
    }

    function getCurrentCategory() {
        // First try: articles-data.js (if loaded)
        if (typeof articles !== 'undefined' && Array.isArray(articles)) {
            const slug = getCurrentSlug();
            for (let i = 0; i < articles.length; i++) {
                if (articles[i].slug === slug) {
                    return (articles[i].category || '').toLowerCase();
                }
            }
        }
        // Second try: meta tags
        const metaCat = document.querySelector('meta[name="category"]');
        if (metaCat) return metaCat.getAttribute('content').toLowerCase();
        
        // Third try: URL path patterns
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/category/')) {
            const parts = path.split('/category/');
            if (parts[1]) return parts[1].split('/')[0];
        }
        
        return 'default';
    }

    function getCurrentSlug() {
        const path = window.location.pathname.replace(/\/$/, '');
        const parts = path.split('/');
        return parts[parts.length - 1].replace('.html', '');
    }

    function getAffiliateLink(config, category) {
        // Try category-specific link first
        if (category && config.categories && config.categories[category]) {
            return config.categories[category];
        }
        // Fall back to default
        return config.default;
    }

    function injectStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = BANNER_STYLES;
        document.head.appendChild(styleEl);
    }

    function injectBanner(linkConfig) {
        // Create banner element
        const banner = document.createElement('div');
        banner.className = 'affiliate-banner';
        banner.innerHTML = `
            ${linkConfig.program ? `<span class="affiliate-badge">⚡ ${linkConfig.program}</span>` : ''}
            <h3>${linkConfig.title}</h3>
            <p>${linkConfig.description}</p>
            <a href="${linkConfig.url}" 
               class="affiliate-cta" 
               target="_blank" 
               rel="noopener noreferrer"
               onclick="gtag('event', 'affiliate_click', {'program': '${linkConfig.program || 'affiliate'}', 'url': '${linkConfig.url}'});">
                ${linkConfig.cta}
            </a>
            <small class="affiliate-disclosure">
                As an affiliate, we may earn a commission at no extra cost to you.
            </small>
        `;

        // Insert before the related articles section, or before the footer
        const relatedSection = document.getElementById('related-articles');
        if (relatedSection) {
            relatedSection.parentNode.insertBefore(banner, relatedSection);
        } else {
            const footer = document.querySelector('footer');
            const container = document.querySelector('.container');
            if (container && container.parentNode) {
                container.parentNode.insertBefore(banner, footer || null);
            } else if (footer) {
                footer.parentNode.insertBefore(banner, footer);
            } else {
                document.body.appendChild(banner);
            }
        }
    }

    function init() {
        // Don't inject on homepage or non-article pages
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html' || 
            path.includes('/products') || path.includes('/checkout') ||
            path.includes('/about') || path.includes('/404') ||
            path === '') {
            return;
        }

        const siteConfig = getSiteConfig();
        if (!siteConfig) return;

        // Check if there's already an affiliate banner (avoid duplicates)
        if (document.querySelector('.affiliate-banner')) return;

        const category = getCurrentCategory();
        const linkConfig = getAffiliateLink(siteConfig, category);

        injectStyles();
        injectBanner(linkConfig);
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
