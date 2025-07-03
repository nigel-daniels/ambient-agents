import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";

/////////////// Setup ///////////////
// Let's set up a model that can do something for us
const llm = new ChatOpenAI({model: 'gpt-4.1', temperature: 0});

// Now let's set up an 'email' sending tool (used in a node)
const writeEmail = tool((input) => {
	// Note this is a placeholder, in reality we would send an email.
	return `Email sent to ${input.to} with subject ${input.subject} and content: ${input.content}`;
}, {
	name: 'write_email',
	description: 'Write and send an email.',
	schema: z.object({
		to: z.string().describe('The email address of the recipient.'),
		subject: z.string().describe('A title describing the email\'s subject.'),
		content: z.string().describe('The full text of the email.')
	})
});

// Finally let's bind the tool we just defined to an LLM (also used in a node)
const modelWithTools = llm.bindTools([writeEmail]);

/////////////// Nodes ///////////////
// This node interacts with the LLM
async function callLLM(state: MessagesAnnotation) {
	// Call the LLM with knowledge of the write email tool
	const output = await modelWithTools.invoke(state.messages);

	return {messages: output};
}

// This node runs the tool the LLM selected
async function runTool(state: MessagesAnnotation) {
	let result = [];

	// Make a tool Call based on the previous message
	for (const toolCall of state.messages[state.messages.length-1].tool_calls) {
		const observation = writeEmail.invoke(toolCall.args);
		result.push({role: 'tool', content: observation, tool_call_id: toolCall.id});
	}

	return {messages: result}
}

/////////////// Edges ///////////////
// This edge is where we decide if we call a tool or finish
function shouldContinue(state: MessagesAnnotation) {
	let result = null;

	// Get the previous message
	const messages = state.messages;
	const lastMessage = messages[messages.length-1];

	// If the last message is a tool call we're done
	if (lastMessage.tool_calls) {
		result = 'run_tool';
	} else {
		result = END;
	}

	return result;
}

/////////////// Graph ///////////////
// Here we export the app so that the build can find it, note that app was the name we used in the langraph.json
export const app = new StateGraph(MessagesAnnotation)
	.addNode('call_llm', callLLM)
	.addNode('run_tool', runTool)
	.addEdge(START, 'call_llm')
	.addConditionalEdges('call_llm', shouldContinue, {'run_tool': 'run_tool', END: END})
	.addEdge('run_tool', END)
	.compile();
