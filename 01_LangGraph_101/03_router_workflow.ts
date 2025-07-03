import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import terminalImage from 'terminal-image';

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

// Finnaly let's bind the tool we just defined to an LLM (also used in a node)
const modelWithTools = llm.bindTools([writeEmail]);


/////////////// Routing Workflow ///////////////
// This workflow has a conditional edge right after we call the llm, here we decide
// if we are going to run the tool or if we simple end:
//     START -> call_llm -> END
//                    \     /
//                    run_tool

// Note we don't define a schema here as we're using the built in MessagesAnnotation
// This essentially builds an array of messages for us and appends new messages as we go

// Now let's creat the basic workflow, currently it cannot do anything but it knows about state
const routeWorkflow = new StateGraph(MessagesAnnotation);

// It is nodes that perform the actions for us by interacting with and updating the state
routeWorkflow.addNode('call_llm', callLLM); // See below
routeWorkflow.addNode('run_tool', runTool);

// It's edges that connect our nodes together and let us traverse this directed graph
routeWorkflow.addEdge(START, 'call_llm');
routeWorkflow.addConditionalEdges('call_llm', shouldContinue, {'run_tool': 'run_tool', END: END});
routeWorkflow.addEdge('run_tool', END);

// Here we build the workflow
const app = routeWorkflow.compile();

// Let's have a go at visualizing the graph
const graphImg = await app.getGraph().drawMermaidPng();
const graphImgBuffer = await graphImg.arrayBuffer();
console.log(await terminalImage.buffer(new Uint8Array(graphImgBuffer)));

// Now we can call the workflow to get the result
const result = await app.invoke({messages: 'Draft a response to my boss (boss@company.ai) about tomorrow\'s meeting, let him know I\'ll be there.'});

// Let's view the results (sorry no pretty_print in JS)
for (const message of result.messages) {
	console.log(message);
}





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
