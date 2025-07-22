import { Command } from 'commander';
import { Client } from "langsmith";
import crypto from 'crypto';
import { v5 as uuid5 } from 'uuid';

const program = new Command();

const SECRETS_DIR = __dirname + '/.secrets';

program
	.description('Simple Gmail ingestion for LangGraph with reliable tracing')
	.requiredOption('-e --email <email>', 'Email address to fetch messages for')
	.option('-m --minutes-since <number>', 'Only retrieve emails newer than this many minutes').default(120, '2 hours')
	.option('-g --graph-name <string>', 'Name of the LangGraph to use').default('assistant', 'assistant')
	.option('-u --url <url>', 'URL of the LangGraph deployment', ).default('http://127.0.0.1:2024', 'http://127.0.0.1:2024')
	.option('--early', 'Early stop after processing one email').default(true)
	.option('--include-read', 'Include emails that have already been read').default(true)
	.option('--skip-filters', 'Skip filtering of emails').default(true);

program.parse();
await fetchAndProcessEmails(program.opts());



// Fetch emails from Gmail and process them through LangGraph.
async function fetchAndProcessEmails(options) {
	const credentials = loadGmailCredentials();

	if (!credentials) {
		console.log('Failed to load Gmail credentials');
		return 1;
	}

	const service =  google.gmail({version: 'v1', credentials});

	let processedCount = 0;

	try {
		// Get the email address
		emailAddress = options.email;

		// Construct the Gmail query
		let query = `to: ${emailAddress} OR from: ${emailAddress}`;

		// Add the time span
		if (options.minutesSince > 0) {
			const after = Math.floor((Date.now() - options.minutesSince * 60 * 1000) / 1000);
			query += ` after: ${after}`;
		}

		// Only include unread if include read is false
		if (!options.includeRead) {
			query += ' is:unread';
		}

		console.log(`Gmail search query: ${query}`);

		// Execute the search
		const result = await service.users.messages.list({
			userId: 'me',
			q: query
		});
		const messages = result.messages ? result.messages : [];

		if (messages.length == 0) {
			console.log('No emails found matching the criteria');
			return 0;
		}

		console.log(`found ${messages.length} emails`);

		// Process each email
		messages.forEach((messageInfo, i) => {
			// Stop early if requested
			if (options.early && (i > 0)) {
				console.log(`Early stop after processing ${i} emails`);
				break;
			}

			// Get the full message
			const message = await service.users.messages.get({
				userId: me,
				id: messageInfo.id
			});

			const emailData = extractEmailData(message);

			console.log(`\nProcessing email ${i+1}/${messages.length}:`);
			console.log(`From: ${emailData.fromEmail}`);
			console.log(`Subject: ${emailData.subject}`);

			const {threadId, run} = await ingestEmailToLanggraph(emailData, options.graph, options.url);

			processCount += 1;
		});

		console.log(`\nProcesses ${processCount} emails successfully`);
		return 0;

	} catch (err) {
		console.log(`Error processing emails: ${err}`);
		return 1;
	}

}


// Get Gmail API credentials from token.json or environment variables.
function loadGmailCredentials() {
	const tokenPath = SECRETS_DIR + '/token.json';
	let tokenData = null;

	// Is there an environment variable
	if(process.env.GMAIL_TOKEN) {
		try {
			tokenData = JSON.parse(process.env.GMAIL_TOKEN);
			logger.info('Using GMAIL_TOKEN environment variable.');
		} catch (err) {
			logger.warn(`Could not parse GMAIL_TOKEN environment variable: ${err}`);
		}
	}

	if (!tokenData) {
		// Try the local file
		if (fs.existsSync(tokenPath)) {
			try {
				tokenData = JSON.parse(fs.readFileSync(tokenPath));
				logger.info(`Using token from ${tokenPath}`);
			} catch(err) {
				logger.warn(`Could not load token from ${tokenPath}`);
			}
		}
	}

	if (!tokenData) {
		logger.error('Could not find valid token data in any location.');
		return null;
	}

	try {
		return google.auth.fromJSON(tokenData);
	} catch(err) {
		logger.error(`Error creating credentials object: ${err}`);
		return null;
	}
}


// Extract key information from a Gmail message.
function extractEmailData(message) {
	const headers = message.payload.headers;

	const subject = (processHeaders.find(header => header.name === 'Subject')?.value || 'No Subject').trim();
	const fromEmail = (processHeaders.find(header => header.name === 'From')?.value || 'Unknown Sender').trim();
	const toEmail = (processHeaders.find(header => header.name === 'To')?.value || 'Unknown Recipient').trim();
	const date = (processHeaders.find(header => header.name === 'Date')?.value || 'Unknown Date').trim();
	const parsedTime = new Date(date);

	const content = extractMessagePart(message.payload);

	return {
		fromEmail: fromEmail,
		toEmail: toEmail,
		subject: subject,
		pageContent: content,
		id: message.id,
		threadId: message.threadId,
		sendTime: parsedTime.toISOString().split('T')[0]
	};
}

// Extract content from a message part.
function extractMessagePart(payload) {
	if (payload.body?.data) {
  		// Handle base64 encoded content
  		const data = payload.body.data;
		const decoded = Buffer.from(data, 'base64url').toString('utf-8');
		return decoded;
	}

	if (payload.parts) {
		let textParts = [];

		for (const part of payload.parts) {
			const content = extractMessagePart(part);

			if (content) {
				textParts.push(content);
			}

			return textParts.join('\n');
		}
	}

	return '';
}


// Ingest an email to LangGraph.
async function ingestEmailToLanggraph(emailData, graphName, url) {
	// connect to Langraph Server
	const client = new Client();

	// Create a consistent UUID for the thread
	const rawThreadId = emailData.threadId;
	const md5Hex = crypto.createHash('md5').update(rawThreadId, 'utf8').digest('hex');
	const threadId = uuid5(md5Hex, uuid5.URL);

	console.log(`Gmail thread ID: ${rawThreadId} -> LangGraph thread ID: ${threadId}`);

	let threadExists = false;
	let threadInfo = await client.threads.get(threadId);

	if (threadInfo) {
		console.log(`Found existing thread: ${threadId}`);
		threadExists = true;
	} else {
		console.log(`Creating new thread: ${threadId}`);
		threadInfo = await client.threads.create({threadId: threadId});
	}

	if (threadExists) {
		try {
			const runs = await client.runs.list(threadId);

			for (runInfo of runs) {
				runId = runInfo.id;
				console.log(`Deleting previous run ${runId} from thread ${threadId}`);

				try {
					await client.runs.delete(threadId, runId);
				} catch(err1) {
					console.log(`Failed to delete run ${runId}: ${err1}`)
				}
			}
		} catch (err) {
			console.log(`Error listing/deleting runs: ${err}`)
		}

	await client.threads.update(threadId, {metadata: {emailId: emailData.id}});

	console.log(`Creating run for thread ${threadId} with graph ${graphName}`);

	const run = await client.runs.create(threadId, graphName, {
		input: {
			emailInput: {
				from: emailData.fromEmail,
				to: emailData.toEmail,
				subject: emailData.subject,
				body: emailData.pageContent,
				id: emailData.id
			}
		},
		multitaskStrategy: 'rollback'
	});

	console.log(`Run created successfully with thread ID: ${threadId}`);
	}

	return {threadId, run};
}
