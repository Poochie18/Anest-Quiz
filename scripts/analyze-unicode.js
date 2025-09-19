// Скрипт для анализа Unicode символов в JSON файлах
const fs = require('fs');
// QUIET: set environment variable QUIET=false to enable console output when running this script
const QUIET = (process.env.QUIET === undefined) ? true : (String(process.env.QUIET).toLowerCase() !== 'false');

function analyzeUnicodeChars(text, charToAnalyze = 'і') {
    const results = [];
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === charToAnalyze || char.toLowerCase() === charToAnalyze.toLowerCase()) {
            const codePoint = char.codePointAt(0);
            const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
            const unicode = `U+${hex}`;
            
            results.push({
                char: char,
                codePoint: codePoint,
                unicode: unicode,
                position: i,
                context: text.substring(Math.max(0, i-10), i+10)
            });
        }
    }
    
    return results;
}

function analyzeFile(fileName) {
    try {
        if (!QUIET) console.log(`\nАнализ файла: ${fileName}`);
        if (!QUIET) console.log('='.repeat(50));
        
        const content = fs.readFileSync(fileName, 'utf8');
        const results = analyzeUnicodeChars(content, 'і');
        
        if (results.length === 0) {
            if (!QUIET) console.log('Символ "і" не найден в файле');
            return;
        }
        
        // Группируем по Unicode кодам
        const groupedResults = {};
        results.forEach(result => {
            if (!groupedResults[result.unicode]) {
                groupedResults[result.unicode] = [];
            }
            groupedResults[result.unicode].push(result);
        });
        
    if (!QUIET) console.log(`Найдено ${results.length} вхождений символа "і"`);
    if (!QUIET) console.log('\nГруппировка по Unicode кодам:');
        
        Object.keys(groupedResults).forEach(unicode => {
            const group = groupedResults[unicode];
            if (!QUIET) console.log(`\n${unicode} (встречается ${group.length} раз):`);
            if (!QUIET) console.log(`  Символ: "${group[0].char}"`);
            if (!QUIET) console.log(`  Decimal: ${group[0].codePoint}`);
            
            // Показываем несколько примеров контекста
            const exampleCount = Math.min(3, group.length);
            if (!QUIET) console.log(`  Примеры контекста (${exampleCount} из ${group.length}):`);
            for (let i = 0; i < exampleCount; i++) {
                if (!QUIET) console.log(`    "${group[i].context}"`);
            }
        });
        
    } catch (error) {
        console.error(`Ошибка при анализе файла ${fileName}:`, error.message);
    }
}

// Анализируем основные файлы
analyzeFile('../Quest3.json');

// Также проверим, какие символы могут вводиться с клавиатуры
if (!QUIET) console.log('\n\nВозможные варианты символа "і" с клавиатуры:');
if (!QUIET) console.log('='.repeat(50));

const possibleVariants = [
    { char: 'і', name: 'CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I', code: 0x0456 },
    { char: 'i', name: 'LATIN SMALL LETTER I', code: 0x0069 },
    { char: 'ì', name: 'LATIN SMALL LETTER I WITH GRAVE', code: 0x00EC },
    { char: 'í', name: 'LATIN SMALL LETTER I WITH ACUTE', code: 0x00ED },
    { char: 'î', name: 'LATIN SMALL LETTER I WITH CIRCUMFLEX', code: 0x00EE },
    { char: 'ï', name: 'LATIN SMALL LETTER I WITH DIAERESIS', code: 0x00EF },
    { char: 'ĩ', name: 'LATIN SMALL LETTER I WITH TILDE', code: 0x0129 },
    { char: 'ī', name: 'LATIN SMALL LETTER I WITH MACRON', code: 0x012B },
    { char: 'ĭ', name: 'LATIN SMALL LETTER I WITH BREVE', code: 0x012D },
    { char: 'į', name: 'LATIN SMALL LETTER I WITH OGONEK', code: 0x012F },
    { char: 'ı', name: 'LATIN SMALL LETTER DOTLESS I', code: 0x0131 }
];

possibleVariants.forEach(variant => {
    const hex = variant.code.toString(16).toUpperCase().padStart(4, '0');
    if (!QUIET) console.log(`"${variant.char}" - U+${hex} (${variant.code}) - ${variant.name}`);
});

if (!QUIET) console.log('\nРекомендация: Нормализовать все варианты к U+0456 (кириллический "і")');