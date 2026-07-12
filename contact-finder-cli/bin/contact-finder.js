#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
// Load .env from the cli root folder
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const loginCommand = require('../src/commands/login');
const searchCommand = require('../src/commands/search');
const { listHistory, showHistory, deleteHistory, clearHistory } = require('../src/commands/history');

program
  .name('contact-finder')
  .description('CLI client for the Contact Finder API')
  .version('1.0.0');

program
  .command('login')
  .description('Log in using credentials from .env')
  .action(loginCommand);

program
  .command('search')
  .description('Search for professional contacts')
  .requiredOption('-c, --company <company>', 'Target company name')
  .requiredOption('-r, --role <role>', 'Target job role/title')
  .option('-o, --country <country>', 'Target country (optional, defaults to Global)')
  .action(searchCommand);

const historyCmd = program
  .command('history')
  .description('View and manage search history. Running history without subcommands lists recent searches.')
  .option('-l, --limit <limit>', 'Maximum number of items to show', '20')
  .option('-s, --offset <offset>', 'Offset for pagination', '0')
  .action(async (options) => {
    await listHistory(options);
  });

historyCmd
  .command('show <searchId>')
  .description('Show detailed contact results of a past search session')
  .action(showHistory);

historyCmd
  .command('delete <searchId>')
  .description('Delete a specific search session from history')
  .action(deleteHistory);

historyCmd
  .command('clear')
  .description('Clear all search history (destructive)')
  .action(clearHistory);

program.parse(process.argv);
