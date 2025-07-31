
// Formats a tool call for display using markdown
export function formatForDisplay(toolCall){
	let display = '';

	switch (toolCall.name) {
		case 'send_email_tool':
			display += `# Email Draft

			**ID**: ${toolCall.args.emailId}
			**To**: ${toolCall.args.emailAddress}
			**Subject**: ${toolCall.args.subject}
			${toolCall.args.responseText}
			`;
			break;
		case 'schedule_meeting_tool':
			display += `# Calendar Invite

			**Meeting**: ${toolCall.args.title}
			**Attendees**: ${toolCall.args.attendees.join(', ')}
			**Start**: ${toolCall.args.startTime}
			**End**: ${toolCall.args.endTime}
			`;
			break;
		case 'question':
			//Special formatting for questions to make them clear
			display += `# Question for User

			${toolCall.args.content}
			`;
		default:
			display += `# Tool Call: ${toolCall.name}

			Arguments:
			${JSON.stringify(toolCall.args, null, 2)}
			`;
			break;
	}

	return display;
}

// Format Gmails into a formated string for display
export function formatGmailMarkdown(subject, author, to, emailThread, emailId) {
	const idSection = emailId ? `\n**ID**: ${emailId}` : '';

	if (emailThread && (emailThread.trim().startsWith('<!DOCTYPE') || emailThread.trim().startsWith('<html') || emailThread.includes('<body') )) {
		emailThread = convert(emailThread, {
			wordwrap: false,
			selectors: [
				{selector: 'a', options: {ignoreHref: true}},
				{selector: 'img', format: 'skip'}
			]
		});
	}

	return `
**Subject**: ${subject}
**From**: ${author}
**To**: ${to}${idSection}

${emailThread}

---
`;
}
