const { login } = require('../auth');

async function loginCommand() {
  const email = process.env.CF_EMAIL;
  const password = process.env.CF_PASSWORD;

  if (!email || !password) {
    console.error('Error: CF_EMAIL and CF_PASSWORD must be configured in your .env file.');
    process.exit(1);
  }

  try {
    await login(email, password);
    console.log(`Successfully logged in as ${email}`);
  } catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
  }
}

module.exports = loginCommand;
