const crypto = require('crypto');

function base64url(input) {
    return Buffer.from(input).toString('base64url');
}

function sign(value) {
    return crypto
        .createHmac('sha256', process.env.ADMIN_SESSION_SECRET)
        .update(value)
        .digest('base64url');
}

function createAdminToken(username) {
    const payload = {
        username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
    };
    const encodedPayload = base64url(JSON.stringify(payload));
    return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifyAdminToken(token) {
    if (!process.env.ADMIN_SESSION_SECRET || !token || !token.includes('.')) {
        return null;
    }

    const [encodedPayload, signature] = token.split('.');
    const expectedSignature = sign(encodedPayload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return payload;
    } catch (error) {
        return null;
    }
}

function requireAdmin(event) {
    const header = event.headers.authorization || event.headers.Authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    return verifyAdminToken(token);
}

module.exports = {
    createAdminToken,
    requireAdmin
};
