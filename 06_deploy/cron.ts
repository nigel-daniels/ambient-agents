import { jobKickoff } from './schemas.ts';
import { fetchAndProcessEmails } from 'ingest.js';
import { StateGraph, START } from '@langchain/langgraph';

// Run the email ingestion process
async function main(state: jobKickoff) {
	console.log(`Kicking off job to fetch emails from the past ${state.minutesSince} minutes`);
	console.log(`Email: ${state.email}`);
	console.log(`URL: ${state.url}`);
	console.log(`Graph name: ${state.graphName}`);

	try {
		const args = {
			email: state.email,
			minutesSince: state.minutesSince,
			graph: state.graph,
			url: state.url,
			includeRead: state.includeRead,
			early: state.early,
			skipFilters: state.skipFilters
		};

		console.log(`Args email: ${args.email}`);
		console.log(`Args url: ${args.url}`);

		console.log('Starting fetch_and_process_emails...');
		const result = await fetchAndProcessEmails(args);
		console.log('fetchAndProcessEmails returned: ' + JSON.stringify(result, null, 2));

		// Return the result status
		return {
			status: result == 0 ? 'success' : 'error',
			exitCode: result
		};
	} catch (err) {
		console.log(`Error in cron job: ${err}`);
		console.log(err.stack);
		return {
			status: 'error',
			error: err
		}
	}
}

export const graph = new StateGraph(jobKickoff)
	.addNode('ingest_emails', main)
	.setEdge(START, 'ingest_emails')
	.compile();
