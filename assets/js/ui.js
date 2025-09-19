/* Shared UI helpers: breadcrumbs and back button */
window.uiHelpers = (function () {
    function renderBreadcrumbs(containerId, crumbs) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const list = crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            const label = (window.i18n && c.i18nKey) ? i18n.t(c.i18nKey) : c.label;
            return `<li class="breadcrumb-item ${isLast ? 'active' : ''}" ${isLast ? 'aria-current="page"' : ''}>${isLast ? label : `<a href="${c.href}" data-clear-quiz="1">${label}</a>`}</li>`;
        }).join('');
        container.innerHTML = `<nav aria-label="breadcrumb"><ol class="breadcrumb">${list}</ol></nav>`;

        // delegate clicks on breadcrumb links to clear quiz snapshots before navigating
        container.addEventListener('click', function (ev) {
            const a = ev.target.closest && ev.target.closest('a[data-clear-quiz]');
            if (a) {
                try { clearAllQuizSnapshots(); } catch (e) { /* ignore */ }
                // allow navigation to proceed
            }
        });
    }

    // Clear all quiz-related snapshot keys from localStorage.
    // Removes param-based snapshots, theme storage and random exam storage.
    function clearAllQuizSnapshots() {
        try {
            // Iterate via localStorage.key(i) to be robust across environments
            for (let i = (localStorage && localStorage.length) ? localStorage.length - 1 : -1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (!k) continue;
                if (k.indexOf('quiz_snapshot::') === 0) {
                    console.info('[uiHelpers] clearing param-based snapshot key=', k);
                    try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
                    continue;
                }
                if (k.indexOf('quiz_theme_v1::') === 0) {
                    console.info('[uiHelpers] clearing quiz_theme key=', k);
                    try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
                    continue;
                }
                if (k.indexOf('quiz_random_v2::') === 0 || k.indexOf('quiz_random_v1::') === 0) {
                    console.info('[uiHelpers] clearing quiz_random key=', k);
                    try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
                    continue;
                }
            }
        } catch (e) {
            console.debug('[uiHelpers] clearAllQuizSnapshots failed', e);
        }
        // Prevent auto-save from immediately recreating the keys (pagehide/beforeunload)
        try {
            window.__quizStatePersistSuppress = true;
            // Clear suppression shortly after navigation (2s) in case navigation is canceled
            setTimeout(function () { try { window.__quizStatePersistSuppress = false; } catch (e) {} }, 2000);
        } catch (e) { /* ignore */ }
    }

    function renderBack(containerId, href, label) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const backLabel = label || (window.i18n ? i18n.t('back') : 'Назад');
        // Call clearAllQuizSnapshots before navigating back so snapshots are removed
        container.innerHTML = `<button type="button" class="btn btn-primary shadow-sm back-btn" onclick="(function(){ try{ window.uiHelpers && window.uiHelpers._clearAllQuizSnapshots && window.uiHelpers._clearAllQuizSnapshots(); }catch(e){}; window.history.back(); })()"><i class="fa fa-arrow-left me-2 d-none d-sm-inline"></i><span class="d-none d-sm-inline">${backLabel}</span><i class="fa fa-arrow-left d-sm-none"></i></button>`;
        // expose internal helper so the inline onclick can call it safely
        window.uiHelpers = window.uiHelpers || {};
        window.uiHelpers._clearAllQuizSnapshots = clearAllQuizSnapshots;
    }

    // Also expose the clear helper globally even if renderBack is not invoked
    // so inline onclicks on other pages (home menu cards, start buttons) can call it.
    try {
        window.uiHelpers = window.uiHelpers || {};
        window.uiHelpers._clearAllQuizSnapshots = clearAllQuizSnapshots;
    } catch (e) { /* ignore */ }

    return { renderBreadcrumbs, renderBack };
})();

// Note: avoid clearing snapshots on beforeunload to not remove keys on page refresh.


