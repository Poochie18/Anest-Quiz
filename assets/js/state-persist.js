// Small client-side persistence for quiz progress
// Saves selected answers and basic params to localStorage so users can resume later.
(function () {
    const STORAGE_PREFIX = 'quiz_progress_v1::';

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }
    function safeRemove(key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }

    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            mode: params.get('mode'),
            from: params.get('from'),
            themeId: params.get('themeId'),
            count: params.get('count')
        };
    }

    function storageKey() {
        // include path and params so different quizzes don't clobber each other
        const p = getUrlParams();
        const base = window.location.pathname || 'quiz';
        return STORAGE_PREFIX + base + '::' + JSON.stringify(p);
    }

    function collectAnswersSnapshot() {
        if (!window.currentQuiz || !Array.isArray(window.currentQuiz)) return null;
        const snapshot = {
            timestamp: new Date().toISOString(),
            params: getUrlParams(),
            items: []
        };
        window.currentQuiz.forEach((q, idx) => {
            const name = `q${q.id}`;
            const inputs = document.querySelectorAll(`input[name="${name}"]:checked`);
            const selected = Array.from(inputs).map(i => i.value);
            snapshot.items.push({ questionId: q.id, index: idx, selected });
        });
        return snapshot;
    }

    function saveState() {
        const snap = collectAnswersSnapshot();
        if (!snap) return;
        safeSet(storageKey(), JSON.stringify(snap));
        // also write a compact last-mod timestamp
        safeSet(storageKey() + '::ts', snap.timestamp);
    }

    function clearState() {
        safeRemove(storageKey());
        safeRemove(storageKey() + '::ts');
    }

    function restoreState() {
        const raw = safeGet(storageKey());
        if (!raw) return false;
        let snap;
        try { snap = JSON.parse(raw); } catch (e) { return false; }
        // basic param check: only restore when params match
        const currentParams = getUrlParams();
        if (JSON.stringify(currentParams) !== JSON.stringify(snap.params)) return false;

        // We will re-apply selections and trigger submitSingleQuestion for answered items
        if (!window.currentQuiz || !Array.isArray(window.currentQuiz)) return false;

        // Map by questionId for quick lookup
        const byQ = {};
        snap.items.forEach(item => { byQ[item.questionId] = item.selected || []; });

        // Apply selections
        window.currentQuiz.forEach((q, idx) => {
            const selected = byQ[q.id] || [];
            const name = `q${q.id}`;
            // clear first
            const inputs = document.querySelectorAll(`input[name="${name}"]`);
            inputs.forEach(i => { i.checked = false; i.disabled = false; });
            selected.forEach(val => {
                const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
                if (el) el.checked = true;
            });
        });

        // Trigger submitSingleQuestion on those that have selections
        // Delay slightly to ensure other init handlers finished
        setTimeout(() => {
            window.currentQuiz.forEach((q, idx) => {
                const name = `q${q.id}`;
                const inputs = document.querySelectorAll(`input[name="${name}"]:checked`);
                if (inputs && inputs.length > 0 && typeof window.submitSingleQuestion === 'function') {
                    try { window.submitSingleQuestion(idx, q.id); } catch (e) { /* ignore */ }
                }
            });
            // update progress UI once
            try { if (typeof window.updateProgress === 'function') window.updateProgress(); } catch (e) {}
        }, 50);

        return true;
    }

    function wrapSubmit() {
        if (typeof window.submitSingleQuestion !== 'function') return;
        const orig = window.submitSingleQuestion;
        if (orig._wrapped_by_state_persist) return;
        const wrapped = function (index, questionId) {
            const result = orig.apply(this, arguments);
            try { saveState(); } catch (e) {}
            return result;
        };
        wrapped._wrapped_by_state_persist = true;
        window.submitSingleQuestion = wrapped;
    }

    // Debounced helper
    function debounce(fn, wait) {
        let t = null;
        return function () {
            const args = arguments;
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    // Save when user changes inputs (so refresh preserves selections even before clicking submit)
    function attachInputListeners() {
        // Use event delegation on document to catch dynamically created inputs
        const handler = debounce(() => {
            try { saveState(); } catch (e) {}
        }, 200);
        document.addEventListener('change', (ev) => {
            const target = ev.target;
            if (!target) return;
            if (target.matches && target.matches('input[name^="q"]')) {
                handler();
            }
        }, { capture: false });
    }

    // Hook save on visibility change, pagehide and beforeunload
    function attachAutoSave() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') saveState();
        });
        window.addEventListener('pagehide', () => saveState());
        window.addEventListener('beforeunload', () => saveState());
    }

    // Public small API (exposed for debugging/tests)
    window.quizStatePersist = {
        save: saveState,
        restore: restoreState,
        clear: clearState
    };

    // Try to initialize after DOM ready. Many quiz globals are created by inline script,
    // so we attempt to wrap and restore shortly after load.
    function init() {
        wrapSubmit();
        attachAutoSave();
        attachInputListeners();
        // attempt to restore. If init() of quiz hasn't yet created currentQuiz, retry once later
        const restored = restoreState();
        if (!restored) {
            // retry after small delay in case quiz.init runs later
            setTimeout(() => {
                wrapSubmit();
                restoreState();
            }, 200);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
