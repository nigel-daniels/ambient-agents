import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

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


/////////////// LangGraph ///////////////
// This builds a very basic workflow that replicates what we did with the chat model:
//     START -> write_email_node -> END

// Here we are creating the state for our LangGraph workflow, this holds the data we need to track
// In JS we use Annotations and define our schema
const StateSchema = Annotation.Root({
	request: Annotation<string>,
	email: Annotation<string>
});

// Now let's creat the basic workflow, currently it cannot do anything but it knows about state
const workflow = new StateGraph(StateSchema);

// It is nodes that perform the actions for us by interacting with and updating the state
workflow.addNode('write_email_node', writeEmailNode); // See below

// It's edges that connect our nodes together and let us traverse this directed graph
workflow.addEdge(START, 'write_email_node');
workflow.addEdge('write_email_node', END);

// Here we build the workflow
const app = workflow.compile();

// Now we can call the workflow, this will overwrite the request key, to get the result
const result = await app.invoke({request: 'Draft a response to my boss (boss@company.ai) about tomorrow\'s meeting, let him know I\'ll be there.'});
console.log(result);


/////////////// Node ///////////////
// Note here is where we recieve the current state
async function writeEmailNode(state: StateSchema) {
	// Call the LLM with knowledge of the write email tool
	const output = await modelWithTools.invoke(state.request);
	// Extract the tool call parameters
	const args = output.tool_calls[0]['args'];
	// now call our tool
	const email = await writeEmail.invoke(args);
	// now return our update to the state, this will overwrite the email key
	return {email: email};
}
