// Search functionality for Hugo blog
(function() {
    let searchIndex = [];
    let searchInput = document.getElementById('search-input');
    let searchResults = document.getElementById('search-results');
    let searchSummary = document.getElementById('search-summary');
    
    // Load search index
    async function loadSearchIndex() {
        try {
            const response = await fetch('/index.json');
            searchIndex = await response.json();
            console.log('Search index loaded:', searchIndex.length, 'posts');
        } catch (error) {
            console.error('Error loading search index:', error);
            showError('Failed to load search index');
        }
    }
    
    // Highlight search terms in text
    function highlightText(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    // Escape special regex characters
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Format date
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    // Get URL parameters
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    
    // Update URL with search query
    function updateUrl(query) {
        const url = new URL(window.location);
        if (query) {
            url.searchParams.set('q', query);
        } else {
            url.searchParams.delete('q');
        }
        window.history.replaceState({}, '', url);
    }
    
    // Show error message
    function showError(message) {
        searchResults.innerHTML = `<div class="no-results">${message}</div>`;
        searchSummary.textContent = '';
    }
    
    // Show loading state
    function showLoading() {
        searchResults.innerHTML = '<div class="loading">Searching...</div>';
        searchSummary.textContent = '';
    }
    
    // Perform search
    function performSearch(query) {
        if (!query || query.length < 2) {
            searchResults.innerHTML = '';
            searchSummary.textContent = '';
            updateUrl('');
            return;
        }
        
        showLoading();
        updateUrl(query);
        
        // Simple search implementation
        const results = searchIndex.filter(post => {
            const searchableText = (post.title + ' ' + post.content + ' ' + post.summary).toLowerCase();
            return searchableText.includes(query.toLowerCase());
        });
        
        // Sort by relevance (title matches first, then content matches)
        results.sort((a, b) => {
            const aTitle = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
            const bTitle = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
            return bTitle - aTitle;
        });
        
        displayResults(results, query);
    }
    
    // Display search results
    function displayResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No posts found matching your search.</div>';
            searchSummary.textContent = '';
            return;
        }
        
        // Update summary
        const plural = results.length === 1 ? 'post' : 'posts';
        searchSummary.textContent = `Found ${results.length} ${plural} for "${query}"`;
        
        // Generate results HTML
        const resultsHTML = results.map(post => {
            const title = highlightText(post.title, query);
            const summary = highlightText(post.summary || post.content.substring(0, 200) + '...', query);
            const date = formatDate(post.date);
            
            return `
                <div class="search-result">
                    <h3><a href="${post.permalink}">${title}</a></h3>
                    <p>${summary}</p>
                    <div class="date">${date}</div>
                </div>
            `;
        }).join('');
        
        searchResults.innerHTML = resultsHTML;
    }
    
    // Debounce function to limit search frequency
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Initialize search
    function initSearch() {
        if (!searchInput) return;
        
        // Load search index
        loadSearchIndex();
        
        // Check for query parameter on page load
        const initialQuery = getUrlParameter('q');
        if (initialQuery) {
            searchInput.value = initialQuery;
            performSearch(initialQuery);
        }
        
        // Add search event listener with debouncing
        const debouncedSearch = debounce((query) => {
            performSearch(query);
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim());
        });
        
        // Handle enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(e.target.value.trim());
            }
        });
        
        // Focus on search input when page loads
        searchInput.focus();
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearch);
    } else {
        initSearch();
    }
})();