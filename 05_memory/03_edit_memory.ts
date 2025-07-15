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

// Let's take a look at what is in the calendar preferences memory at this point
await displayMemoryContent(store, ['email_assistant', 'cal_preferences']);

console.log(`\nSimulating editing the ${interruptObject.value[0].action_request.action} tool call...`);
// Set up the new args
const editScheduleArgs = {
	attendees: ['pm@client.com', 'lance@company.com'],
    subject: 'Tax Planning Discussion',
	durationMinutes: 30, // Changed from 45 to 30
	preferredDay: '2025-04-22',
	startTime: 14
};

// Send an edit with the new args
for await (const chunk of await graph.stream(new Command({resume: [{type: 'edit', args: {args: editScheduleArgs}}]}), threadConfig,)) {
	if ('response_agent' in chunk) {
		prettyPrint(chunk.response_agent.messages[chunk.response_agent.messages.length-1]);
	}
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

// Let's take a look at what is in the calendar preferences memory at this point
console.log('\nChecking memory after editing schedule_meeting:');
await displayMemoryContent(store, ['email_assistant', 'cal_preferences']);

// Let's take a look at what is in the response preferences memory at this point
await displayMemoryContent(store, ['email_assistant', 'response_preferences']);

console.log(`\nSimulating user editing the ${interruptObject.value[0].action_request.action} tool call...`);
const editedEmailArgs = {
    to: 'pm@client.com',
	subject: 'Re: Tax season let\'s schedule call',
    content: 'Hello Project Manager,\n\nThank you for reaching out about tax planning. I scheduled a 30-minute call next Thursday at 3:00 PM. Would that work for you?\n\nBest regards,\nLance Martin'
};

for await (const chunk of await graph.stream(new Command({resume: [{type: 'edit', args: {args: editedEmailArgs}}]}), threadConfig,)) {
	if ('response_agent' in chunk) {
		prettyPrint(chunk.response_agent.messages[chunk.response_agent.messages.length-1]);
	}
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

// Let's take a look at what is in the response preferences memory at this point
console.log('\nChecking memory after editing write_email:');
await displayMemoryContent(store, ['email_assistant', 'response_preferences']);


// Finally let's examine the messages
const state = await graph.getState(threadConfig);

for (const message of state.values.messages) {
	prettyPrint(message);
}
