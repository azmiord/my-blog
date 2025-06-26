// Improved Infinite Scroll for Hugo Blog
(function() {
    let currentPage = 1;
    let isLoading = false;
    let hasMorePages = true;
    let scrollListener = null;
    
    // Get the base URL and current path
    const baseURL = window.location.origin;
    
    // Reset state when page changes
    function resetState() {
        currentPage = 1;
        isLoading = false;
        hasMorePages = true;
        
        // Remove existing scroll listener
        if (scrollListener) {
            window.removeEventListener('scroll', scrollListener);
            scrollListener = null;
        }
        
        // Remove any existing loader
        const existingLoader = document.getElementById('infinite-scroll-loader');
        if (existingLoader) {
            existingLoader.remove();
        }
    }
    
    // Parse current page number from URL
    function getCurrentPageFromURL() {
        const path = window.location.pathname;
        const pageMatch = path.match(/\/page\/(\d+)\//);
        return pageMatch ? parseInt(pageMatch[1]) : 1;
    }
    
    // Create loading indicator
    function createLoadingIndicator() {
        const loader = document.createElement('div');
        loader.id = 'infinite-scroll-loader';
        loader.innerHTML = `
            <div style="text-align: center; padding: 20px; opacity: 0.6;">
                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #ccc; border-top: 2px solid #333; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 10px; font-size: 14px;">Loading more posts...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        return loader;
    }
    
    // Load next page content
    async function loadNextPage() {
        if (isLoading || !hasMorePages) return;
        
        isLoading = true;
        currentPage++;
        
        // Show loading indicator
        const loader = createLoadingIndicator();
        const mainContent = document.querySelector('.main') || document.querySelector('main') || document.body;
        mainContent.appendChild(loader);
        
        try {
            // Construct next page URL
            const currentPath = window.location.pathname;
            let nextPageURL;
            
            if (currentPath === '/' || currentPath === '') {
                nextPageURL = `${baseURL}/page/${currentPage}/`;
            } else if (currentPath.includes('/page/')) {
                // Replace existing page number
                nextPageURL = currentPath.replace(/\/page\/\d+\//, `/page/${currentPage}/`);
                nextPageURL = `${baseURL}${nextPageURL}`;
            } else {
                nextPageURL = `${baseURL}${currentPath}page/${currentPage}/`;
            }
            
            const response = await fetch(nextPageURL);
            
            if (!response.ok) {
                hasMorePages = false;
                loader.remove();
                return;
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Find posts container - adjust selector based on your theme
            const newPosts = doc.querySelectorAll('.post-entry, article, .post, .h-entry');
            const postsContainer = document.querySelector('.main .post-entry, .main article, .main .post, .main .h-entry')?.parentElement 
                || document.querySelector('.main') 
                || document.querySelector('main')
                || document.querySelector('#content');
            
            if (newPosts.length === 0) {
                hasMorePages = false;
                loader.innerHTML = '<p style="text-align: center; padding: 20px; opacity: 0.6;">No more posts to load</p>';
                setTimeout(() => loader.remove(), 3000);
                return;
            }
            
            // Add new posts to the page
            newPosts.forEach(post => {
                const clonedPost = post.cloneNode(true);
                postsContainer.insertBefore(clonedPost, loader);
            });
            
            // Update URL without reloading page (but don't trigger popstate)
            const newURL = nextPageURL;
            window.history.replaceState({ infiniteScroll: true }, '', newURL);
            
        } catch (error) {
            console.error('Error loading next page:', error);
            hasMorePages = false;
            loader.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Error loading more posts</p>';
            setTimeout(() => loader.remove(), 3000);
        } finally {
            isLoading = false;
            // Remove loader after a short delay
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.remove();
                }
            }, 1000);
        }
    }
    
    // Check if user has scrolled to bottom
    function handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Trigger when user is 200px from bottom
        if (scrollTop + windowHeight >= documentHeight - 200) {
            loadNextPage();
        }
    }
    
    // Check if we should enable infinite scroll on current page
    function shouldEnableInfiniteScroll() {
        const path = window.location.pathname;
        const isHomePage = path === '/' || path === '';
        const isPostsPage = path.includes('/posts') || path.includes('/page/');
        const isTagPage = path.includes('/tags/');
        const isCategoryPage = path.includes('/categories/');
        
        return isHomePage || isPostsPage || isTagPage || isCategoryPage;
    }
    
    // Initialize infinite scroll
    function initInfiniteScroll() {
        // Reset previous state
        resetState();
        
        // Set current page based on URL
        currentPage = getCurrentPageFromURL();
        
        if (shouldEnableInfiniteScroll()) {
            // Hide existing pagination
            const pagination = document.querySelector('.pagination, .paginator, .pager, .page-nav');
            if (pagination) {
                pagination.style.display = 'none';
            }
            
            // Create and add scroll event listener
            scrollListener = handleScroll;
            window.addEventListener('scroll', scrollListener, { passive: true });
            
            // Also check on page load in case content doesn't fill screen
            setTimeout(handleScroll, 1000);
            
            console.log('Infinite scroll initialized for page:', window.location.pathname);
        }
    }
    
    // Handle browser back/forward buttons
    function handlePopState(event) {
        // Only reinitialize if this wasn't triggered by our infinite scroll
        if (!event.state || !event.state.infiniteScroll) {
            setTimeout(initInfiniteScroll, 100);
        }
    }
    
    // Handle page visibility changes (when user returns to tab)
    function handleVisibilityChange() {
        if (!document.hidden) {
            // Re-initialize when page becomes visible again
            setTimeout(initInfiniteScroll, 100);
        }
    }
    
    // Wait for DOM to be ready
    function initialize() {
        initInfiniteScroll();
        
        // Listen for browser navigation
        window.addEventListener('popstate', handlePopState);
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Listen for hash changes (in case of client-side routing)
        window.addEventListener('hashchange', () => {
            setTimeout(initInfiniteScroll, 100);
        });
        
        // Re-initialize periodically to handle any missed events
        setInterval(() => {
            if (shouldEnableInfiniteScroll() && !scrollListener) {
                console.log('Re-initializing infinite scroll...');
                initInfiniteScroll();
            }
        }, 5000);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Also initialize on window load as a fallback
    window.addEventListener('load', () => {
        setTimeout(initInfiniteScroll, 500);
    });
})();