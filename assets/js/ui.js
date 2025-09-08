/* Shared UI helpers: breadcrumbs and back button */
window.uiHelpers = (function () {
    function renderBreadcrumbs(containerId, crumbs) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const list = crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            const label = (window.i18n && c.i18nKey) ? i18n.t(c.i18nKey) : c.label;
            return `<li class="breadcrumb-item ${isLast ? 'active' : ''}" ${isLast ? 'aria-current="page"' : ''}>${isLast ? label : `<a href="${c.href}">${label}</a>`}</li>`;
        }).join('');
        container.innerHTML = `<nav aria-label="breadcrumb"><ol class="breadcrumb">${list}</ol></nav>`;
    }

    function renderBack(containerId, href, label) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const backLabel = label || (window.i18n ? i18n.t('back') : 'Назад');
        container.innerHTML = `<button type="button" class="btn btn-primary shadow-sm back-btn" onclick="window.history.back()"><i class="fa fa-arrow-left me-2"></i>${backLabel}</button>`;
    }

    return { renderBreadcrumbs, renderBack };
})();


