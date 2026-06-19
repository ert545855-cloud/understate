/**
 * Auth Controller — Supabase PostgreSQL versiyonu
 * MongoDB kaldırıldı, tüm user operations supabaseService üzerinden.
 */
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const sb      = require('../services/supabaseService');
const { signToken, signRefreshToken, verifyRefreshToken } = require('../config/jwt');
const logger  = require('../utils/logger');
const { RESET_TOKEN_EXPIRY_MS, BCRYPT_ROUNDS, BETA_MODE, BETA_INVITE_CODES } = require('../config/constants');
const mailService = require('../services/mailService');

const ADMIN_USERNAMES = (process.env.ADMIN_USERS || 'admin').split(',').map(s => s.trim());

const EMAIL_VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000;

function _baseUrl(req) {
  return process.env.PUBLIC_URL || (req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5000');
}

function validateUsername(u) {
  if (!u || typeof u !== 'string') return 'Kullanıcı adı gerekli';
  const t = u.trim();
  if (t.length < 3)  return 'Kullanıcı adı en az 3 karakter';
  if (t.length > 20) return 'Kullanıcı adı en fazla 20 karakter';
  if (!/^[a-zA-Z0-9_]+$/.test(t)) return 'Sadece harf, rakam ve _ kullanılabilir';
  return null;
}
function validateEmail(e) {
  if (!e || typeof e !== 'string') return 'Email gerekli';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())) return 'Geçerli bir email girin';
  if (e.length > 100) return 'Email çok uzun';
  return null;
}
function validatePassword(p) {
  if (!p || typeof p !== 'string') return 'Şifre gerekli';
  if (p.length < 6)   return 'Şifre en az 6 karakter';
  if (p.length > 128) return 'Şifre çok uzun';
  return null;
}

function userToPublic(u) {
  const isAdmin = u.role === 'admin' || ADMIN_USERNAMES.includes(u.username);
  return {
    id:               u.id,
    username:         u.username,
    email:            u.email,
    role:             u.role,
    banned:           u.banned,
    banReason:        u.ban_reason,
    level:            u.level,
    xp:               u.xp,
    money:            u.money,
    bankMoney:        u.bank_money,
    underCoin:        u.under_coin,
    hp:               u.hp,
    score:            u.score,
    creditScore:      u.credit_score,
    meritPoints:      u.merit_points,
    loyaltyPoints:    u.loyalty_points,
    city:             u.city,
    position:         u.position_tag,
    educationLevel:   isAdmin ? 'profesor' : u.education_level,
    educationProgress:isAdmin ? 100 : u.education_progress,
    inventory:        u.inventory,
    equippedItems:    u.equipped_items,
    holdings:         u.holdings,
    gameData:         isAdmin
      ? { ...(u.game_data || {}), education: { ...(u.game_data?.education || {}), diploma: 'profesor', progress: 100 } }
      : u.game_data,
    lastLogin:        u.last_login,
    createdAt:        u.created_at,
    emailVerified:    u.email_verified,
  };
}

// ── Register ────────────────────────────────────────────────────────────────
async function register(req, res) {
  try {
    if (!sb.isReady())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });

    const { username, email, password, inviteCode } = req.body;

    // ── Kapalı Beta Kontrolü ──────────────────────────────────────────────────
    if (BETA_MODE) {
      const code = (inviteCode || '').toUpperCase().trim();
      if (!BETA_INVITE_CODES.includes(code)) {
        return res.status(403).json({
          success: false,
          message: 'Kapalı beta aşamasındayız. Geçerli bir davet kodu gerekiyor.'
        });
      }
    }

    const uErr = validateUsername(username); if (uErr) return res.status(400).json({ success: false, message: uErr });
    const eErr = validateEmail(email);       if (eErr) return res.status(400).json({ success: false, message: eErr });
    const pErr = validatePassword(password); if (pErr) return res.status(400).json({ success: false, message: pErr });

    const cleanUsername = username.trim();
    const cleanEmail    = email.trim().toLowerCase();

    // Check duplicate
    const [existU, existE] = await Promise.all([
      sb.findUserByUsername(cleanUsername),
      sb.findUserByEmail(cleanEmail),
    ]);
    if (existU) return res.status(409).json({ success: false, message: 'Kullanıcı adı zaten kullanımda' });
    if (existE) return res.status(409).json({ success: false, message: 'Email zaten kullanımda' });

    const passwordHash   = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const mailAvailable  = Boolean(process.env.BREVO_API_KEY);

    // Generate unique referral code
    const referralCode = cleanUsername.slice(0, 4).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();

    const rawVerifyToken    = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');

    const userFields = {
      username:            cleanUsername,
      email:               cleanEmail,
      password_hash:       passwordHash,
      referral_code:       referralCode,
      email_verified:      false,
      email_verify_token:  hashedVerifyToken,
      email_verify_expiry: new Date(Date.now() + EMAIL_VERIFY_EXPIRY_MS).toISOString(),
    };

    const { ok, user, error } = await sb.createUser(userFields);
    if (!ok) return res.status(500).json({ success: false, message: error || 'Kayıt başarısız' });

    const token        = signToken({ id: user.id, username: user.username, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });
    await sb.updateUser(user.id, { refresh_token: refreshToken });

    if (mailAvailable) {
      const verifyUrl = `${_baseUrl(req)}/api/auth/verify-email?token=${rawVerifyToken}&userId=${user.id}`;
      mailService.sendWelcome(cleanEmail, cleanUsername).catch(() => {});
      mailService.sendEmailVerification(cleanEmail, cleanUsername, verifyUrl).catch(() => {});
    } else {
      logger.warn('[Auth] BREVO_API_KEY eksik — doğrulama maili gönderilemiyor. Kullanıcı manuel olarak doğrulanmalı.');
    }

    logger.success(`Yeni kullanıcı: ${cleanUsername}`);
    res.status(201).json({ success: true, token, refreshToken, user: userToPublic(user) });
  } catch (err) {
    logger.error('Register hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Login ───────────────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    if (!sb.isReady())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });

    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gerekli' });

    const user = await sb.findUserByUsernameOrEmail(username.trim());
    if (!user)
      return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı' });

    if (user.banned)
      return res.status(403).json({ success: false, message: `Hesabınız banlanmıştır: ${user.ban_reason || ''}` });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Hatalı şifre' });

    // #35 — 2FA check
    if (user.two_factor_enabled) {
      const { twoFactorToken } = req.body;
      if (!twoFactorToken) {
        return res.status(200).json({ success: false, requires2FA: true, message: '2FA kodu gerekli' });
      }
      const { verify2FA } = require('../services/twoFactorService');
      const tfaOk = await verify2FA(user.id, twoFactorToken);
      if (!tfaOk) {
        return res.status(401).json({ success: false, message: 'Geçersiz 2FA kodu' });
      }
    }

    const token        = signToken({ id: user.id, username: user.username, role: user.role });
    const newRefresh   = signRefreshToken({ id: user.id });

    await sb.updateUser(user.id, {
      refresh_token: newRefresh,
      last_login:    new Date().toISOString(),
      is_online:     true,
    });

    logger.info(`Giriş: ${user.username}`);
    res.json({ success: true, token, refreshToken: newRefresh, user: userToPublic(user) });
  } catch (err) {
    logger.error('Login hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Logout ──────────────────────────────────────────────────────────────────
async function logout(req, res) {
  try {
    await sb.updateUser(req.user.id, {
      refresh_token: null,
      is_online:     false,
      socket_id:     null,
    });
    logger.info(`Çıkış: ${req.user.username}`);
    res.json({ success: true, message: 'Çıkış yapıldı' });
  } catch (err) {
    logger.error('Logout hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Refresh Token ────────────────────────────────────────────────────────────
async function refreshToken(req, res) {
  try {
    const { refreshToken: token } = req.body;
    if (!token || typeof token !== 'string')
      return res.status(400).json({ success: false, message: 'Refresh token gerekli' });

    let decoded;
    try { decoded = verifyRefreshToken(token); }
    catch { return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş refresh token' }); }

    const user = await sb.findUserById(decoded.id);
    if (!user || user.refresh_token !== token)
      return res.status(401).json({ success: false, message: 'Token geçersiz' });

    if (user.banned)
      return res.status(403).json({ success: false, message: 'Hesabınız banlanmıştır' });

    const newAccess  = signToken({ id: user.id, username: user.username, role: user.role });
    const newRefresh = signRefreshToken({ id: user.id });

    await sb.updateUser(user.id, { refresh_token: newRefresh });

    res.json({ success: true, token: newAccess, refreshToken: newRefresh });
  } catch (err) {
    logger.error('Refresh hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Forgot Password ──────────────────────────────────────────────────────────
async function forgotPassword(req, res) {
  try {
    if (!sb.isReady())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email gerekli' });

    const user = await sb.findUserByEmail(email.trim().toLowerCase());
    if (!user) return res.json({ success: true, message: 'Eğer bu email kayıtlıysa, sıfırlama bağlantısı gönderildi' });

    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await sb.updateUser(user.id, {
      reset_token:        hashedToken,
      reset_token_expiry: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS).toISOString(),
    });

    const resetUrl = `${_baseUrl(req)}/?resetToken=${rawToken}&userId=${user.id}`;
    mailService.sendPasswordReset(user.email, user.username, resetUrl)
      .then(r => { if (!r.ok) logger.warn('Şifre sıfırlama maili gönderilemedi:', r.reason); })
      .catch(e => logger.error('Mail hatası:', e.message));

    res.json({ success: true, message: 'Eğer bu email kayıtlıysa, sıfırlama bağlantısı gönderildi' });
  } catch (err) {
    logger.error('ForgotPassword hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Reset Password ───────────────────────────────────────────────────────────
async function resetPassword(req, res) {
  try {
    if (!sb.isReady())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });

    const { userId, token, newPassword } = req.body;
    if (!userId || !token || !newPassword)
      return res.status(400).json({ success: false, message: 'Tüm alanlar gerekli' });

    const pErr = validatePassword(newPassword);
    if (pErr) return res.status(400).json({ success: false, message: pErr });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await sb.findUserByResetToken(hashedToken);
    if (!user || user.id !== userId)
      return res.status(400).json({ success: false, message: 'Geçersiz veya süresi dolmuş bağlantı' });

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await sb.updateUser(user.id, {
      password_hash:      passwordHash,
      reset_token:        null,
      reset_token_expiry: null,
      refresh_token:      null,
    });

    logger.info(`Şifre sıfırlandı: ${user.username}`);
    res.json({ success: true, message: 'Şifreniz başarıyla değiştirildi. Yeniden giriş yapın.' });
  } catch (err) {
    logger.error('ResetPassword hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Get Profile ──────────────────────────────────────────────────────────────
async function getProfile(req, res) {
  try {
    if (!sb.isReady())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });
    const user = await sb.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, user: userToPublic(user) });
  } catch (err) {
    logger.error('GetProfile hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Change Password (authenticated) ──────────────────────────────────────────
async function changePassword(req, res) {
  try {
    if (!sb.isReady())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Mevcut ve yeni şifre gerekli' });
    const pErr = validatePassword(newPassword);
    if (pErr) return res.status(400).json({ success: false, message: pErr });
    const user = await sb.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(400).json({ success: false, message: 'Mevcut şifre hatalı' });
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await sb.updateUser(user.id, { password_hash: passwordHash, refresh_token: null });
    logger.info(`[Auth] Şifre değiştirildi: ${user.username}`);
    res.json({ success: true, message: 'Şifreniz başarıyla güncellendi' });
  } catch (err) {
    logger.error('ChangePassword hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, changePassword, getProfile, userToPublic };
