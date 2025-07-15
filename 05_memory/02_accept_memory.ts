import { overallWorkflow } from './assistant.ts';
import { prettyPrint, displayMemoryContent } from '../shared/utils.ts';
import { MemorySaver, Command, InMemoryStore } from '@langchain/langgraph';
import { v4 as uuid4 } from 'uuid';

let interruptObject = {};

// Here is our test email
const emailinputRespond = {
    author: 'Project Manager <pm@client.com>',
    to: 'Lance Martin <lance@company.com>',
	subject: 'Tax season let\'s schedule call',
	emailThread: `Lance,

It's tax season again, and I wanted to schedule a call to discuss your tax planning strategies for this year. I have some suggestions that could potentially save you money.

Are you available sometime next week? Tuesday or Thursday afternoon would work best for me, for about 45 minutes.

Regards,
Project Manager`
};

// Now let's set up the graph
const checkpointer = new MemorySaver();
const store = new InMemoryStore();

const graph = overallWorkflow.compile({checkpointer: checkpointer, store: store});

// Set up a thread
const threadId = uuid4();
const threadConfig = {configurable: {thread_id: threadId}};

// Run this to the first interrupt where the triage is 'respond'
// and there are 'schedule_meeting' and 'write_email' tool calls.
console.log('Running the graph until the first interrupt...');
for await (const chunk of await graph.stream({emailInput: emailinputRespond}, threadConfig)) {
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

// Let's take a look at what is in the memory at this point
await displayMemoryContent(store);

// Now we 'accept' the schedule meeting call
console.log(`\nSimulating user accepting the ${interruptObject.value[0].action_request.action} tool call...`);
for await (const chunk of await graph.stream(new Command({resume: [{type: 'accept'}]}), threadConfig,)) {
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

// We also 'accept' the write email call
console.log(`\nSimulating user accepting the ${interruptObject.value[0].action_request.action} tool call...`);
for await (const chunk of await graph.stream(new Command({resume: [{type: 'accept'}]}), threadConfig,)) {
	if ('response_agent' in chunk) {
		prettyPrint(chunk.response_agent.messages[chunk.response_agent.messages.length-1]);
	}
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

// Now we can compare the memory with what we first saw

await displayMemoryContent(store);

// Finally let's examine the messages
const state = await graph.getState(threadConfig);

for (const message of state.values.messages) {
	prettyPrint(message);
}
