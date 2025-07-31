import createLogger from 'logging';
import { tool } from '@langchain/core/tools';
import { google } from 'googleapis';
import { createMimeMessage } from 'mimetext';
import { z } from 'zod';
import { getCredentials } from './tool_utils.ts';

const logger = createLogger('Send Email Tool');

// Send an email
export const sendEmailTool = await tool(
	async (input: {emailId: string; responseText: string; emailAddress: string; additionalRecipients: string[]}) => {
		try {
			const success = await sendEmail(input.emailId, input.responseText, input.emailAddress, input.additionalRecipients);

			return success ? `Email reply sent successfully to message ID: ${input.emailId}` : 'Failed to send email due to an API error';
		} catch(err) {
			return `Failed to send email: ${err}`;
		}
	},{
		name: 'send_email_tool',
		description: 'Send a reply to an existing email thread or create a new email in Gmail.',
		schema: z.object({
			emailId: z.string().describe(`Gmail message ID to reply to. This should be a valid Gmail message ID do NOT use the subject.
					 If creating a new email rather than replying, you can use any string identifier like "NEW_EMAIL"`),
			responseText: z.string().describe('Content of the reply or new email'),
			emailAddress: z.string().describe('Current user\'s email address (the sender)'),
			additionalRecipients: z.optional(z.array(z.string())).describe('Optional additional recipients to include')
		})
	}
);



// end a reply to an existing email thread or create a new email.
async function sendEmail(emailId, responseText, emailAddress, additionalRecipients) {
	try {

		const creds = getCredentials();
		const service =  google.gmail({version: 'v1', auth: creds});

		// Set up our email data with defaults
		let subject = 'Response';
		let originalFrom = 'recipient@example.com';  // Will be overridden by user input
		let threadId = null;

		// Get the origional message
		try {
			const message = await service.users.messages.get({
				userId: 'me',
				id: emailId
			});

			const headers = message.data.payload.headers;

			// Get subject with 'Re:' prefix is not present
			subject = headers.find(h => h.name === 'Subject').value;

			if (!subject.startsWith('Re:')) {
				subject = 'Re: ' + subject;
			}

			// Create a reply message
			originalFrom = headers.find(h => h.name === 'From').value;

			// Get thread ID
			threadId = message.data.threadId;
		} catch(err1) {
			logger.warn(`Could not retrieve original message with ID ${emailId}. Error: ${err1}`);
		}


		// Create a message object
		const msg = createMimeMessage();
		msg.setTo(originalFrom);
		msg.setSender(emailAddress);
		msg.setSubject(subject);
		msg.addMessage({contentType: 'text/plain', data: responseText});

		// CC any additional recipients
		if (additionalRecipients) {
			for (const recipient of additionalRecipients) {
				msg.setCc(recipient);
			}
		}
		console.log('msg: ' + JSON.stringify(msg, null, 2));
		// encode
		const raw = msg.asEncoded();
		console.log('raw: ' + JSON.stringify(raw, null, 2));
		// Set up the body
		const body = {raw: raw};

		// Add a thread if we have one
		if (threadId) {
			body.threadId = threadId;
		}

		// Send it!!
		const sentMessage = await service.users.messages.send({userId: 'me', requestBody: body});

	} catch(err) {
		logger.error(`Error sending email: ${err}`);
		return false;
	}
}
