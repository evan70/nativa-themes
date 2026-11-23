(function() {
    try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        document.documentElement.classList.add('mo-js');
    } catch (e) {}
})();
