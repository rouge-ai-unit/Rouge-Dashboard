const Table = require('cli-table3');

function printContactTable(contacts, titleText = '') {
  if (titleText) {
    console.log('\n' + titleText);
  }

  if (!contacts || contacts.length === 0) {
    console.log('No contacts found.');
    return;
  }

  const table = new Table({
    head: ['Name', 'Title', 'Email', 'Phone', 'LinkedIn', 'Confidence'],
    style: {
      head: ['cyan', 'bold'],
      border: ['gray'],
    },
    wordWrap: true,
  });

  for (const contact of contacts) {
    table.push([
      contact.name || 'Unknown',
      contact.title || 'Unknown',
      contact.email || 'Not found',
      contact.phone || 'Not found',
      contact.linkedin || 'Not found',
      contact.confidence ? contact.confidence.toUpperCase() : 'LOW',
    ]);
  }

  console.log(table.toString());
}

function printHistoryTable(searches) {
  if (!searches || searches.length === 0) {
    console.log('No search history found.');
    return;
  }

  const table = new Table({
    head: ['#', 'Search ID', 'Company', 'Role', 'Country', 'Created At'],
    style: {
      head: ['cyan', 'bold'],
      border: ['gray'],
    },
    wordWrap: true,
  });

  searches.forEach((search, index) => {
    table.push([
      index + 1,
      search.id,
      search.company,
      search.role,
      search.country,
      new Date(search.createdAt).toLocaleString(),
    ]);
  });

  console.log(table.toString());
}

module.exports = {
  printContactTable,
  printHistoryTable,
};
