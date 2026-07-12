const readline = require('readline');
const { getHistory, getHistoryDetail, deleteHistoryItem, clearHistory } = require('../api');
const { printHistoryTable, printContactTable } = require('../format');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function listHistory(options) {
  const limit = parseInt(options.limit, 10) || 20;
  const offset = parseInt(options.offset, 10) || 0;

  console.log(`Fetching history (limit: ${limit}, offset: ${offset})...`);
  try {
    const data = await getHistory(limit, offset);
    if (!data.success) {
      console.error('Failed to retrieve history:', data.message || 'Unknown error');
      process.exit(1);
    }

    printHistoryTable(data.searches);
  } catch (err) {
    console.error('Error fetching history:', err.message);
    process.exit(1);
  }
}

async function showHistory(searchId) {
  console.log(`Fetching details for search ID: ${searchId}...`);
  try {
    const data = await getHistoryDetail(searchId);
    if (!data.success || !data.search) {
      console.error('Search session not found:', data.message || 'Unknown error');
      process.exit(1);
    }

    const { company, role, country, contacts, createdAt } = data.search;
    const summary = `Found ${contacts ? contacts.length : 0} contact(s) for "${role}" at "${company}" (${country}) — Search date: ${new Date(createdAt).toLocaleString()}`;
    printContactTable(contacts, summary);
  } catch (err) {
    console.error('Error fetching search details:', err.message);
    process.exit(1);
  }
}

async function deleteHistory(searchId) {
  const confirmation = await askQuestion(`Are you sure you want to delete search ID ${searchId}? (y/N): `);
  if (confirmation.toLowerCase().trim() !== 'y') {
    console.log('Aborted.');
    return;
  }

  console.log(`Deleting search session ${searchId}...`);
  try {
    const data = await deleteHistoryItem(searchId);
    if (!data.success) {
      console.error('Failed to delete search session:', data.message || 'Unknown error');
      process.exit(1);
    }
    console.log('Successfully deleted.');
  } catch (err) {
    console.error('Error deleting history item:', err.message);
    process.exit(1);
  }
}

async function clearHistoryCommand() {
  const confirmation = await askQuestion('Are you sure you want to CLEAR ALL search history? This is DESTRUCTIVE. Type "yes" to confirm: ');
  if (confirmation.trim() !== 'yes') {
    console.log('Aborted.');
    return;
  }

  console.log('Clearing all search history...');
  try {
    const data = await clearHistory();
    if (!data.success) {
      console.error('Failed to clear search history:', data.message || 'Unknown error');
      process.exit(1);
    }
    console.log('Successfully cleared all search history.');
  } catch (err) {
    console.error('Error clearing history:', err.message);
    process.exit(1);
  }
}

module.exports = {
  listHistory,
  showHistory,
  deleteHistory,
  clearHistory: clearHistoryCommand,
};
