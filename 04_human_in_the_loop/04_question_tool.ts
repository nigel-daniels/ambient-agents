import { overallWorkflow } from './assistant.ts';
import { prettyPrint } from '../shared/utils.ts';
import { MemorySaver, Command } from '@langchain/langgraph';
import { v4 as uuid4 } from 'uuid';

let interruptObject = {};

const emailinputRespond = {
	to: 'Lance Martin <lance@company.com>',
    author: 'Partner <partner@home.com>',
    subject: 'Dinner?',
	emailThread: 'Hey, do you want italian or indian tonight?'
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
const questionResponse = 'Let\'s do indian.';

// Send our response
for await (const chunk of await graph.stream(new Command({resume: [{type: 'response', args: questionResponse}]}), threadConfig,)) {
	if ('__interrupt__' in chunk) {
		interruptObject = chunk.__interrupt__[0];
		console.log('\nINTERRUPT OBJECT:');
		console.log('Action request: ' + JSON.stringify(interruptObject.value[0].action_request, null, 2));
	}
}

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

const state = await graph.getState(threadConfig);

for (const message of state.values.messages) {
	prettyPrint(message);
}
