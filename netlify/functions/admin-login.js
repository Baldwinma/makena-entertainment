const { createAdminToken } = require('./lib/admin-auth');

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

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
        return json(500, { error: 'Admin login is not configured.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (error) {
        return json(400, { error: 'Invalid request body.' });
    }

    if (!credentialsMatch(payload.username, process.env.ADMIN_USERNAME) || !passwordMatches(payload.password, process.env.ADMIN_PASSWORD)) {
        return json(401, { error: 'Invalid admin credentials.' });
    }

    const username = normalizeCredential(payload.username);

    return json(200, {
        token: createAdminToken(username),
        username
    });
};
