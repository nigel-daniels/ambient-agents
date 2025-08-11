import { Command } from 'commander';
import { fetchAndProcessEmails } from './utils.ts';
const program = new Command();

// Note in JS this is just a wrapper to inject the options so that the
// command part is separated and cron can share the ingest function
program
	.description('Simple Gmail ingestion for LangGraph with reliable tracing')
	.requiredOption('-e --email <email>', 'Email address to fetch messages for')
	.option('-m --minutes-since <number>', 'Only retrieve emails newer than this many minutes', 120)
	.option('-g --graph <graph>', 'Name of the LangGraph to use', 'assistant')
	.option('-u --url <url>', 'URL of the LangGraph deployment', 'http://localhost:2024')
	.option('--early', 'Early stop after processing one email', true)
	.option('--include-read', 'Include emails that have already been read', true)
	.option('--skip-filters', 'Skip filtering of emails', true);

program.parse();

await fetchAndProcessEmails(program.opts());
