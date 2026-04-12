(function bootstrapWebviewShell() {
    const viewType = window.viewType || 'sidebar';
    document.documentElement.setAttribute('data-view-type', viewType);
    document.body?.setAttribute('data-view-type', viewType);
})();
