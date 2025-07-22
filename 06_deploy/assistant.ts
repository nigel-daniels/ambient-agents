import 'dotenv/config';

import { ChatOpenAI } from '@langchain/openai';

import { StateGraph, START, END, Command, LangGraphRunnableConfig, interrupt } from '@langchain/langgraph';

import { fetchEmailsTool, sendEmailTool, checkCalendarTool, scheduleMeetingTool, question, done, markAsRead } from './tools';
import { TRIAGE_SYSTEM_PROMPT, TRIAGE_USER_PROMPT, AGENT_SYSTEM_PROMPT,
	DEFAULT_TRIAGE_INSTRUCTIONS, DEFAULT_BACKGROUND, DEFAULT_RESPONSE_PREFERENCES,
	DEFAULT_CAL_PREFERENCES, MEMORY_UPDATE_INSTRUCTIONS,
	MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT, TOOLS_PROMPT } from './prompts.ts';
import { state, routerSchema, userPreferencesSchema } from '../shared/schemas.ts';
import { formatForDisplay, formatGmailMarkdown } from '../shared/utils.ts';

import format from 'string-template';


//////////// LLMs ////////////
const llmNode = new ChatOpenAI({model: 'gpt-4.1', temperature: 0});
const llmAgent = new ChatOpenAI({model: 'gpt-4.1', temperature: 0});
const llmMemory = new ChatOpenAI({model: 'gpt-4.1', temperature: 0}); // Memory Note: Added for use in the memory updater

// First let's set up the tools lists
const tools = [fetchEmailsTool, sendEmailTool, scheduleMeetingTool, checkCalendarAvailability, question, done];
const toolsByName = tools.reduce((acc, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {});

// Now we can define our routing LLM and provide it with our strutured output schema
// This should coerce the output to match the schema
const llmRouter = llmNode.withStructuredOutput(routerSchema, {name: 'route'});
// Now we set up a new LLM this one with the tools and no response schema
const llmWithTools = llmAgent.bindTools(tools, {tool_choice: 'any'});
// Now use an LLM to update the memory
const llm = llmMemory.withStructuredOutput(userPreferencesSchema);



///////////// Memory store /////////////
// Now let's create some helper functions for the store management

// Accepts a store, and namespace ('email_assistant', 'triage_preferences')
// and optionally default content to return, it returns the memory requested or the default
async function getMemory(store, namespace, defaultContent = null) {
	let memory = null;

	// Check for an existing memory based on namespce and key
	let userPreferences = await store.get(namespace, 'user_preferences');

	if (userPreferences) {
		// If we got a memory get it's content
		memory = userPreferences.value;
	} else {
		// otherwise store the new memory and get that
		await store.put(namespace, 'user_preferences', defaultContent);
		memory = defaultContent;
	}
	// return the memory we found or got
	return memory;
}

// Accepts a store, namespace and the messages making up the memory
async function updateMemory(store, namespace, messages) {
	// Get the requested memory
	let userPreferences = await store.get(namespace, 'user_preferences');

	const result = await llm.invoke([
			{role: 'system', content: format(MEMORY_UPDATE_INSTRUCTIONS, {namespace: namespace, currentProfile: userPreferences.value})},
			...messages
	]);

	await store.put(namespace, 'user_preferences', result.userPreferences);
}



//////////// Node and Command ////////////

// Now we can build our router node (Memory Note: now it is passed the store)
async function triageRouter(state: state, config: LangGraphRunnableConfig) {
	// Data for the Command object we return
	let goto = '';
	let update = {};

	// Destructure the emailInput and set up the user prompt
	const { author, to, subject, emailThread, emailId } = state.emailInput;
	const userPrompt = format(TRIAGE_USER_PROMPT,{
		author: author,
		to: to,
		subject: subject,
		emailThread: emailThread
	});

	// Get the email MD for the agent inbox
	const emailMarkdown = formatGmailMarkdown( subject, author, to, emailThread, emailId );

	// Memory Note: Now we check the store for updated triage instructions
	// Check the store for the triage instructions
	const store = config.store;
	const triageInstructions = await getMemory(store, ['email_assistant', 'triage_preferences'], DEFAULT_TRIAGE_INSTRUCTIONS);

	// Set up the systemPrompt with the defaults
	const systemPrompt = format(TRIAGE_SYSTEM_PROMPT,{
		background: DEFAULT_BACKGROUND,
		triageInstructions: triageInstructions
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
			goto = 'triage_interrupt_handler';
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


// A node to handle interrupts from the triage step
async function triageInterruptHandler(state: state, config: LangGraphRunnableConfig) {
	// Data for the Command object we return
	let goto = '';
	let update = {};

	const store = config.store;

	// destructure the email input and format to markdown
	const {author, to, subject, emailThread, emailId} = state.emailInput;
	const emailMarkdown = formatGmailMarkdown(author, to, subject, emailThread, emailId);

	// Construct a message
	const messages = [{
		role: 'user',
		content: `Email to notify user about: ${emailMarkdown}`
	}];

	// Now create the interrupt, the proprty names are defined by Agent Inbox
	const request = {
		action_request: {
			action: `Email Assistant: ${state.classificationDescision}`,
			args: {}
		},
		// Options to render in Agent Inbox
		config: {
			allow_ignore: true,
			allow_respond: true,
			allow_edit: false,
			allow_accept: false
        },
		// Email to show in Agent Inbox
		description: emailMarkdown
	};

	// Agent Inbox returns a Record with a single key `type` that can be `accept`, `edit`, `ignore`, or `response`.
	const response = interrupt([request])[0];

	// If user provides feedback, go to response agent and use feedback to respond to email
	switch (response.type) {
		case 'response':
			// Add the user feedback to the messages
			const userInput = response.args;
			// Add the message
			messages.push({
				role: 'user',
				content: `User wants to reply to the email. Use this feedback to respond: ${userInput}`
			});
			// Memory Note: update the memory with this feedback
			await updateMemory(store, ['email_assistant', 'triage_preferences'], [
				{role: 'user', content: 'The user decided to respond to the email, so update the triage preferences to capture this.'},
				...messages
			]);
			// Route to the response agent
			goto = 'response_agent';
			break;
		case 'ignore':
			messages.push({
				role: 'user',
				content: 'The user decided to ignore the email even though it was classified as notify. Update triage preferences to capture this.'
			});
			await updateMemory(store, ['email_assistant', 'triage_preferences'], messages);
			// User wants to ignore this so end
			goto = END;
			break;
		default:
			// In case we get an unexpected type
			throw new Error(`Invalid response: ${JSON.stringify(response, null, 2)}`);
			break;
	}

	// Put the messages in the update
	update = {messages: messages};

	// Now return a command telling us where we go next and update the state.
	return new Command({ goto: goto, update: update });
}



//////////// AGENT ////////////

// LLM Node
async function llmCall(state: state, config: LangGraphRunnableConfig) {
	const store = config.store;
	// Memory Note: Now we check the store for user preferences
	// Check the store for calendar preferences
	const calPreferences = await getMemory(store, ['email_assistant', 'cal_preferences'], DEFAULT_CAL_PREFERENCES);
	// Check the store for response preferences
	const responsePreferences = await getMemory(store, ['email_assistant', 'response_preferences'], DEFAULT_RESPONSE_PREFERENCES);


	const systemPrompt = format(AGENT_SYSTEM_PROMPT, {
		toolsPrompt: TOOLS_PROMPT,
		background: DEFAULT_BACKGROUND,
		responsePreferences: responsePreferences,
		calPreferences: calPreferences
	});

	const result = await llmWithTools.invoke([{
		role: 'system',
		content: systemPrompt
	},
	...state.messages
	]);

	return {messages: result};
}


// Handle the response based on type for different tools  (Memory Note: now it is passed the store)
async function interruptHandler(state: state, config: LangGraphRunnableConfig) {
	const store = config.store;

	// Store the messages
	const result =[];

	// Default to goto the llmCall node next
	let goto = 'llm_call';

	// Go thru the tool calls
	for (const toolCall of state.messages[state.messages.length-1].tool_calls) {
		// Allowed HITL tools
		const hitlTools = ['send_email_tool', 'schedule_meeting_tool', 'question'];

		// Let's see if the tool call is an HITL tool?
		if (hitlTools.includes(toolCall.name)) {
			// SETUP of the interrupt
			// Get the email input
			const {author, to, subject, emailThread, emailId} = state.emailInput;
			const originalEmailMarkdown = formatGmailMarkdown(author, to, subject, emailThread, emailId);
			// Format the tool call for display
			const toolDisplay = formatForDisplay(toolCall);
			// Create the description
			const description = originalEmailMarkdown + toolDisplay;

			// Now lets configure the Agent inbox rendering based on the tool
			let config = {};
			switch (toolCall.name) {
				case 'send_email_tool':
					config = {
						allow_ignore: true,
						allow_respond: true,
						allow_edit: true,
						allow_accept: true
					};
					break;
				case 'schedule_meeting_tool':
					config = {
						allow_ignore: true,
						allow_respond: true,
						allow_edit: true,
						allow_accept: true
					};
					break;
				case 'question':
					config = {
						allow_ignore: true,
						allow_respond: true,
						allow_edit: false,
						allow_accept: false
					};
					break;
				default:
					throw new Error('Invalid tool call: ' + toolCall.name);
					break;
			}

			// Now let's configure the interrupt request
			const request = {
				action_request: {
					action: toolCall.name,
					args: toolCall.args
				},
				config: config,
				description: description
			};


			// INTERRUPT send to the Agent inbox and wait
			const response = await interrupt([request])[0];

			// RESPONSE handeling
			// Now lets handle the response we got back
			switch (response.type) {
				case 'accept':
					// Execute the tool with original args
					const tool = toolsByName[toolCall.name];
					const observation = await tool.invoke(toolCall.args);
					result.push({role: 'tool', content: observation, tool_call_id: toolCall.id});
					break;

				case 'edit':
					// Check this is a valid tool to edit
					if (toolCall.name == 'write_email' || toolCall.name == 'schedule_meeting' ) {
						// Get the tool
						const tool = toolsByName[toolCall.name];
						// Get the new args
						const editedArgs = response.args.args;
						// Now let's update the AI tool call message with the new args
						const aiMessage = state.messages[state.messages.length-1];

						// Create a new tool list by filtering out the tool being edited
						// then add the updated version, this avoids editing the origional list
						const updatedToolCalls = [
							...aiMessage.tool_calls.filter(tc => tc.id !== toolCall.id),
							{type: 'tool_call', name: toolCall.name, args: editedArgs, id: toolCall.id}
						];

						// Create a new message with the updated tool call to preserve
						// state immutability to prevent side effects. When we do the update
						// below with {messages: result} the addMessages reducer overwrites
						// the existing messages by id
						result.push({
							role: 'ai',
							content: aiMessage.content,
							tool_calls: updatedToolCalls,
							id: aiMessage.id
						});

						// Now let's execute the tool with the new args
						// This keeps the message history consitent with the tool call results
						const observation = await tool.invoke(editedArgs);
						result.push({role: 'tool', content: observation, tool_call_id: toolCall.id});

						// Memory Note: Now let's update the preferences for the appropriate tool call
						if (toolCall.name == 'send_email_tool') {
							await updateMemory(store, ['email_assistant', 'response_preferences'], [
								{role: 'user', content: `User edited the email response. Here is the initial email generated by the assistant: ${JSON.stringify(toolCall.args,null,2)}. Here is the edited email: ${JSON.stringify(editedArgs,null,2)}. Follow all instructions above, and remember: ${MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT}`}
							]);
						} else {
							await updateMemory(store, ['email_assistant', 'cal_preferences'], [
								{role: 'user', content: `User edited the calendar invitation. Here is the initial calendar invitation generated by the assistant: ${JSON.stringify(toolCall.args,null,2)}. Here is the edited calendar invitation: ${JSON.stringify(editedArgs,null,2)}. Follow all instructions above, and remember: ${MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT}`}
							]);
						}
					} else {
						throw new Error('Invalid tool call: ' + toolCall.name);
					}
					break;

				case 'ignore':
					// The user said to ignore this so we'll just END
					// Memory Note: In each case we update the triage instructions
					switch (toolCall.name) {
						case 'send_email_tool':
							result.push({role: 'tool', content: 'User ignored this email draft. Ignore this email and end the workflow.', tool_call_id: toolCall.id});
							goto = END;
							await updateMemory(store, ['email_assistant', 'triage_preferences'], [
								...state.messages,
								...result,
								{role: 'user', content: `The user ignored the email draft. That means they did not want to respond to the email. Update the triage preferences to ensure emails of this type are not classified as respond. Follow all instructions above, and remember: ${MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT}`}
							]);
							break;
						case 'schedule_meeting_tool':
							result.push({role: 'tool', content: 'User ignored this calendar meeting draft. Ignore this email and end the workflow.', tool_call_id: toolCall.id});
							goto = END;
							await updateMemory(store, ['email_assistant', 'triage_preferences'], [
								...state.messages,
								...result,
								{role: 'user', content: `The user ignored the calendar meeting draft. That means they did not want to schedule a meeting for this email. Update the triage preferences to ensure emails of this type are not classified as respond. Follow all instructions above, and remember: ${MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT}`}
							]);
							break;
						case 'question':
							result.push({role: 'tool', content: 'User ignored this question. Ignore this email and end the workflow.', tool_call_id: toolCall.id});
							goto = END;
							await updateMemory(store, ['email_assistant', 'triage_preferences'], [
								...state.messages,
								...result,
								{role: 'user', content: `The user ignored the Question. That means they did not want to answer the question or deal with this email. Update the triage preferences to ensure emails of this type are not classified as respond. Follow all instructions above, and remember: ${MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT}`}
							]);
							break;
						default:
							throw new Error('Invalid tool call: ' + toolCall.name);
							break;
					}
					// In this case were canceling the action
					goto = END;
					break;

				case 'response':
					// Here we got some user feedback
					const userFeedback = response.args;
					// In these cases don't execute the tool but append the user feedback and try again
					// memory Notes: for the email and calendar tools we can use the response to improve the preferences
					switch (toolCall.name) {
						case 'send_email_tool':
							result.push({role: 'tool', content: `User gave feedback, which can we incorporate into the email. Feedback: ${userFeedback}`, tool_call_id: toolCall.id});
							await updateMemory(store, ['email_assistant', 'response_preferences'], [
								...state.messages,
								...result,
								{role: 'user', content: `User gave feedback, which we can use to update the response preferences. Follow all instructions above, and remember: ${MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT}`}
							]);
							break;
						case 'schedule_meeting_tool':
							result.push({role: 'tool', content: `User gave feedback, which can we incorporate into the meeting request. Feedback: ${userFeedback}`, tool_call_id: toolCall.id});
							await updateMemory(store, ['email_assistant', 'cal_preferences'], [
								...state.messages,
								...result,
								{role: 'user', content: `User gave feedback, which we can use to update the calendar preferences. Follow all instructions above, and remember: ${MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT}`}
							]);
							break;
						case 'question':
							result.push({role: 'tool', content: `User answered the question, which can we can use for any follow up actions. Feedback: ${userFeedback}`, tool_call_id: toolCall.id});
							break;
						default:
							throw new Error('Invalid tool call: ' + toolCall.name);
							break;
					}
					break;

				default:
					throw new Error('Invalid response: ' + JSON.stringify(response, null, 2));
					break;
			}


		} else { // if the tool is not an HITL tool just execute it
			const tool = toolsByName[toolCall.name];
			const observation = await tool.invoke(toolCall.args);
			result.push({role: 'tool', content: observation, tool_call_id: toolCall.id});
			continue;
		}
	}

	// Put the messages in the update
	const update = {messages: result};

	// Now return a command telling us where we go next and update the state.
	return new Command({
		goto: goto,
		update: update
	});
}

// Conditional Edges
async function shouldContinue(state: state, config: LangGraphRunnableConfig) {
	const store = config.store;

	let result = null;
	// get the last message
	const lastMessage = state.messages[state.messages.length-1];
	// See if we're done
	if (lastMessage.tool_calls) {
		for (const toolCall of lastMessage.tool_calls) {
			if (toolCall.name == 'Done') {
				result = 'mark_as_read_node';
			} else {
				result = 'interrupt_handler';
			}
		}
	}

	return result;
}

// New node for Gmail to mark emails as read
async function markAsReadNode(state: state) {
	markAsRead(state.emailInput.emailId);
}


// Build the Agent Graph
// Note we drop the llmCall -> toolHandler edge
export const agent = new StateGraph(state)
	.addNode('llm_call', llmCall)
	.addNode('interrupt_handler', interruptHandler, {
		ends: ['llm_call', END]
	})
	.addNode('mark_as_read_node', markAsReadNode)
	.addEdge(START, 'llm_call')
	.addConditionalEdges('llm_call', shouldContinue, {'interrupt_handler': 'interrupt_handler', 'mark_as_read_node': 'mark_as_read_node'})
	.addEdge('mark_as_read_node', END)
	.compile();



//////////// Assistant ////////////
// Compose the router and the agent together
// Note that in JS we need to specify how the router ends
// Also we export the assistant this time
export const overallWorkflow = new StateGraph(state)
	.addNode('triage_router', triageRouter, {
		ends: ['response_agent', 'triage_interrupt_handler', END]
	})
	.addNode('triage_interrupt_handler', triageInterruptHandler, {
		ends: ['response_agent', END]
	})
	.addNode('response_agent', agent)
	.addNode('mark_as_read_node', markAsReadNode)
	.addEdge(START, 'triage_router')
	.addEdge('mark_as_read_node', END);

export const emailAssistant = overallWorkflow.compile();

// Visualize the graph
showGraph(emailAssistant, true);
