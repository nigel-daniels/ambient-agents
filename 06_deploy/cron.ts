import { jobKickoff } from './schemas.ts';
import { fetchAndProcessEmails } from './utils.js';
import { StateGraph, START, END } from '@langchain/langgraph';

// This is a wrapper to to the fetchAndProcessEmails functon in the form of
// A graph, the `setup_cron.ts` tool configures it

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
		console.log(`fetchAndProcessEmails returned: ${result}`);

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
	.addEdge(START, 'ingest_emails')
	.addEdge('ingest_emails', END)
	.compile();
