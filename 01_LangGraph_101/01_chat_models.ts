import { ChatOpenAI } from '@langchain/openai';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/////////////// Set up (don't comment these out) ///////////////
// this is used to display md on the terminal nicely
marked.use(markedTerminal());

// Make sure your OPENAI_API_KEY is exported into your environment
// Here we use open AI but there are many other models we could use
const llm = new ChatOpenAI({model: 'gpt-4.1', temperature: 0});

/////////////// Running the Model ///////////////
// Just run this to check we get valid responses then comment this section out
// We can use the standardized interfaces of invoke() or stream()
const result1 = await llm.invoke('What is an agent?');
console.log(result1);

console.log(marked(result1.content));


/////////////// Tools ///////////////
/*
// In JS we can define our own tools and use a zod schema to describe the input to it
// LangChain is also compatible with MCP
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
// As this is Java script the type would just be an object

// Calling Tools
// Note the only arg that JS supports is strict tool calling
const modelWithTools = llm.bindTools([writeEmail]);

const output1 = await modelWithTools.invoke('Draft a response to my boss (boss@company.ai) about tomorrow\'s meeting, let him know I\'ll be there.');

console.log(output1);

const args = output1.tool_calls[0]['args'];

console.log(args);

const result2 = await writeEmail.invoke(args);
console.log(marked(result2));
*/
