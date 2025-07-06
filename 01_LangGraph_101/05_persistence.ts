import 'dotenv/config';
import { prettyPrint } from '../shared/utils.ts';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';

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

/////////////// Persistence ///////////////
// Instanciate the agent, this time with a checkpointer
const agent = new createReactAgent({llm: llm, tools: [writeEmail], checkpointer: new MemorySaver()});


// Now we can call the agent with an initalized message array
// This time we add a thread id to allow us to group our checkpoints together
const config = {configurable: {thread_id: '1'}};
const result1 = await agent.invoke({
	messages: [{
		role: 'user',
		content: 'What are some good practices for writing emails?',
	}]
}, config);

// Now we can take a look at the snapshot of the state
const state = await agent.getState(config);

// Check the messages in the state
for (const message of state.values.messages) {
	prettyPrint(message);
}

// Ok now let's call the agent again
const result2 = await agent.invoke({
	messages: [{
		role: 'user',
		content: 'Good, let\'s use lesson 3 to craft a response to my boss confirming that I want to attend Interrupt',
	}]
}, config);

// Finally let's tell the agent to send the message
const result3 = await agent.invoke({
	messages: [{
		role: 'user',
		content: 'I like this, let\'s write the email to boss@company.ai',
	}]
}, config);

// Check the result
for (const message of result3.messages) {
	prettyPrint(message);
}
