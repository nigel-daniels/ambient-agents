import createLogger from 'logging';
import { tool } from '@langchain/core/tools';
import { google } from 'googleapis';
import { createMimeMessage } from 'mimetext/gas';
import { format } from 'date-fns';
import { z } from 'zod';
import { getCredentials } from './tool_utils.ts';


const logger = createLogger('Check Calendar Tool');


export const checkCalendarTool = await tool(async (input: {dates: [string]}) => {
	try {
		const events = await getCalendarEvents(input.dates);

		return events;
	} catch(err) {
		return `Failed to check calendar: ${err}`;
	}
},{
	name: 'check_calendar_tool',
	description: 'Check Google Calendar for events on specified dates.',
	schema: z.object({
		dates: z.string().array().describe('List of dates to check in DD-MM-YYYY format')
	})
});

// Check Google Calendar for events on specified dates.
async function getCalendarEvents(dates) {
	try {
		// Set up the google service
		const creds = getCredentials();
		const service =  google.calendar({version: 'v3', auth: creds});

		const result = 'Calendar events:\n\n';

		for (dateStr of dates) {
			// Parse the date we got
			const [day, month, year] = dateStrsplit('-');

			// Set up our start and end of the day
			const startTime = `${year}-${month}-${day}T00:00:00Z`;
			const endTime = `${year}-${month}-${day}T23:59:59Z`;

			// Call the calendar API
			const eventResult = await service.events.list({
				calendarId: 'primary',
				timeMin: startTime,
				timeMax: endTime,
				singleEvents: true,
				orderBy: 'startTime'
			});

			const events = eventResult.items ? eventResult.items : [];

			// If the day is clear update the result and carry on
			if (events.length == 0) {
				result += '  No events found for this day\n';
				result += '  Available all day\n\n';
				continue;
			}

			// There were some events so let's process them
			const busySlots = [];

			for (const event of events) {
				const start = event.start.dateTime ?? event.start.date;
				const end = event.end.dateTime ?? event.end.date;

				// Convert to dates
				if (start.includes('T')) {
					const startDt = new Date(start);
					const endDt = new Date(end);

					// Format for display
					const startDisplay = format(startDt, 'hh:mm a');
					const endDisplay = format(endDt, 'hh:mm a');

					result += `  - ${startDisplay} - ${endDisplay}: ${event.summary}\n`;
					busySlots.push([startDt, endDt]);
				} else {
					// Must be an all day event
					result += `  - All day: ${event.summary}\n`;
					busySlots.push(['all-day', 'all-day']);
				}
			}

			// Now we can calculate available slots
			if (busySlots.map(slot => slot[0]).includes('all-day')) {
				result += '  Available: No availability (all-day events)\n\n';
			} else {
				// Sort the time slots
				busySlots.sort((a, b) => a[0] - b[0]);

				// NOTE here we are assuming working hrs are 9:00 - 17:00
				// For a production system this should be configurable
				const workStart = new Date(`${year}-${month}-${day}T09:00:00`);
				const workEnd = new Date(`${year}-${month}-${day}T17:00:00`);

				// calculate the available slots
				const availableSlots = [];
				let current = workStart;

				for (const [start, end] of busySlots) {
  					if (current < start) {
    					availableSlots.push([current, start]);
  					}
  					current = current > end ? current : end; // equivalent to max(current, end)
				}

				if (current < workEnd) {
					availableSlots.push([current, start]);
				}

				// Format the slots
				if (availableSlots) {
					result += '  Available: ';

					availableSlots.forEach(([start, end], index) => {
						const startDisplay = format(start, 'hh:mm a');
						const endDisplay = format(end, 'hh:mm a');

						result += `${startDisplay} - ${endDisplay}`;

						if (index < availableSlots.length-1) {
							result += ', ';
						}
					});

					result += '\n\n';
				} else {
					result += '  Available: No availability during working hours\n\n';
				}
			}
		}

		return result;
	} catch (err) {
		logger.error(`Error checking calendar: ${err}`);

		const result = `Calendar events (mock due to error):\n\n`;

		for (date of dates) {
			result += `Events for ${date}:\n`;
			result += '  - 9:00 AM - 10:00 AM: Team Meeting\n'
            result += '  - 2:00 PM - 3:00 PM: Project Review\n'
            result += 'Available slots: 10:00 AM - 2:00 PM, after 3:00 PM\n\n'
		}

		return result;
	}
}
