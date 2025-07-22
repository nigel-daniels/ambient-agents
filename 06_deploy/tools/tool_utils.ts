import createLogger from 'logging';
import path from 'node:path';
import fs from 'node:fs';
import { tool } from '@langchain/core/tools';
import google from 'googleapis';
import { z } from 'zod';

const ROOT = __dirname.split(path.sep).pop();
const SECRETS_DIR = ROOT + '/.secrets';

const logger = createLogger('Gmail Shared Tools');


export async function markAsRead(messageId) {
	const creds = getCredentials();
	const service =  google.gmail({version: 'v1', creds});

	await service.users.messages.modify({userId: 'me', id: messageId, body: {removeLabelIds: ['UNREAD']}});
}

/*
Get Gmail API credentials from token.json or environment variables.

This function attempts to load credentials from multiple sources in this order:
1. Directly passed gmail_token and gmail_secret parameters
2. Environment variables GMAIL_TOKEN
3. Local files at token_path (.secrets/token.json)
*/
export function getCredentials(gmailToken = null) {
	const tokenPath = SECRETS_DIR + '/token.json';
	let tokenData = null;

	// Try and get the token
	if (gmailToken) {
		// Use the token passed in if there is one
		try {
			tokenData = typeof gmailToken === 'string' ? JSON.parse(gmailToken) : gmailToken;
			logger.info('Using directly provided gmailToken parameter.');
		} catch (err) {
			logger.warn(`Could not parse provided gmail_token: ${err}`);
		}
	}

	if (!tokenData) {
		// Is there an environment variable
		if(process.env.GMAIL_TOKEN) {
			try {
				tokenData = JSON.parse(process.env.GMAIL_TOKEN);
				logger.info('Using GMAIL_TOKEN environment variable.');
			} catch (err) {
				logger.warn(`Could not parse GMAIL_TOKEN environment variable: ${err}`);
			}
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
