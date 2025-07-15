import 'dotenv/config';
import { prettyPrint, showGraph, formatEmailMarkdown } from '../shared/utils.ts';
import { TRIAGE_SYSTEM_PROMPT, DEFAULT_BACKGROUND, DEFAULT_TRIAGE_INSTRUCTIONS,
	TRIAGE_USER_PROMPT, AGENT_SYSTEM_PROMPT, AGENT_TOOLS_PROMPT,
	DEFAULT_RESPONSE_PREFERENCES, DEFAULT_CAL_PREFERENCES } from '../shared/prompts.ts';
import { writeEmail, scheduleMeeting, checkCalendarAvailability, done } from '../shared/tools.ts';
import { state, routerSchema } from '../shared/schemas.ts';
import format from 'string-template';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { StateGraph, START, END, Command } from '@langchain/langgraph';

//////////// LLMs ////////////
const llmNode = new ChatOpenAI({model: 'gpt-4.1', temperature: 0});
const llmAgent = new ChatOpenAI({model: 'gpt-4.1', temperature: 0});

// First let's set up the tools lists
const tools = [writeEmail, scheduleMeeting, checkCalendarAvailability, done];
const toolsByName = tools.reduce((acc, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {});

// Now we can define our routing LLM and provide it with our strutured output schema
// This should coerce the output to match the schema
const llmRouter = llmNode.withStructuredOutput(routerSchema, {name: 'route'});
// Now we set up a new LLM this one with the tools and no response schema
const llmWithTools = llmAgent.bindTools(tools, {tool_choice: 'any'});



//////////// Node and Command ////////////

// Now we can build our router node
async function triageRouter(state: state) {
	// Data for the Command object we return
	let goto = '';
	let update = {};

	// Set up the systemPrompt with the defaults
	const systemPrompt = format(TRIAGE_SYSTEM_PROMPT,{
		background: DEFAULT_BACKGROUND,
		triageInstructions: DEFAULT_TRIAGE_INSTRUCTIONS
	});

	// Destructure the emailInput and set up the user prompt
	const {author, to, subject, emailThread} = state.emailInput;
	const userPrompt = format(TRIAGE_USER_PROMPT,{
		author: author,
		to: to,
		subject: subject,
		emailThread: emailThread
	});

	// Now were good to call the LLM and get the routing decision
	const result = await llmRouter.invoke([
		{role: 'system', content: systemPrompt},
		{role: 'user', content: userPrompt}
	]);

	// Build up the command data based on the response
	switch (result.classification) {
		case 'respond':
			console.log('📧 Classification: RESPOND - This email requires a response');
			goto = 'response_agent';
			update = {
				classificationDecision: result.classification,
				messages: [{
					role: 'user',
					content: 'Respond to the email: \n\n' + formatEmailMarkdown(subject, author, to, emailThread)
				}]
			};
			break;
		case 'ignore':
			console.log('🚫 Classification: IGNORE - This email can be safely ignored');
			goto = END;
			update = {
				classificationDecision: result.classification
			};
			break;
		case 'notify':
			console.log('🔔 Classification: NOTIFY - This email contains important information');
			// For now we end but this will be update later!
			goto = END;
			update = {
				classificationDecision: result.classification
			};
			break;
		default:
			throw new Error('Invalid classification: ' + result.classification);
			break;
	}
	// Now return a command telling us where we go next and update the state.
	return new Command({
		goto: goto,
		update: update
	});
}



//////////// AGENT ////////////
// NB we could have used the createReactAgent for this, but this breaks it down for us.

// LLM Node
async function llmCall(state: state) {
	const systemPrompt = format(AGENT_SYSTEM_PROMPT, {
		toolsPrompt: AGENT_TOOLS_PROMPT,
		date: new Date().toISOString().split('T')[0],
		background: DEFAULT_BACKGROUND,
		responsePreferences: DEFAULT_RESPONSE_PREFERENCES,
		calPreferences: DEFAULT_CAL_PREFERENCES
	});

	const result = await llmWithTools.invoke([{
		role: 'system',
		content: systemPrompt
	},
	...state.messages
	]);

	return {messages: result};
}

// Tool handeling node
async function toolHandler(state: state) {
	// tool messages list
	const result = [];

	// Go thru the tool calls
	for (const toolCall of state.messages[state.messages.length-1].tool_calls) {
		// get the tool
		const tool = toolsByName[toolCall.name];
		// use it
		const observation = await tool.invoke(toolCall.args);
		// add the result as a message
		result.push({role: 'tool', content: observation, tool_call_id: toolCall.id});
	}

	return {messages: result};
}

// Conditional Edges
async function shouldContinue(state: state) {
	let result = null;
	// get the last message
	const lastMessage = state.messages[state.messages.length-1];
	// See if we're done
	if (lastMessage.tool_calls) {
		for (const toolCall of lastMessage.tool_calls) {
			if (toolCall.name == 'Done') {
				result = END;
			} else {
				result = 'tool_handler';
			}
		}
	}

	return result;
}

// Build the Agent Graph
const agent = new StateGraph(state)
	.addNode('llm_call', llmCall)
	.addNode('tool_handler', toolHandler)
	.addEdge(START, 'llm_call')
	.addConditionalEdges('llm_call', shouldContinue, {'tool_handler': 'tool_handler', '__end__': END}) // I had to use '__end__', END failed to match?
	.addEdge('tool_handler', 'llm_call')
	.compile();



//////////// Assistant ////////////
// Compose the router and the agent together
// Note that in JS we need to specify how the router ends
const overallWorkflow = new StateGraph(state)
	.addNode('triage_router', triageRouter, {
		ends: ['response_agent', END]
	})
	.addNode('response_agent', agent)
	.addEdge(START, 'triage_router');

const emailAssistant = overallWorkflow.compile();

//////////// Local Tests ////////////
// Comment these in to run this locally or comment them out to use LangSmith
showGraph(emailAssistant, true);

const emailInput1 = {
	author: 'System Admin <sysadmin@company.com>',
	to: 'Development Team <dev@company.com>',
	subject: 'Scheduled maintenance - database downtime',
	emailThread: 'Hi team,\n\nThis is a reminder that we\'ll be performing scheduled maintenance on the production database tonight from 2AM to 4AM EST. During this time, all database services will be unavailable.\n\nPlease plan your work accordingly and ensure no critical deployments are scheduled during this window.\n\nThanks,\nSystem Admin Team'
};

const response1 = await emailAssistant.invoke({emailInput: emailInput1});

// Let's view the results (sorry no pretty_print in JS)
for (const message of response1.messages) {
	prettyPrint(message);
}

const emailInput2 = {
	author: 'Alice Smith <alice.smith@company.com>',
	to: 'John Doe <john.doe@company.com>',
	subject: 'Quick question about API documentation',
	emailThread: 'Hi John,\nI was reviewing the API documentation for the new authentication service and noticed a few endpoints seem to be missing from the specs. Could you help clarify if this was intentional or if we should update the docs?\nSpecifically, I\'m looking at:\n- /auth/refresh\n- /auth/validate\nThanks!\nAlice'
};

const response2 = await emailAssistant.invoke({emailInput: emailInput2});

// Let's view the results (sorry no pretty_print in JS)
for (const message of response2.messages) {
	prettyPrint(message);
}
