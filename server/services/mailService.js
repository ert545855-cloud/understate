/**
 * UNDERSTATE Mail Servisi — Brevo Transactional Email API
 * Tek giriş noktası: tüm mail gönderimleri buradan geçer.
 */

const BREVO_URL  = 'https://api.brevo.com/v3/smtp/email';
const SENDER     = { name: 'UNDERSTATE', email: 'basemirhan28@gmail.com' };

async function _send({ to, toName, subject, html, type = 'general' }) {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.warn('[Mail] BREVO_API_KEY eksik — mail gönderilemiyor');
    return { ok: false, reason: 'API key eksik' };
  }
  if (!to) return { ok: false, reason: 'E-posta adresi yok' };

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ sender: SENDER, to: [{ email: to, name: toName || to }], subject, htmlContent: html }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`📧 [Mail] Gönderildi → ${to} [${type}]`);
      return { ok: true };
    }
    const reason = data.message || JSON.stringify(data);
    console.warn(`[Mail] Brevo hata (${res.status}): ${reason}`);
    return { ok: false, reason };
  } catch (e) {
    console.warn('[Mail] Fetch hatası:', e.message);
    return { ok: false, reason: e.message };
  }
}

// ── HTML şablonları ───────────────────────────────────────────────────────────

function _layout(content) {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<style>
body{margin:0;background:#050505;font-family:'Segoe UI',Arial,sans-serif;color:#E2E8F0}
.wrap{max-width:540px;margin:0 auto;padding:32px 16px}
.logo{text-align:center;margin-bottom:24px;font-size:2rem;font-weight:900;letter-spacing:.3rem}
.u{color:#D00000;text-shadow:0 0 12px rgba(208,0,0,.5)}.n{color:#fff}
.footer{text-align:center;color:#334155;font-size:.75rem;margin-top:24px}
</style></head><body><div class="wrap">
<div class="logo"><span class="u">[U</span><span class="n">NDER</span><span class="u">]</span></div>
${content}
<div class="footer">© 2026 UNDERSTATE — Şehir &amp; Devlet Simülasyonu</div>
</div></body></html>`;
}

function _card(borderColor, content) {
  return `<div style="background:#0A1628;border:1px solid ${borderColor};border-radius:12px;padding:28px">${content}</div>`;
}

// ── Hoş Geldin ────────────────────────────────────────────────────────────────
function sendWelcome(to, username) {
  const html = _layout(_card('rgba(208,0,0,.25)', `
    <h1 style="color:#fff;font-size:1.4rem;margin:0 0 12px">🎮 Hoş geldin, <span style="color:#D00000">${username}</span>!</h1>
    <p style="color:#94A3B8;line-height:1.7">UnderState'e katıldın. Türkiye'nin en kapsamlı çevrimiçi şehir ve devlet simülasyonuna hoş geldin.</p>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,.07);margin:16px 0">
    <p style="color:#CBD5E1;font-weight:600;margin-bottom:10px">Başlangıç bonusların:</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${[['₺10.000','Başlangıç Parası'],['50 UC','UnderCoin'],['Lv1','Seviye']].map(([v,l])=>`
      <div style="flex:1;min-width:90px;background:rgba(208,0,0,.1);border:1px solid rgba(208,0,0,.2);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:1.1rem;font-weight:800;color:#D00000">${v}</div>
        <div style="font-size:.7rem;color:#64748B;text-transform:uppercase">${l}</div>
      </div>`).join('')}
    </div>
  `));
  return _send({ to, toName: username, subject: '🎮 UNDERSTATE\'e Hoş Geldin!', html, type: 'welcome' });
}

// ── Email Doğrulama ───────────────────────────────────────────────────────────
function sendEmailVerification(to, username, verifyUrl) {
  const html = _layout(_card('rgba(16,185,129,.25)', `
    <h1 style="color:#fff;font-size:1.3rem;margin:0 0 12px">✉️ E-posta Adresini Doğrula</h1>
    <p style="color:#94A3B8;line-height:1.7">Merhaba <strong style="color:#fff">${username}</strong>,</p>
    <p style="color:#94A3B8;line-height:1.7">Hesabını aktive etmek için aşağıdaki butona tıkla:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${verifyUrl}" style="background:#10B981;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">✅ E-postamı Doğrula</a>
    </div>
    <p style="color:#64748B;font-size:.82rem;text-align:center">Bu bağlantı 24 saat geçerlidir.</p>
    <p style="color:#64748B;font-size:.82rem;text-align:center">Bu isteği sen yapmadıysan bu e-postayı yoksay.</p>
  `));
  return _send({ to, toName: username, subject: '✉️ UNDERSTATE E-posta Doğrulama', html, type: 'email_verify' });
}

// ── Şifre Sıfırlama ───────────────────────────────────────────────────────────
function sendPasswordReset(to, username, resetUrl) {
  const html = _layout(_card('rgba(208,0,0,.25)', `
    <h1 style="color:#fff;font-size:1.3rem;margin:0 0 12px">🔐 Şifre Sıfırlama</h1>
    <p style="color:#94A3B8;line-height:1.7">Merhaba <strong style="color:#fff">${username}</strong>, şifre sıfırlama talebinde bulundun.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${resetUrl}" style="background:#D00000;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">🔐 Şifremi Sıfırla</a>
    </div>
    <p style="color:#F59E0B;font-size:.82rem;text-align:center">⚠️ Bu bağlantı 1 saat geçerlidir.</p>
    <p style="color:#64748B;font-size:.82rem;text-align:center">Bu isteği sen yapmadıysan yoksay — şifren değişmeyecek.</p>
  `));
  return _send({ to, toName: username, subject: '🔐 UNDERSTATE Şifre Sıfırlama', html, type: 'password_reset' });
}

// ── Ban Bildirimi ─────────────────────────────────────────────────────────────
function sendBanNotification(to, username, reason, until) {
  const untilStr = until ? new Date(until).toLocaleString('tr-TR') : 'Süresiz';
  const html = _layout(_card('rgba(239,68,68,.4)', `
    <h1 style="color:#EF4444;font-size:1.3rem;margin:0 0 12px">🚫 Hesap Askıya Alındı</h1>
    <p style="color:#94A3B8;line-height:1.7">Merhaba <strong style="color:#fff">${username}</strong>,</p>
    <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:12px 16px;color:#FCA5A5;font-style:italic;margin:12px 0">${reason || 'Kural ihlali'}</div>
    <p style="color:#94A3B8">Ban süresi: <strong style="color:#FCA5A5">${untilStr}</strong></p>
    <p style="color:#64748B;font-size:.82rem">Haksız olduğunu düşünüyorsan yöneticilere itiraz edebilirsin.</p>
  `));
  return _send({ to, toName: username, subject: '🚫 UNDERSTATE Hesap Askıya Alındı', html, type: 'ban' });
}

// ── Seçim Sonucu ──────────────────────────────────────────────────────────────
function sendElectionResult(to, username, position, winner, votes) {
  const html = _layout(_card('rgba(167,139,250,.3)', `
    <h1 style="color:#A78BFA;font-size:1.3rem;margin:0 0 12px">🗳️ Seçim Sonuçlandı: ${position}</h1>
    <p style="color:#94A3B8">Merhaba <strong style="color:#fff">${username}</strong>,</p>
    <div style="font-size:1.4rem;font-weight:900;color:#10B981;text-align:center;padding:14px;background:rgba(16,185,129,.1);border-radius:8px;margin:16px 0">🏆 Kazanan: ${winner} (${votes} oy)</div>
    <p style="color:#64748B;font-size:.82rem;text-align:center">Sonuçların tamamını oyun içinde görebilirsin.</p>
  `));
  return _send({ to, toName: username, subject: `🗳️ Seçim Sonucu: ${position}`, html, type: 'election_result' });
}

// ── Genel Bildirim ────────────────────────────────────────────────────────────
function sendNotification(to, username, title, message) {
  const html = _layout(_card('rgba(255,255,255,.08)', `
    <h1 style="color:#fff;font-size:1.2rem;margin:0 0 12px">${title}</h1>
    <p style="color:#94A3B8;line-height:1.7">Merhaba <strong style="color:#fff">${username}</strong>,</p>
    <p style="color:#94A3B8;line-height:1.7">${message}</p>
  `));
  return _send({ to, toName: username, subject: `📢 UNDERSTATE: ${title}`, html, type: 'notification' });
}

module.exports = {
  sendWelcome,
  sendEmailVerification,
  sendPasswordReset,
  sendBanNotification,
  sendElectionResult,
  sendNotification,
};
