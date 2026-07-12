const { search } = require('../api');
const { printContactTable } = require('../format');

async function searchCommand(options) {
  const { company, role, country } = options;

  if (!company) {
    console.error('Error: --company option is required.');
    process.exit(1);
  }
  if (!role) {
    console.error('Error: --role option is required.');
    process.exit(1);
  }

  const finalCountry = country || 'Global';

  console.log(`Searching for "${role}" at "${company}" (${finalCountry})...`);
  try {
    const data = await search(company, role, finalCountry);
    if (!data.success) {
      console.error('Search failed:', data.message || 'Unknown error');
      process.exit(1);
    }

    const contactsCount = data.contacts ? data.contacts.length : 0;
    const summary = `Found ${contactsCount} contact(s) for "${role}" at "${company}" (${finalCountry})`;
    printContactTable(data.contacts, summary);
  } catch (err) {
    console.error('Error during search:', err.message);
    process.exit(1);
  }
}

module.exports = searchCommand;
