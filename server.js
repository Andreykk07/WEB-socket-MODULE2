const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Створюємо HTTP-сервер
const httpServer = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else if (req.method === 'GET' && req.url.startsWith('/disconnect')) {
        const parsedUrl = url.parse(req.url, true);
        const id = parsedUrl.query.id;
        const ws = clients.get(id);
        if (ws) {
            ws.close();
            clients.delete(id);
            console.log('Клієнт відключений через HTTP');
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Disconnected');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// WebSocket сервер на основі HTTP-сервера
const wss = new WebSocket.Server({ server: httpServer });
const clients = new Map(); // id -> ws

// Функція для розсилки повідомлень усім клієнтам
function broadcast(data) {
    for (let client of clients.values()) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }
}

wss.on('connection', (ws) => {
    // Призначаємо унікальний ID
    const id = Date.now() + Math.random();
    clients.set(id, ws);
    console.log('Нове з’єднання встановлено, ID:', id);

    // Надсилаємо ID клієнту
    ws.send(JSON.stringify({ type: 'id', id: id }));

    // ЗАВДАННЯ 1: Сповіщення про приєднання нового користувача
    broadcast({ type: 'system', text: '🟢 Новий користувач приєднався до чату' });

    ws.on('message', (messageBuffer) => {
        // Перетворюємо буфер у рядок (важливо для нових версій ws)
        const messageText = messageBuffer.toString();
        console.log('Отримано:', messageText);

        // Розсилаємо звичайне повідомлення
        broadcast({ type: 'message', text: messageText });
    });

    // ЗАВДАННЯ 3: Обробка помилок
    ws.on('error', (err) => {
        console.error('Помилка WebSocket з’єднання:', err);
    });

    ws.on('close', () => {
        clients.delete(id);
        console.log('Клієнт від’єднався, ID:', id);
        
        // ЗАВДАННЯ 1: Сповіщення про вихід користувача
        broadcast({ type: 'system', text: '🔴 Користувач залишив чат' });
    });
});

// Запускаємо сервер на порту 3000
httpServer.listen(3000, () => {
    console.log('Сервер запущений на http://localhost:3000');
});