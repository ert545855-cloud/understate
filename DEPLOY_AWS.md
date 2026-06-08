# UNDERSTATE — AWS Elastic Beanstalk + Supabase Deploy Rehberi

## Mimari

```
Kullanıcı
   │
   ▼
AWS Elastic Beanstalk (Node.js 20, EC2)
   │  server/main.js  → Express + Socket.IO
   │
   ▼
Supabase PostgreSQL (veritabanı)
```

---

## 1. Supabase Kurulumu

### Veritabanı şemasını uygula
Supabase Dashboard → SQL Editor → Aşağıdaki dosyayı sırayla çalıştır:

```
server/migrations/schema.sql   ← TEK KANONİK ŞEMA (bunu kullan)
```

> ⚠️ `sql/` veya `supabase/` klasöründeki diğer SQL dosyaları eski sürümlerdir.
> Sadece `server/migrations/schema.sql` kullan.

### Supabase bağlantı bilgileri
Supabase Dashboard → Project Settings → Database:
- **Connection string** (Transaction mode, port 6543): `DATABASE_URL` olarak kullan
- **Project URL**: `SUPABASE_URL`
- **service_role key**: `SUPABASE_SERVICE_KEY`

---

## 2. AWS Elastic Beanstalk Kurulumu

### Gereksinimler
- Node.js 20 platform
- Application Load Balancer (ALB)
- WebSocket için idle timeout: 300 saniye

### Deploy
```bash
# EB CLI ile
eb init understate --platform "Node.js 20" --region eu-central-1
eb create understate-prod --elb-type application
eb deploy
```

Veya ZIP ile:
```bash
zip -r understate.zip . -x "*.git*" "node_modules/*" "android/*"
# EB Console → Upload and Deploy
```

### Environment Variables (EB Console → Configuration → Software)

| Key | Değer |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `DATABASE_URL` | Supabase connection string (port 6543) |
| `SUPABASE_URL` | https://xxx.supabase.co |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `JWT_SECRET` | Güçlü rastgele string (min 64 karakter) |
| `PUBLIC_URL` | https://understate.elasticbeanstalk.com |
| `BREVO_API_KEY` | Brevo API key (e-posta için) |
| `VAPID_PUBLIC_KEY` | Web push public key |
| `VAPID_PRIVATE_KEY` | Web push private key |
| `ADMIN_USERS` | admin kullanıcı adları (virgülle) |
| `BETA_MODE` | `false` |
| `ALLOWED_ORIGINS` | `*` veya özel domain |

---

## 3. .ebextensions Açıklaması

| Dosya | Görev |
|-------|-------|
| `nodecommand.config` | Node 20, PORT=8080, NODE_ENV=production |
| `websocket.config` | ALB, 300s timeout, InstancePort=8080 |
| `rds.config` | Env var şablonu (RDS oluşturmaz — Supabase kullanılır) |
| `db-migrate.config` | Deploy sırasında migration scripti çalıştırır |

---

## 4. VAPID Key Üretme (Push Bildirimleri)

```bash
npx web-push generate-vapid-keys
```

Çıktıdaki `publicKey` → `VAPID_PUBLIC_KEY`
Çıktıdaki `privateKey` → `VAPID_PRIVATE_KEY`

---

## 5. Kontrol Listesi

- [ ] Supabase projesinde `server/migrations/schema.sql` uygulandı
- [ ] EB environment variables ayarlandı
- [ ] `PUBLIC_URL` doğru domain'e işaret ediyor
- [ ] WebSocket bağlantısı çalışıyor (health: /health)
- [ ] E-posta gönderimi test edildi (Brevo)
