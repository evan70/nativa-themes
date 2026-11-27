/*
 * ohniva.js > the pre-body shiv IE6 needs.
 *
 * The kernel writes an HTML5 document and a theme cannot wrap <html> in a
 * conditional comment, so the element names are created here, before the
 * parser reaches the body. IE6 is identified by the three capabilities it
 * lacks; the class lets the stylesheet apply GIF mattes and fixed widths
 * without a selector hack.
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
})();
