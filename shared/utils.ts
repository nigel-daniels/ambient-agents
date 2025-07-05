/*
Format email details into a nicely formatted markdown string for display

Args:
	subject: Email subject
	author: Email sender
	to: Email recipient
	emailThread: Email content
	emailId: Optional email ID (for Gmail API)
*/
export function formatEmailMarkdown(subject, author, to, emailThread, emailId = '') {
	const idSection = '\n**ID**: ' + emailId ? emailId : '';

	return `
	**Subject**: ${subject}
	**From**: ${author}
	**To**: ${to}${idSection}

	${emailThread}

	---
	`;
};
