// Runs in <head> — sets data-theme before CSS renders to prevent flash
(function () {
    try {
        var t = localStorage.getItem('makena-theme');
        if (t === 'dark' || t === 'light') {
            document.documentElement.setAttribute('data-theme', t);
        }
    } catch (e) {}
}());
