const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();

// CORS ayarları
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════
// STATIC DOSYA SERVİSİ - KRİTİK DÜZELTME
// ═══════════════════════════════════════════════════════

// 1. Public klasörü (React, Socket.io vb. kütüphaneler)
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// 2. CSS klasörü
app.use('/css', express.static(path.join(__dirname, 'css'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// 3. JS klasörü
app.use('/js', express.static(path.join(__dirname, 'js'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// 4. SRC klasörü (app.js ve diğer uygulama dosyaları)
app.use('/src', express.static(path.join(__dirname, 'src'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// 5. Assets klasörü (ikonlar, görseller vb.)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 6. Kök dizindeki static dosyalar (favicon, manifest vb.)
app.use(express.static(__dirname, {
  index: false, // Ana route'u kendimiz kontrol edeceğiz
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.ico') || filePath.endsWith('.jpg') || filePath.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// ⚠️ PORT yapılandırması - Render için
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ═══════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API routes (eğer varsa)
app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ═══════════════════════════════════════════════════════
// SOCKET.IO BAĞLANTILAR
// ═══════════════════════════════════════════════════════

io.on('connection', (socket) => {
  console.log('✓ Kullanıcı bağlandı:', socket.id);
  
  // Oyun eventleri buraya eklenebilir
  socket.on('game:action', (data) => {
    console.log('Game action:', data);
    // Oyun mantığı...
  });
  
  socket.on('disconnect', () => {
    console.log('✗ Kullanıcı ayrıldı:', socket.id);
  });
});

// ═══════════════════════════════════════════════════════
// ANA ROUTE - EN SONA KONMALI (Catch-all)
// ═══════════════════════════════════════════════════════

// Tüm diğer route'lar için index.html döndür (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ═══════════════════════════════════════════════════════
// SERVER BAŞLATMA
// ═══════════════════════════════════════════════════════

server.listen(PORT, HOST, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`🚀 UNDERSTATE Server Başlatıldı`);
  console.log(`📍 Adres: http://${HOST}:${PORT}`);
  console.log(`🌍 Ortam: ${process.env.NODE_ENV || 'development'}`);
  console.log('═══════════════════════════════════════════════════');
});

// Hata yakalama
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
