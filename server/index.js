require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = require('../server.js'); // mevcut server.js'i kullan

// Eğer server.js zaten listen ediyorsa bu dosyaya gerek yok
// package.json'da start scriptini değiştir:
// "start": "node server.js"
