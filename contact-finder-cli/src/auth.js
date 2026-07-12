const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSION_DIR = path.join(os.homedir(), '.contact-finder-cli');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

function parseCookies(setCookieHeaders) {
  const cookies = {};
  if (!setCookieHeaders) return cookies;
  for (const header of setCookieHeaders) {
    const parts = header.split(';')[0].trim().split('=');
    if (parts.length >= 2) {
      const name = parts[0];
      const value = parts.slice(1).join('=');
      cookies[name] = value;
    }
  }
  return cookies;
}

function serializeCookies(cookieMap) {
  return Object.entries(cookieMap)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function readSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    // Ignore read errors, treat as no session
  }
  return null;
}

function saveSession(cookies) {
  try {
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to save session:', err.message);
    return false;
  }
}

function deleteSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function login(email, password) {
  const baseUrl = process.env.CF_BASE_URL || 'http://localhost:3000';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  // Step 1: GET CSRF Token
  const csrfUrl = `${cleanBaseUrl}/api/auth/csrf`;
  console.log('Fetching CSRF token...');
  const csrfRes = await fetch(csrfUrl);

  if (!csrfRes.ok) {
    throw new Error(`Failed to fetch CSRF token from ${csrfUrl} (${csrfRes.status})`);
  }

  const { csrfToken } = await csrfRes.json();
  const step1Cookies = parseCookies(csrfRes.headers.getSetCookie());

  // Step 2: POST Credentials
  const callbackUrl = `${cleanBaseUrl}/api/auth/callback/credentials`;
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    json: 'true',
  });

  console.log('Authenticating...');
  const authRes = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': serializeCookies(step1Cookies),
    },
    body: body.toString(),
  });

  if (!authRes.ok) {
    throw new Error(`Authentication request failed (${authRes.status})`);
  }

  // NextAuth sets the session cookie in step 2
  const step2Cookies = parseCookies(authRes.headers.getSetCookie());
  
  // Merge csrf cookie and session cookies
  const allCookies = {
    ...step1Cookies,
    ...step2Cookies,
  };

  // Check if session token actually exists in the jar
  const hasSessionToken = Object.keys(allCookies).some(key => key.includes('session-token'));
  if (!hasSessionToken) {
    throw new Error('Login failed: Invalid credentials or session token not returned.');
  }

  saveSession(allCookies);
  return allCookies;
}

function getStoredCookies() {
  const cookies = readSession();
  return cookies ? serializeCookies(cookies) : null;
}

async function authenticatedFetch(relativePath, options = {}) {
  const baseUrl = process.env.CF_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl.replace(/\/$/, '')}${relativePath}`;

  const cookies = readSession();
  if (!cookies) {
    console.error('Error: You are not logged in. Please run `contact-finder login` first.');
    process.exit(1);
  }

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
    'Cookie': serializeCookies(cookies),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    deleteSession();
    console.error('Error: Session expired or unauthorized. Please log in again using `contact-finder login`.');
    process.exit(1);
  }

  return response;
}

module.exports = {
  login,
  getStoredCookies,
  authenticatedFetch,
  deleteSession,
  readSession,
};
