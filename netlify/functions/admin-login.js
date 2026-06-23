const { createAdminToken } = require('./lib/admin-auth');

const attempts = new Map();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

function normalizeCredential(value) {
    return String(value || '').trim();
}

function credentialsMatch(input, expected) {
    return normalizeCredential(input).toLowerCase() === normalizeCredential(expected).toLowerCase();
}

function passwordMatches(input, expected) {
    return normalizeCredential(input) === normalizeCredential(expected);
}

function parseAdminUsers(value) {
    return String(value || '')
        .split(',')
        .map(entry => entry.trim())
        .filter(Boolean)
        .map(entry => {
            const separatorIndex = entry.indexOf(':');
            if (separatorIndex === -1) {
                return null;
            }

            return {
                username: entry.slice(0, separatorIndex).trim(),
                password: entry.slice(separatorIndex + 1).trim()
            };
        })
        .filter(user => user && user.username && user.password);
}

function getAdminUsers() {
    const users = parseAdminUsers(process.env.ADMIN_USERS);

    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
        users.push({
            username: process.env.ADMIN_USERNAME,
            password: process.env.ADMIN_PASSWORD
        });
    }

    return users;
}

function getClientKey(event, username) {
    const forwardedFor = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || '';
    const ip = forwardedFor.split(',')[0].trim() || event.headers['client-ip'] || 'unknown';
    return `${ip}:${normalizeCredential(username).toLowerCase()}`;
}

function isRateLimited(key) {
    const now = Date.now();
    const record = attempts.get(key);
    if (!record || record.resetAt <= now) {
        attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
        return false;
    }

    return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(key) {
    const now = Date.now();
    const record = attempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };
    if (record.resetAt <= now) {
        attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return;
    }

    record.count += 1;
    attempts.set(key, record);
}

function clearAttempts(key) {
    attempts.delete(key);
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    const adminUsers = getAdminUsers();

    if (!adminUsers.length || !process.env.ADMIN_SESSION_SECRET) {
        return json(500, { error: 'Admin login is not configured.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (error) {
        return json(400, { error: 'Invalid request body.' });
    }

    const attemptKey = getClientKey(event, payload.username);
    if (isRateLimited(attemptKey)) {
        return json(429, { error: 'Too many login attempts. Try again later.' });
    }

    const matchingUser = adminUsers.find(user =>
        credentialsMatch(payload.username, user.username) && passwordMatches(payload.password, user.password)
    );

    if (!matchingUser) {
        recordFailedAttempt(attemptKey);
        return json(401, { error: 'Invalid admin credentials.' });
    }

    clearAttempts(attemptKey);
    const username = normalizeCredential(matchingUser.username);

    return json(200, {
        token: createAdminToken(username),
        username
    });
};
