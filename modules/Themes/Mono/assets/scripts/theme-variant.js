(function() {
    try {
        var variant = localStorage.getItem('nativa-variant');
        if ('ember' === variant || 'glacier' === variant) {
            document.documentElement.setAttribute('data-variant', variant);
        }
    } catch (e) {}
})();
