import { StateGraph } from '@langchain/langgraph';
import terminalImage from 'terminal-image';

/* Format messages nicely */
export function prettyPrint(message) {
	switch (message.getType()) {
		case 'human':
			console.log('============ Human Message ============');
			console.log(message.content);
			break;
		case 'ai':
			console.log('============= AI Message ==============');
			if (message.tool_calls) {
				for (const toolCall of message.tool_calls) {
					console.log(`Tool Calls:
  ${toolCall.name} (${toolCall.id})
    Call ID: ${toolCall.id}
    Args:
	 ${JSON.stringify(toolCall.args, null, 4)}
`);
				}
			}
			break;
		case 'tool':
			console.log('============ Human Message ============');
			console.log(message.content);
			break;
		default:
			console.log('============ ' + message.getType() + ' Message ============');
			console.log(message.content);
			break;
	}
	console.log('');
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

function toSentenceCase(str){
    return str.toLowerCase().charAt(0).toUpperCase() + str.slice(1);;
}
