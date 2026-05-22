function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[<>'"]/g, '')
    .trim()
    .slice(0, 1000);
}

function sanitizeInput(req, res, next) {
  if (req.body) {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }
  next();
}

function validatePacket(data, requiredFields = []) {
  if (!data || typeof data !== 'object') return false;
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) return false;
  }
  return true;
}

module.exports = { sanitizeInput, sanitizeString, validatePacket };
