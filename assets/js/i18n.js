/* Simple i18n module with UA default and EN alternative */
(function (global) {
    const DEFAULT_LANG = 'uk';

    const dictionaries = {
        uk: {
            app_title: 'Освітня платформа тестів',
            menu_themes: 'Тематичні тести',
            menu_exam: 'Екзамен',
            menu_stats: 'Статистика',
            menu_themes_desc: 'Перевірте знання за конкретними темами',
            menu_exam_desc: 'Пройдіть повний тест на знання',
            menu_stats_desc: 'Перегляд результатів і прогресу',

            select_theme_placeholder: 'Оберіть тему',
            start: 'Почати',
            exam: 'Екзамен',
            questions_word: 'питань',
            theme_prefix: 'Тема',
            exam_prefix: 'Екзамен',
            all_questions: 'Усі питання',
            random_n_questions: 'Випадкові {count} питань',

            stats_title: 'Статистика',
            last_attempt: 'Остання спроба',
            never: 'Ніколи',
            correct: 'Вірно',
            incorrect: 'Невірно',
            result: 'Результат',
            answers: 'Відповіді',
            your_answer: 'Ваш відповідь',
            help: 'Підказка',
            quiz_results: 'Результати тесту',
            total_score: 'Підсумок',
            score_by_theme: 'За темами',
            detailed_results: 'Детальні результати',
            submit_quiz: 'Завершити тест',
            back_to_menu: 'Назад до меню',
            up: 'Вгору',
            down: 'Вниз',

            question_word: 'Питання',
            submit_answer: 'Відповісти',
            progress_text: '{answered} з {total}',
            progress_text_full: '{answered} з {total} питань відповіли',
            some_unanswered_confirm: 'Деякі питання без відповіді. Завершити тест?',
            no_questions_available: 'Немає доступних питань для цього тесту.',
            please_select_theme: 'Будь ласка, оберіть тему',
            invalid_quiz_params: 'Невірні параметри тесту.',

            breadcrumbs_home: 'Головна',
            breadcrumbs_themes: 'Тематичні тести',
            breadcrumbs_random: 'Випадкові тести',
            breadcrumbs_stats: 'Статистика',
            breadcrumbs_quiz: 'Тест',
            back: 'Назад'
        },
        en: {
            app_title: 'Educational Quiz Platform',
            menu_themes: 'Thematic quizzes',
            menu_exam: 'Exam',
            menu_stats: 'Statistics',
            menu_themes_desc: 'Check your knowledge by specific topics',
            menu_exam_desc: 'Take a full knowledge test',
            menu_stats_desc: 'View results and progress',

            select_theme_placeholder: 'Select a theme',
            start: 'Start',
            exam: 'Exam',
            questions_word: 'questions',
            theme_prefix: 'Theme',
            exam_prefix: 'Exam',
            all_questions: 'All Questions',
            random_n_questions: 'Random {count} Questions',

            stats_title: 'Statistics',
            last_attempt: 'Last attempt',
            never: 'Never',
            correct: 'Correct',
            incorrect: 'Incorrect',
            result: 'Result',
            answers: 'Answers',
            your_answer: 'Your Answer',
            help: 'Help',
            quiz_results: 'Quiz Results',
            total_score: 'Total',
            score_by_theme: 'Score by Theme',
            detailed_results: 'Detailed Results',
            submit_quiz: 'Finish Quiz',
            back_to_menu: 'Back to Menu',
            up: 'Up',
            down: 'Down',

            question_word: 'Question',
            submit_answer: 'Submit Answer',
            progress_text: '{answered} of {total}',
            progress_text_full: '{answered} of {total} questions answered',
            some_unanswered_confirm: 'Some questions are not answered yet. Submit anyway?',
            no_questions_available: 'No questions available for this quiz.',
            please_select_theme: 'Please select a theme',
            invalid_quiz_params: 'Invalid quiz parameters.',

            breadcrumbs_home: 'Home',
            breadcrumbs_themes: 'Thematic tests',
            breadcrumbs_random: 'Random tests',
            breadcrumbs_stats: 'Statistics',
            breadcrumbs_quiz: 'Quiz',
            back: 'Back'
        }
    };

    function getLang() {
        try {
            return localStorage.getItem('lang') || DEFAULT_LANG;
        } catch (e) {
            return DEFAULT_LANG;
        }
    }

    function setLang(lang) {
        try { localStorage.setItem('lang', lang); } catch (e) {}
        applyTranslations();
        if (typeof document !== 'undefined') {
            const html = document.documentElement;
            if (html) html.setAttribute('lang', lang === 'uk' ? 'uk' : 'en');
        }
    }

    function format(template, params) {
        if (!params) return template;
        return template.replace(/\{(\w+)\}/g, (_, key) => params[key] != null ? String(params[key]) : '');
    }

    function t(key, params) {
        const lang = getLang();
        const dict = dictionaries[lang] || {};
        const enDict = dictionaries.en || {};
        const value = dict[key] != null ? dict[key] : (enDict[key] != null ? enDict[key] : key);
        return format(value, params);
    }

    function translateElement(el) {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        const attr = el.getAttribute('data-i18n-attr');
        const paramsJson = el.getAttribute('data-i18n-params');
        let params;
        try { params = paramsJson ? JSON.parse(paramsJson) : undefined; } catch (e) { params = undefined; }
        const value = t(key, params);
        if (attr) {
            el.setAttribute(attr, value);
        } else {
            el.textContent = value;
        }
    }

    function applyTranslations(root) {
        const scope = root || (typeof document !== 'undefined' ? document : null);
        if (!scope) return;
        const elements = scope.querySelectorAll('[data-i18n]');
        elements.forEach(translateElement);
    }

    function onReady(fn) {
        if (typeof document === 'undefined') return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    onReady(() => applyTranslations());

    global.i18n = { t, setLang, getLang, applyTranslations };
})(window);


