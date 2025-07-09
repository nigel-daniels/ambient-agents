import { StateGraph } from '@langchain/langgraph';
import terminalImage from 'terminal-image';

/* Format messages nicely */
export function prettyPrint(message) {
	console.log(messageFormat(message));
}

/*
Prints a version of the graph to the console, it may be better to save to a file!
*/
export function showGraph(graph, xray = false) {
	const drawable = graph.getGraphAsync({xray: xray});
	drawable.then(async (drawableGraph) =>{
		const graphImg = await drawableGraph.drawMermaidPng();
		const graphImgBuffer = await graphImg.arrayBuffer();
		console.log(await terminalImage.buffer(new Uint8Array(graphImgBuffer)));
	});
}

/*
Format email details into a nicely formatted markdown string for display
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

// Format messages into a single string for analysis.
export function formatMessagesString(messages) {
	let result = '';

	for (const message of messages) {
		result += messageFormat(message);
	}

	return result;
};

// Extract tool call names from messages, safely handling messages without tool_calls.
export function extractToolCalls (messages) {
	let result = [];

	for (const message of messages) {
		if (typeof message === 'object' && message !== null) {
	        if (Array.isArray(message.tool_calls)) {
	            result.push(...message.tool_calls.map(call => call.name.toLowerCase()));
	        } else if ('tool_calls' in message) {
	            result.push(...message.tool_calls.map(call => call.name.toLowerCase()));
	        }
	    }
	};

	return result;
};


function messageFormat(message) {
	let result = '';

	switch (message.getType()) {
		case 'human':
			result += '============ Human Message ============\n';
			result += message.content;
			result += '\n';
			break;
		case 'ai':
			result += '============= AI Message ==============\n';
			if (message.tool_calls) {
				for (const toolCall of message.tool_calls) {
					result += `Tool Calls:
  ${toolCall.name} (${toolCall.id})
    Call ID: ${toolCall.id}
    Args:
	${JSON.stringify(toolCall.args, null, 4).replace(/\\r/g, '\r').replace(/\\n/g, '\n')}
`;
				}
			}
			break;
		case 'tool':
			result += '============ Tool Message ============\n';
			result += message.content;
			result += '\n';
			break;
		default:
			result += '============ ' + message.getType() + ' Message ============\n';
			result += message.content;
			result += '\n';
			break;
	}
	result += '\n';

	return result;
};
