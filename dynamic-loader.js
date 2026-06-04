// Dynamic Article Loader v2 - Crown DS
// Handles pagination, search, category filter, and dynamic article rendering
(function() {
    'use strict';
    
    const PER_PAGE = 20;
    let allArticles = [];
    let currentPage = 1;
    let currentFilter = '';
    let currentCategory = 'all';
    let currentSort = 'newest';
    
    function init() {
        // Check if articles data exists globally
        if (typeof articles !== 'undefined' && Array.isArray(articles)) {
            allArticles = articles;
            setupControls();
            renderArticles();
        } else {
            // Try loading from script tag
            const scriptEl = document.getElementById('articles-data');
            if (scriptEl && scriptEl.textContent) {
                try {
                    const data = JSON.parse(scriptEl.textContent);
                    if (data.articles) {
                        allArticles = data.articles;
                    } else if (Array.isArray(data)) {
                        allArticles = data;
                    }
                } catch(e) {
                    console.warn('Failed to parse inline articles data');
                }
                setupControls();
                renderArticles();
            }
        }
    }
    
    function setupControls() {
        // Add search input if not present
        const controls = document.querySelector('.article-controls');
        if (!controls) return;
        
        // Wire up search
        const searchInput = controls.querySelector('input[type="text"]');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                currentFilter = this.value.toLowerCase();
                currentPage = 1;
                renderArticles();
            });
        }
        
        // Wire up category filter
        const catSelect = controls.querySelector('select.category-filter');
        if (catSelect) {
            catSelect.addEventListener('change', function() {
                currentCategory = this.value;
                currentPage = 1;
                renderArticles();
            });
        }
        
        // Wire up sort
        const sortSelect = controls.querySelector('select.sort-filter');
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                currentSort = this.value;
                currentPage = 1;
                renderArticles();
            });
        }
    }
    
    function getFilteredArticles() {
        let filtered = [...allArticles];
        
        // Search filter
        if (currentFilter) {
            filtered = filtered.filter(a => 
                (a.title && a.title.toLowerCase().includes(currentFilter)) ||
                (a.excerpt && a.excerpt.toLowerCase().includes(currentFilter)) ||
                (a.tags && a.tags.some(t => t.toLowerCase().includes(currentFilter)))
            );
        }
        
        // Category filter
        if (currentCategory && currentCategory !== 'all') {
            filtered = filtered.filter(a => {
                const cat = (a.category || '').toLowerCase();
                return cat === currentCategory || 
                       (a.tags && a.tags.some(t => t.toLowerCase() === currentCategory));
            });
        }
        
        // Sort
        if (currentSort === 'newest') {
            filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        } else if (currentSort === 'oldest') {
            filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        } else if (currentSort === 'az') {
            filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (currentSort === 'za') {
            filtered.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        }
        
        return filtered;
    }
    
    function renderArticles() {
        const grid = document.getElementById('article-grid');
        const pagination = document.getElementById('pagination');
        if (!grid) return;
        
        const filtered = getFilteredArticles();
        const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
        
        // Clamp current page
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        
        const start = (currentPage - 1) * PER_PAGE;
        const end = Math.min(start + PER_PAGE, filtered.length);
        const pageArticles = filtered.slice(start, end);
        
        // Render grid
        if (pageArticles.length === 0) {
            grid.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);"><p style="font-size:1.2rem;margin-bottom:8px;">No articles found</p><p>Try a different search or category</p></div>';
        } else {
            grid.innerHTML = pageArticles.map(a => {
                const icon = getIconForArticle(a);
                const slug = a.slug || '';
                const title = a.title || '';
                const excerpt = a.excerpt || '';
                const tag = a.tags && a.tags[0] ? a.tags[0] : (a.category || '');
                return `<a href="/${slug}.html" class="article-card">
                    <div class="article-card-icon">${icon}</div>
                    <div class="article-card-content">
                        <h3>${escapeHtml(title)}</h3>
                        <div class="meta">${a.readTime || '5 min read'}</div>
                        <p>${escapeHtml(excerpt.substring(0, 120))}</p>
                        <span class="article-tag">${escapeHtml(tag)}</span>
                    </div>
                </a>`;
            }).join('');
        }
        
        // Update article count
        const countEl = document.getElementById('article-count');
        if (countEl) {
            countEl.textContent = filtered.length;
        }
        
        // Render pagination
        if (pagination) {
            renderPagination(pagination, currentPage, totalPages, filtered.length);
        }
        
        // Update URL hash for shareability
        if (currentPage > 1) {
            window.location.hash = `page-${currentPage}`;
        }
    }
    
    function renderPagination(el, page, total, totalArticles) {
        if (total <= 1) {
            el.innerHTML = `<span class="page-info">${totalArticles} article${totalArticles !== 1 ? 's' : ''}</span>`;
            return;
        }
        
        let html = `<span class="page-info">Page ${page} of ${total} (${totalArticles} articles)</span>`;
        
        // Prev
        html += `<button class="page-btn" onclick="window._goPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>&larr; Prev</button>`;
        
        // Page numbers (show max 7)
        const maxVisible = 7;
        let startPage = Math.max(1, page - 3);
        let endPage = Math.min(total, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        if (startPage > 1) {
            html += `<button class="page-btn" onclick="window._goPage(1)">1</button>`;
            if (startPage > 2) html += `<span class="page-info">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="window._goPage(${i})">${i}</button>`;
        }
        
        if (endPage < total) {
            if (endPage < total - 1) html += `<span class="page-info">...</span>`;
            html += `<button class="page-btn" onclick="window._goPage(${total})">${total}</button>`;
        }
        
        // Next
        html += `<button class="page-btn" onclick="window._goPage(${page + 1})" ${page >= total ? 'disabled' : ''}>Next &rarr;</button>`;
        
        el.innerHTML = html;
    }
    
    window._goPage = function(p) {
        currentPage = p;
        renderArticles();
        window.scrollTo({top: 0, behavior: 'smooth'});
    };
    
    function getIconForArticle(a) {
        const title = (a.title || '').toLowerCase();
        const cat = (a.category || '').toLowerCase();
        const tags = (a.tags || []).join(' ').toLowerCase();
        
        if (title.includes('bitcoin') || title.includes('doge') || title.includes('meme')) return '🪙';
        if (title.includes('wallet') || title.includes('security')) return '🔒';
        if (title.includes('tax') || title.includes('accounting')) return '📊';
        if (title.includes('airdrop') || title.includes('farming')) return '💎';
        if (title.includes('defi') || title.includes('staking') || title.includes('yield')) return '🏦';
        if (title.includes('resume') || title.includes('job') || title.includes('career')) return '📄';
        if (title.includes('budget') || title.includes('save') || title.includes('finance')) return '💰';
        if (title.includes('productivity') || title.includes('habit') || title.includes('system')) return '⚡';
        if (title.includes('remote') || title.includes('work') || title.includes('nomad')) return '🌍';
        if (title.includes('nft') || title.includes('gaming') || title.includes('web3')) return '🎮';
        if (title.includes('trading') || title.includes('strategy') || title.includes('position')) return '📈';
        if (title.includes('exchange') || title.includes('cex') || title.includes('dex')) return '🔄';
        if (title.includes('guide') || title.includes('beginner') || title.includes('how')) return '📖';
        if (title.includes('predict') || title.includes('forecast') || title.includes('outlook')) return '🔮';
        if (title.includes('solana') || title.includes('sol')) return '🌀';
        if (title.includes('risk') || title.includes('scam') || title.includes('protect')) return '🛡️';
        return '📝';
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    
    // Init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

// Populate category filter from articles data
function populateCategoryFilter() {
    const categories = [...new Set(articles.map(a => a.category))];
    const filter = document.querySelector('.category-filter');
    if (filter) {
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat.replace('-', ' ').replace(/\w/g, l => l.toUpperCase());
            filter.appendChild(opt);
        });
    }
}
document.addEventListener('DOMContentLoaded', populateCategoryFilter);

})();
