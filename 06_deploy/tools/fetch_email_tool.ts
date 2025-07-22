import createLogger from 'logging';
import { tool } from '@langchain/core/tools';
import google from 'googleapis';
import { z } from 'zod';
import { getCredentials } from './tool_utils.ts';

const logger = createLogger('Fetch Email Tool');

// Fetch recent emails for the given address
export const fetchEmailsTool = tool((input: {emailAddress: string; minutesSince: int}) => {
	// Default minutes since to 30 if not provided
	minutesSince = minutesSince ? minutesSince : 30;

	const emails = Array.from(fetchGroupEmails(emailAddress, minutesSince));

	if (emails.length == 0) {return 'No new emails found.';}

	const result = `Found ${emails.length} new emails:\n\n`;

	emails.foreach => (email, i) {
		if (email.userResponse ?? false) {
			result += `${i}. You already responded to this email (Thread ID: ${email.threadId})\n\n`;
			continue;
		}

		result += `${i}. From: ${email.fromEmail}\n`;
		result += `   To: ${email.toEmail}\n`;
		result += `   Subject: ${email.subject}\n`;
		result += `   Time: ${email.sendTime}\n`;
		result += `   ID: ${email.id}\n`;
		result += `   Thread ID: ${email.threadId}\n`;
		result += `   Content: ${email.pageContent.slice(0, 200)}...\n\n`;
	}

	return result;
}, {
	name: 'fetch_emails_tool',
	description: 'Fetches recent emails from Gmail for the specified email address.',
	schema: z.object({
		emailAddress: z.string().describe('Email address to fetch messages for'),
		minutesSince: z.number().describe('Only retrieve emails newer than this many minutes (default: 30)')
	})
});




// Fetch recent emails from Gmail that involve the specified email address.
// This function retrieves emails where the specified address is either a sender or recipient.
// These a returned in an assistant frieldly format.
function* fetchGroupEmails(emailAddress, minutesSince, gmailToken = null, includeRead = false, skipFilters = false) {

	try {
		const creds = getCredentials();

		if (!creds || !('authorize' in creds)) {
			logger.warn('Invalid Gmail credentials, using mock implementation.');
			logger.warn('Ensure GMAIL_TOKEN environment variable is set or token.json file exists.');
			const mockEmail = {
				fromEmail: 'sender@example.com',
				toEmail: emailAddress,
	            subject: 'Sample Email Subject',
				pageContent: 'This is a sample email body for testing the email assistant.',
	            id: 'mock-email-id-123',
				threadId: 'mock-thread-id-123',
				sendTime: new Date().toISOString().split('T')[0]
			};

			yield mockEmail;
			return;
		}

		const service =  google.gmail({version: 'v1', creds});

		// Calculate the time filter
		const after = const after = Math.floor((Date.now() - minutesSince * 60 * 1000) / 1000);

		// Set up a search query for:
		// - Emails sent to/from an address
		// - Emails after a time
		// - All email tyoes (inbox, updates, promotions, etc.)
		const query = `(to:${emailAddress} OR from:${emailAddress}) after: ${after}`;

		// Decide if we only get unread emails
		if (includeRead) {
			logger.info('Including read emails in search.');
		} else {
			query += ' is:unread';
		}

		// NB you could add other filters such as:
		// query += ' category:(primary OR updates OR promotions)'

		logger.info(`Gmail search query: ${query}`);

		// Get matching messages and set up pagination
		let messages = [];
		let nextPageToken = null;

		logger.info(`Fetching emails for ${emailAddress}`);

		while(true) {
			const res = await service.users.messages.list({
  				userId: 'me',
  				q: query,
  				pageToken: nextPageToken
			});

			const results = res1.data;

			if ('messages' in results) {
				const newMessages = results.messages;

				messages = [...newMessages];
				logger.info(`Found ${newMessages.length} messages in this page.`);
			} else {
				logger.info('No messages found in this page.')
			}

			nextPageToken = results.nextPageToken;

			if (!nextPageToken) {
				logger.info(`Total messages found:  ${messages.length}`);
				break;
			}
		}


		// Now lets process the messages we got
		let count = 0;
		for (const message of messages) {
			try {
				// Get the message details
				const res1 = await service.users.messages.get({
  					userId: 'me',
  					id: message.id
				});

				const msg = res1.data;
				const threadId = msg.threadId;
				const payload = msg.payload;
				const headers = msg.payload.headers ? msg.payload.headers : [];

				// Now get the associted thread
				const res2 = await service.users.threads.get({
  					userId: 'me',
  					id: threadId
				});

				const thread = res2.data;
				const messagesInThread = thread.messages;

				logger.info(`Retrieved thread ${threadId} with ${messagesInThread.length} messages.`);

				// Sort all of the messages by internal date to identify the latest message
				if (messagesInThread.every(msg => 'internalDate' in msg)) {
					messagesInThread.sort((a, b) => {
  						const dateA = parseInt(a.internalDate ?? 0, 10);
  						const dateB = parseInt(b.internalDate ?? 0, 10);
  						return dateA - dateB;
					});
					logger.info(`Sorted ${messagesInThread.length} messages by internalDate.`);
				} else {
					messagesInThread.sort((a, b) => {
						if (a.id < b.id) return -1;
	  					if (a.id > b.id) return 1;
	  					return 0;
					});
					logger.info(`Sorted ${messagesInThread.length} messages by ID (internalDate missing).`);
				}

				// Now lets log details about the messages
				messagesInThread.forEach((msg, idx) => {
  					const headers = msg.payload.headers;

  					const subjectHeader = headers.find(h => h.name === 'Subject');
  					const fromHeader = headers.find(h => h.name === 'From');
  					const dateHeader = headers.find(h => h.name === 'Date');

  					const subject = subjectHeader ? subjectHeader.value : 'No Subject';
  					const fromEmail = fromHeader ? fromHeader.value : 'Unknown';
  					const date = dateHeader ? dateHeader.value : 'Unknown';

					logger.info(`  Message ${idx+1}/${messagesInThread.length}: ID=${msg.id}, Date=${date}, From=${fromEmail}`);
				});

				logger.info(`Thread ${threadId} has ${messagesInThread.length} messages.`);

				// Examine the last message to see if we need to process it
				const lastMessage = messagesInThread[messagesInThread.length-1];
				const lastHeaders = lastMessage.payload.headers;

				// Get the sender of the last message
				const fromHeader = lastHeaders.find(header => header.name === 'From')?.value;
				const lastMessageHeaders = lastMessage.payload.headers ?? [];
				const lastFromHeader = lastMessageHeaders.find(header => header.name === 'From')?.value;

				// If we sent the last message this was a user response, don't process our own messages!
				if (emailAddress in lastFromHeader) {
					yield {
						id: message.id,
						threadId: message.threadId,
						userResponse: true
					};
					continue;
				}

				// Check if we need tp process this message
				const isFromUser = emailAddress in fromHeader;
				const isLatestInThread = message.id == lastMessage.id;

				// Logic for the skipFilters:
				// skipFilters is true: process all messages regardless of position in thread
				// skipFilters is false: process only if not from user and latest message
				const shouldProcess = skipFilters || (!isFromUser && isLatestInThread);

				if (!shouldProcess) {
					if (isFromUser) {
						logger.debug(`Skipping message ${message.id}: sent by the user.`);
					} else if (!isLatestInThread) {
						logger.debug(`Skipping message ${message.id}: not the latest in thread`);
					}
				} else {
					// Log the message details
					logger.info(`Processing message ${message.id} from thread ${threadId}`);
					logger.info(`  Is latest in thread: ${isLatestInThread}`);
					logger.info(`  Skip filters enabled: ${skipFilters}`);

					// If the user wants to process the latest message use the lastMessage instead of the origional matching message
					let processMessage = null;
					let processPayload = null;
					let processHeaders = null;

					if (skipFilters) {
						processMessage = lastMessage;
						processPayload = lastMessage.payload;
						processHeaders = processPayload.headers ? processPayload.headers : [];
						logger.info(`Using latest message in thread: ${processMessage.id}`)
					} else {
						processMessage = message;
						processPayload = payload;
						processHeaders = headers;
					}

					// Extract email metadata from the headers
					const subject = processHeaders.find(header => header.name === 'Subject')?.value;
					let fromEmail = (processHeaders.find(header => header.name === 'From')?.value || '').trim();
					const toEmail = (processHeaders.find(header => header.name === 'To')?.value || '').trim();

					// Use reply to header if it's there
					const replyTo = (processHeaders.find(header => header.name === 'Reply-To')?.value || '').trim();
					if (replyTo) {fromEmail = replyTo;}

					// Get the email timestamp
					const sendTime = processHeaders.find(header => header.name === "Date")?.value;
					const parsedTime = new Date(sendTime);

					// Extract the body content
					const body = extractMessagePart(processPayload);

					// Now yeild the processed result
					yield {
						fromEmail: fromEmail,
						toEmail: toEmail,
                        subject: subject,
						pageContent: body,
						id: processMessage.id,
						threadId: processMessage.threadId,
						sendTime: parsedTime.toISOString().split('T')[0]
					};
					 count += 1;
				}

			} catch (err) {
				logger.warn(`Failed to process message ${message.id}: ${err}`);
			}
		}

		logger.info(`Found ${count} emails to process out of ${messages.length} total messages.`)

	} catch(err) {
		logger.error(`Error accessing Gmail API: ${err}`);
		const mockEmail = {
			fromEmail: 'sender@example.com',
			toEmail: emailAddress,
            subject: 'Sample Email Subject',
			pageContent: 'This is a sample email body for testing the email assistant.',
            id: 'mock-email-id-123',
			threadId: 'mock-thread-id-123',
			sendTime: new Date().toISOString().split('T')[0]
		};

		yield mockEmail;
	}
}


//Extract content from a message part.
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
