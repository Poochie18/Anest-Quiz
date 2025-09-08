/* Shared UI helpers: breadcrumbs and back button */
window.uiHelpers = (function () {
    function renderBreadcrumbs(containerId, crumbs) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const list = crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return `<li class="breadcrumb-item ${isLast ? 'active' : ''}" ${isLast ? 'aria-current="page"' : ''}>${isLast ? c.label : `<a href="${c.href}">${c.label}</a>`}</li>`;
        }).join('');
        container.innerHTML = `<nav aria-label="breadcrumb"><ol class="breadcrumb">${list}</ol></nav>`;
    }

    function renderBack(containerId, href, label) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `<button type="button" class="btn btn-primary shadow-sm back-btn" onclick="window.history.back()"><i class="fa fa-arrow-left me-2"></i>${label || 'Назад'}</button>`;
    }

    return { renderBreadcrumbs, renderBack };
})();


