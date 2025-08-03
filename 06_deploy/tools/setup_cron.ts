import { Command } from 'commander';
import { Client } from '@langchain/langgraph-sdk';

const program = new Command();

// This script creates a scheduled cron job in LangGraph that periodically
// runs the email ingestion graph to process new emails.
program
.description('Setup cron job for email ingestion in LangGraph.')
	.requiredOption('-e --email <email>', 'Email address to fetch messages for')
	.requiredOption('-u --url <url>', 'URL of the LangGraph deployment')
	.option('-m --minutes-since <number>', 'Only process emails that are less than this many minutes old', 60)
	.option('-s --schedule <schedule>', 'Cron schedule expression (default: every 10 minutes)', '*/10 * * * *')
	.option('-g --graph <graph>', 'Name of the LangGraph to use', 'assistant')
	.option('--include-read', 'Include emails that have already been read', true);

program.parse();

const opts = program.opts();

await main(opts.email, opts.url, opts.minutesSince, opts.schedule, opts.graph, opts.includeRead);


async function main(email, url, minutesSince, schedule, graph, includeRead) {
	// Conect to the server
	const client = url ? new Client({ apiUrl: url}) : new Client({ apiUrl: 'http://localhost:2024/'});

	const cronInput = {
		email: email,
		minutesSince: minutesSince,
		graph: graph,
		url: url ? url : 'http://localhost:2024/',
		includeRead: includeRead,
		early: 'false',
		skipFilters: 'false'
	};

	const cron = await client.crons.create(
		'cron',						// Graph name (found in the langgraph.json)
		{
			schedule: schedule, 	// A cron schedule expression : https://en.wikipedia.org/wiki/Cron
			input: cronInput		// Input for the cron graph (see ../cron.ts)
		}
	);

	console.log(`Cron job created successfully with schedule: ${schedule}`);
	console.log(`Email ingestion will run for: ${email}`);
	console.log(`Processing emails from the past ${minutesSince} minutes`);
	console.log(`Using graph: ${graph}`);

	return cron;
}
