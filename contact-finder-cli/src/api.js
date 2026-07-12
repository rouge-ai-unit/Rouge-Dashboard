const { authenticatedFetch } = require('./auth');

async function search(company, role, country) {
  const response = await authenticatedFetch('/api/contact-finder/search', {
    method: 'POST',
    body: JSON.stringify({ company, role, country }),
  });
  return response.json();
}

async function getHistory(limit = 20, offset = 0) {
  const response = await authenticatedFetch(`/api/contact-finder/history?limit=${limit}&offset=${offset}`, {
    method: 'GET',
  });
  return response.json();
}

async function getHistoryDetail(searchId) {
  const response = await authenticatedFetch(`/api/contact-finder/history/${searchId}`, {
    method: 'GET',
  });
  return response.json();
}

async function deleteHistoryItem(searchId) {
  const response = await authenticatedFetch(`/api/contact-finder/history/${searchId}`, {
    method: 'DELETE',
  });
  return response.json();
}

async function clearHistory() {
  const response = await authenticatedFetch('/api/contact-finder/history', {
    method: 'DELETE',
  });
  return response.json();
}

module.exports = {
  search,
  getHistory,
  getHistoryDetail,
  deleteHistoryItem,
  clearHistory,
};
