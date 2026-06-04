/**
 * Related Articles Loader v1.0
 * Crown DS — Automatically displays related articles on article pages
 * Reads from articles-data.js and shows articles from same category
 */
(function() {
    'use strict';
    
    const MAX_RELATED = 4;
    
    function getCurrentSlug() {
        // Extract slug from URL path
        const path = window.location.pathname.replace(/\/$/, '');
        const parts = path.split('/');
        return parts[parts.length - 1].replace('.html', '');
    }
    
    function findRelatedArticles() {
        if (typeof articles === 'undefined' || !Array.isArray(articles)) {
            return [];
        }
        
        const currentSlug = getCurrentSlug();
        let currentArticle = null;
        
        // Find the current article
        for (let i = 0; i < articles.length; i++) {
            if (articles[i].slug === currentSlug) {
                currentArticle = articles[i];
                break;
            }
        }
        
        if (!currentArticle) {
            // Try matching by checking if slug is contained in title
            for (let i = 0; i < articles.length; i++) {
                const slugified = (articles[i].title || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
                if (slugified.includes(currentSlug.slice(0, 15)) || 
                    currentSlug.includes(articles[i].slug.slice(0, 15))) {
                    currentArticle = articles[i];
                    break;
                }
            }
        }
        
        if (!currentArticle) return [];
        
        const currentCategory = (currentArticle.category || '').toLowerCase();
        const currentTags = (currentArticle.tags || []).map(t => t.toLowerCase());
        
        // Score and rank related articles
        const scored = articles
            .filter(a => a.slug !== currentArticle.slug) // Exclude current
            .map(a => {
                let score = 0;
                const aCat = (a.category || '').toLowerCase();
                const aTags = (a.tags || []).map(t => t.toLowerCase());
                
                // Same category = high relevance
                if (aCat === currentCategory) score += 3;
                
                // Shared tags
                const sharedTags = currentTags.filter(t => aTags.includes(t));
                score += sharedTags.length;
                
                // Tag overlap with current category
                if (aTags.includes(currentCategory)) score += 1;
                
                return { article: a, score: score };
            })
            .filter(s => s.score > 0) // Only relevant articles
            .sort((a, b) => b.score - a.score) // Best first
            .slice(0, MAX_RELATED)
            .map(s => s.article);
        
        return scored;
    }
    
    function renderRelatedArticles(related) {
        if (!related || related.length === 0) return;
        
        // Find or create the related articles section
        let section = document.getElementById('related-articles');
        if (!section) {
            section = document.createElement('section');
            section.id = 'related-articles';
            section.className = 'section related-articles-section';
            
            // Insert before footer
            const footer = document.querySelector('footer');
            const mainContent = document.querySelector('.container');
            if (footer) {
                footer.parentNode.insertBefore(section, footer);
            } else if (mainContent && mainContent.parentNode) {
                mainContent.parentNode.appendChild(section);
            } else {
                document.body.appendChild(section);
            }
        }
        
        const siteName = document.querySelector('title')?.textContent?.split('|')[0]?.trim() || 'Explore More';
        
        section.innerHTML = `
            <div class="container">
                <h2 class="section-title" style="text-align:center;margin-bottom:2rem;">
                    <span class="gold" style="font-size:1.8rem;">📚 Related Articles</span>
                </h2>
                <div class="related-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem;">
                    ${related.map(a => `
                        <a href="/${a.slug}.html" class="related-card" style="
                            display:block;
                            background:var(--card-bg,#1a1a2e);
                            border:1px solid var(--border,#2a2a4a);
                            border-radius:12px;
                            padding:1.5rem;
                            text-decoration:none;
                            color:var(--text,#e0d8f0);
                            transition:all 0.2s ease;
                        ">
                            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--gold,#f5b042);margin-bottom:0.5rem;">
                                ${a.category || 'Article'}
                            </div>
                            <h3 style="font-size:1rem;font-weight:600;line-height:1.4;margin:0 0 0.5rem 0;color:var(--text,#e0d8f0);">
                                ${a.title || ''}
                            </h3>
                            <p style="font-size:0.85rem;color:var(--text-secondary,#9990c4);margin:0;line-height:1.5;">
                                ${(a.excerpt || '').substring(0, 120)}${(a.excerpt || '').length > 120 ? '...' : ''}
                            </p>
                            ${a.readTime ? `<div style="margin-top:0.75rem;font-size:0.75rem;color:var(--text-muted,#666);">⏱ ${a.readTime}</div>` : ''}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Add hover effect via CSS
        const style = document.createElement('style');
        style.textContent = `
            .related-card:hover {
                transform: translateY(-3px);
                border-color: var(--gold, #f5b042) !important;
                box-shadow: 0 8px 30px rgba(245, 176, 66, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize on DOM ready
    function init() {
        // Wait for articles data to be available
        if (typeof articles !== 'undefined' && Array.isArray(articles)) {
            const related = findRelatedArticles();
            renderRelatedArticles(related);
        } else {
            // Retry after articles-data.js loads
            const checkInterval = setInterval(function() {
                if (typeof articles !== 'undefined') {
                    clearInterval(checkInterval);
                    const related = findRelatedArticles();
                    renderRelatedArticles(related);
                }
            }, 100);
            // Stop checking after 5 seconds
            setTimeout(function() {
                clearInterval(checkInterval);
            }, 5000);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
