/*
 * ohniva.js > the pre-body shiv IE6 needs, and the backdrop rotation.
 *
 * The kernel writes an HTML5 document and a theme cannot wrap <html> in a
 * conditional comment, so the element names are created here, before the
 * parser reaches the body. IE6 is identified by the three capabilities it
 * lacks; the class lets the IE6 stylesheet apply its rules and lets a modern
 * browser match nothing from it.
 *
 * The rotation is classic DOM script on purpose: no bundle, no dependency and
 * no work at all when the reader asked for less motion. The first slide is
 * marked active in the markup, so a document without JavaScript still has a
 * backdrop.
 */
(function () {
    var d = document;
    var tags = ['main', 'header', 'footer', 'nav', 'section', 'article', 'aside'];
    var i;

    for (i = 0; i < tags.length; i++) {
        d.createElement(tags[i]);
    }

    if (d.all && !window.XMLHttpRequest && !d.querySelector) {
        d.documentElement.className += ' oh-ie6';
    }

    function slides() {
        var found = [];
        var all;
        var n;

        if (d.querySelectorAll) {
            all = d.querySelectorAll('.oh-slide');

            for (n = 0; n < all.length; n++) {
                found.push(all[n]);
            }

            return found;
        }

        all = d.getElementsByTagName('img');

        for (n = 0; n < all.length; n++) {
            if ((' ' + all[n].className + ' ').indexOf(' oh-slide ') !== -1) {
                found.push(all[n]);
            }
        }

        return found;
    }

    function start() {
        var list = slides();
        var current = 0;
        var tick;

        if (list.length < 2) {
            return;
        }

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        tick = function () {
            list[current].className = list[current].className.replace(' oh-slide--active', '');
            current = (current + 1) % list.length;
            list[current].className += ' oh-slide--active';
        };

        window.setInterval(tick, 6000);
    }

    if (window.addEventListener) {
        window.addEventListener('load', start, false);
    } else if (window.attachEvent) {
        window.attachEvent('onload', start);
    }
})();
