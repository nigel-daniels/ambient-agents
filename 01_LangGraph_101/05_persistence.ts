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
const result = await agent.invoke({
	messages: [{
		role: 'user',
		content: 'Draft a response to my boss (boss@company.ai) about tomorrow\'s meeting, let him know I\'ll be there.'
	}]
});

// Check the result
for (const message of result.messages) {
	console.log(message);
}
