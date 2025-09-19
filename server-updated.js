const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
// QUIET: set process.env.QUIET to 'false' to enable logs in development
const QUIET = (process.env.QUIET === undefined) ? true : (String(process.env.QUIET).toLowerCase() !== 'false');

// Middleware для загрузки переменных окружения
require('dotenv').config();

// Serve static files
app.use(express.static(__dirname));

// Endpoint для получения Firebase конфигурации (безопасно для клиента)
app.get('/api/firebase-config', (req, res) => {
    // Эти переменные безопасно передавать клиенту
    // API Key в Firebase не является секретным - он предназначен для клиентской стороны
    const config = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };
    
    // Проверяем, что все необходимые переменные заданы
    const missingVars = Object.entries(config)
        .filter(([key, value]) => !value && key !== 'measurementId') // measurementId опционален
        .map(([key]) => key);
    
    if (missingVars.length > 0) {
        console.error('Отсутствуют переменные окружения Firebase:', missingVars);
        return res.status(500).json({ 
            error: 'Firebase configuration incomplete',
            missing: missingVars 
        });
    }
    
    res.json(config);
});

// Routes for different pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/themes', (req, res) => {
    res.sendFile(path.join(__dirname, 'themes.html'));
});

app.get('/exam', (req, res) => {
    res.sendFile(path.join(__dirname, 'exam.html'));
});

// Обновленный роут для поиска (вместо статистики)
app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, 'search.html'));
});

// Поддержка старых ссылок на stats (редирект)
app.get('/stats', (req, res) => {
    res.redirect('/search');
});

app.get('/quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'quiz.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    if (!QUIET) {
        console.log(`Anest Quiz server is running on http://localhost:${port}`);
        console.log(`Main app: http://localhost:${port}`);
        console.log(`Search page: http://localhost:${port}/search`);
    }
    // Check Firebase env and warn only when not in QUIET mode (but always use console.error for missing critical vars)
    if (!process.env.FIREBASE_API_KEY) {
        console.error('Missing Firebase environment variables');
        if (!QUIET) console.warn('⚠️  Firebase configuration not found. Provide a .env file');
    } else {
        if (!QUIET) console.log('✅ Firebase configuration loaded from environment');
    }
});

module.exports = app;