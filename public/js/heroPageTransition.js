(function () {
    const storageKey = 'hero-page-transition';
    const transitionPaths = new Set(['/findGig', '/postPitch']);
    const currentPath = window.location.pathname;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function shouldTrackPath(pathname) {
        return transitionPaths.has(pathname);
    }

    function supportsSharedViewTransition() {
        return typeof document.startViewTransition === 'function'
            && typeof CSS !== 'undefined'
            && typeof CSS.supports === 'function'
            && CSS.supports('view-transition-name: hero-card-shared');
    }

    document.addEventListener('click', function (event) {
        if (event.defaultPrevented || event.button !== 0) {
            return;
        }

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const link = event.target.closest('a[href]');

        if (!link || link.target === '_blank' || link.hasAttribute('download')) {
            return;
        }

        const nextUrl = new URL(link.href, window.location.href);

        if (nextUrl.origin !== window.location.origin) {
            return;
        }

        if (!shouldTrackPath(currentPath) || !shouldTrackPath(nextUrl.pathname) || currentPath === nextUrl.pathname) {
            return;
        }

        sessionStorage.setItem(storageKey, JSON.stringify({
            from: currentPath,
            to: nextUrl.pathname,
            at: Date.now()
        }));
    }, true);

    if (prefersReducedMotion) {
        sessionStorage.removeItem(storageKey);
        return;
    }

    const rawTransition = sessionStorage.getItem(storageKey);

    if (!rawTransition) {
        return;
    }

    sessionStorage.removeItem(storageKey);

    let transition;

    try {
        transition = JSON.parse(rawTransition);
    } catch (error) {
        return;
    }

    const isFreshTransition = Date.now() - transition.at < 4000;

    if (!isFreshTransition || transition.to !== currentPath || supportsSharedViewTransition()) {
        return;
    }

    window.requestAnimationFrame(function () {
        document.body.classList.add('hero-transition-fallback-active');
    });
})();
