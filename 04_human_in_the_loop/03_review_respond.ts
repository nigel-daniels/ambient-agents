import { overallWorkflow } from './assistant.ts';
import { prettyPrint } from '../shared/utils.ts';
import { MemorySaver, Command } from '@langchain/langgraph';
import { v4 as uuid4 } from 'uuid';

let interruptObject = {};

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

const checkpointer = new MemorySaver();
const graph = overallWorkflow.compile({checkpointer: checkpointer});
const threadId = uuid4();
const threadConfig = {configurable: {thread_id: threadId}};

console.log('Running the graph until the first interrupt...');
for await (const chunk of await graph.stream({emailInput: emailinputRespond}, threadConfig)) {
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

console.log(`\nSimulating responding to the ${interruptObject.value[0].action_request.action} tool call...`);
// Set up the new args
const scheduleResponse = 'Please schedule this for 30 minutes instead of 45 minutes, and I prefer afternoon meetings after 2pm.';

// Send our response
for await (const chunk of await graph.stream(new Command({resume: [{type: 'response', args: scheduleResponse}]}), threadConfig,)) {
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

console.log(`\nSimulating user accepting the ${interruptObject.value[0].action_request.action} tool call...`);
for await (const chunk of await graph.stream(new Command({resume: [{type: 'accept'}]}), threadConfig,)) {
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

console.log(`\nSimulating user responding to ${interruptObject.value[0].action_request.action} tool call...`);
const emailResponse = 'Shorter and less formal. Include a closing statement about looking forward to the meeting!';

for await (const chunk of await graph.stream(new Command({resume: [{type: 'response', args: emailResponse}]}), threadConfig,)) {
	if ('response_agent' in chunk) {
		prettyPrint(chunk.response_agent.messages[chunk.response_agent.messages.length-1]);
	}
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

console.log(`\nSimulating user accepting the ${interruptObject.value[0].action_request.action} tool call...`);
for await (const chunk of await graph.stream(new Command({resume: [{type: 'accept'}]}), threadConfig,)) {
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

const state = await graph.getState(threadConfig);

for (const message of state.values.messages) {
	prettyPrint(message);
}
