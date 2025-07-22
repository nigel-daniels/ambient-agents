import createLogger from 'logging';
import { tool } from '@langchain/core/tools';
import google from 'googleapis';
import { createMimeMessage } from 'mimetext/gas';
import { format } from 'date-fns';
import { z } from 'zod';
import { getCredentials } from './tool_utils.ts';


const logger = createLogger('Schedule Meeting Tool');


export const scheduleMeetingTool = tool((input: {attendees: [string], title: string, startTime: string, endTime: string, organizerEmail: string, timezone: string}) => {
	try {
		timezone = timezone ? timezone : 'America/Los_Angeles';

		const success = await sendCalendarInvite(attendees, title, startTime, endTime, organizerEmail, timezone);

		if (success) {
			return `Meeting '${title}' scheduled successfully from ${startTime} to ${endTime} with ${attendees.length} attendees`;
		} else {
			return 'Failed to schedule meeting';
		}

	} catch(err) {
		return `Error scheduling meeting: ${err}`;
	}
},{
	name: 'schedule_meeting_tool',
	description: 'Schedule a meeting with Google Calendar and send invites.',
	schema: z.object({
		attendees: z.string().array().describe('Email addresses of meeting attendees'),
		title: z.string().describe('Meeting title/subject'),
		startTime: z.string().describe('Meeting start time in ISO format (YYYY-MM-DDTHH:MM:SS)'),
		endTime: z.string().describe('Meeting end time in ISO format (YYYY-MM-DDTHH:MM:SS)'),
		organizerEmail: z.string().describe('Email address of the meeting organizer'),
		timezone: z.optional().string().describe('Timezone for the meeting (default: America/Los_Angeles)')
	})
});


// Schedule a meeting with Google Calendar and send invites.
async function sendCalendarInvite(attendees, title, startTime, endTime, organizerEmail, timezone) {
	try {
		const creds = getCredentials();
		const service =  google.calendar({version: 'v3', creds});

		// Set up the event
		let event = {
			'summary': title,
			'start': {
				'dateTime': startTime,
				'timeZone': timezone,
			},
			'end': {
				'dateTime': endTime,
				'timeZone': timezone,
			},
			'attendees': attendees.map(email => ({ email })),
			'organizer': {
				'email': organizerEmail,
				'self': true,
			},
			'reminders': {
				'useDefault': true,
			},
			'sendUpdates': 'all',  // Send email notifications to attendees
		};

		// Create the event
		event = await service.evemts.insert({calendarId: 'primary', body: event});

		logger.info(`Meeting created ${event.htmlLink}`);
		return true;
	} catch (err) {
		logger.error(`Error scheduling meeting: ${err}`);
		return false;
	}
}
