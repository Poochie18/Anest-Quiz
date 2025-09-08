/* Shared data loader and parsers */
window.quizData = (function () {
    let themes = [];
    let questions = [];
    let answers = [];

    function parseThemesJSON(json) {
        const parsedThemes = Array.isArray(json)
            ? json.map(item => ({ id: item._KodTema, name: item._Tema }))
            : (json.DATAPACKET && json.DATAPACKET.ROWDATA && Array.isArray(json.DATAPACKET.ROWDATA.ROW)
                ? json.DATAPACKET.ROWDATA.ROW.map(item => ({ id: item._KodTema, name: item._Tema }))
                : []);
        return parsedThemes;
    }

    function parseQuestionsJSON(json) {
        const parsedQuestions = Array.isArray(json)
            ? json.map(item => ({
                id: item._KodQuestion,
                theme_id: item._KodTema,
                text: item._Question,
                vesLo: parseInt(item._VesLo) || 0,
                vesSecond: parseInt(item._VesSecond) || 0,
                vesFirst: parseInt(item._VesFirst) || 0,
                vesHi: parseInt(item._VesHi) || 0,
                picture: item._Picture,
                help: item._Help
            }))
            : (json.DATAPACKET && json.DATAPACKET.ROWDATA && Array.isArray(json.DATAPACKET.ROWDATA.ROW)
                ? json.DATAPACKET.ROWDATA.ROW.map(item => ({
                    id: item._KodQuestion,
                    theme_id: item._KodTema,
                    text: item._Question,
                    vesLo: parseInt(item._VesLo) || 0,
                    vesSecond: parseInt(item._VesSecond) || 0,
                    vesFirst: parseInt(item._VesFirst) || 0,
                    vesHi: parseInt(item._VesHi) || 0,
                    picture: item._Picture,
                    help: item._Help
                }))
                : []);
        return parsedQuestions;
    }

    function parseAnswersJSON(json) {
        const parsedAnswers = Array.isArray(json)
            ? json.map(item => ({
                question_id: item._KodQuestion,
                num_answer: item._NumAnswer,
                text: item._Answer,
                weight: parseInt(item._VesAnswer) || 0
            }))
            : (json.DATAPACKET && json.DATAPACKET.ROWDATA && Array.isArray(json.DATAPACKET.ROWDATA.ROW)
                ? json.DATAPACKET.ROWDATA.ROW.map(item => ({
                    question_id: item._KodQuestion,
                    num_answer: item._NumAnswer,
                    text: item._Answer,
                    weight: parseInt(item._VesAnswer) || 0
                }))
                : []);
        return parsedAnswers;
    }

    async function load() {
        const [themesRes, questionsRes, answersRes] = await Promise.all([
            fetch('Tema3.json'),
            fetch('Quest3.json'),
            fetch('Answer3.json')
        ]);
        const themesJson = await themesRes.json();
        const questionsJson = await questionsRes.json();
        const answersJson = await answersRes.json();

        themes = parseThemesJSON(themesJson);
        questions = parseQuestionsJSON(questionsJson);
        answers = parseAnswersJSON(answersJson);

        return { themes, questions, answers };
    }

    function getData() {
        return { themes, questions, answers };
    }

    return { load, getData };
})();


