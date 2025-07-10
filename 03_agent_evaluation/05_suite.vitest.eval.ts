import 'dotenv/config';
import { EMAIL_INPUTS, RESPONSE_CRITERIA_LIST, EMAIL_NAMES, EXPECTED_TOOL_CALLS } from '../shared/datasets.ts';
import { formatMessagesString, extractToolCalls } from '../shared/utils.ts';
import { RESPONSE_CRITERIA_SYSTEM_PROMPT } from '../shared/eval-prompts.ts';
import { overallWorkflow } from '../shared/assistant.ts';
import { ChatOpenAI } from '@langchain/openai';
import { InMemoryStore, MemorySaver } from '@langchain/langgraph';
import { z } from 'zod';
import { v4 as uuid4 } from 'uuid';
import * as ls from 'langsmith/vitest';
import { expect } from 'vitest';

// Set globals
const AGENT_MODULE = 'email_assistant';

//////////// LLM setup ////////////
// Define the response schema
const criteriaGrade = z.object({
	justification: z.string().describe('The justification for the grade and score, including specific examples from the response.'),
	grade: z.boolean().describe('Does the response meet the provided criteria?')
});

// Now we can define our evaluation LLM and provide it with our strutured output schema
// This should coerce the output to match the response schema
const criteriaEvalLLM = new ChatOpenAI({model: 'gpt-4.1', temperature: 0});
const criteriaEvalStructuredLLM = criteriaEvalLLM.withStructuredOutput(criteriaGrade);

//////////// Test data setup ////////////
// Build up the test inputs and the expected response criteria
// expected calls and set the test email names
/*const testData = EMAIL_INPUTS.map((emailInput, index) => ({
	inputs: {
		emailName: EMAIL_NAMES[index],
		emailInput: emailInput
	},
	referenceOutputs: {
		criteria: RESPONSE_CRITERIA_LIST[index],
		expectedCalls: EXPECTED_TOOL_CALLS[index]
	}
}));*/

const testData = [{
	inputs: {
		emailName: 'email_input_1',
		emailInput: {
		    author: 'Alice Smith <alice.smith@company.com>',
		    to: 'Lance Martin <lance@company.com>',
		    subject: 'Quick question about API documentation',
			emailThread: `Hi Lance,

		I was reviewing the API documentation for the new authentication service and noticed a few endpoints seem to be missing from the specs. Could you help clarify if this was intentional or if we should update the docs?

		Specifically, I'm looking at:
		- /auth/refresh
		- /auth/validate

		Thanks!
		Alice`
		}
	},
	referenceOutputs: {
		criteria: '• Send email with write_email tool call to acknowledge the question and confirm it will be investigated',
		expectedCalls: ['write_email', 'done']
	},
	config: {
		name: 'Agent Evaluation',
		metadata: {
			emailName: 'email_input_1'
		}
	}
}];

//////////// Test cases ////////////
// Test if email processing contains expected tool calls.
ls.describe('Test tool calls made', () => {
	ls.test.each(
		testData
	)(
		'emailInput, criteria, expectedCalls',
		{config: {project_name: AGENT_MODULE}},
		async ({inputs, referenceOutputs}) => {
			console.log('Processing ' + inputs.emailName);
			// Use this helper to set things up
			const {emailAssistant, threadConfig ,store} = setupAssistant();

			// Run the assistant
			const result = await emailAssistant.invoke(
				{emailInput: inputs.emailInput},
				threadConfig
			);

			// Get the end state from the assistand and clean it up
			const state = await emailAssistant.getState(threadConfig);
			const values = extractValues(state);

			// Pull out the tool calls from the messages
			const extractedToolCalls = extractToolCalls(values.messages);

			// Check if we missed calling an expected tool
			const missingCalls = referenceOutputs.expectedCalls.filter(call =>
				!extractedToolCalls.includes(call.toLowerCase())
			);
			// Check if we made an unexpected tool calls
			const extraCalls = extractedToolCalls.filter(call =>
				!referenceOutputs.expectedCalls.includes(call.toLowerCase())
			);

			// Pretty up the messages and log to LangSmith
			const allMessagesStr = formatMessagesString(values.messages);
			ls.logOutputs({
				extractedToolCalls: extractedToolCalls,
				missingCalls: missingCalls,
				extraCalls: extraCalls,
				response: allMessagesStr
			});

			// Now let's assert we should have made all of the correct calls
			expect(missingCalls.length).toBe(0);
		}
	)
});


// Test if a response meets the specified criteria.
// Only runs on emails that require a response.
ls.describe('Test response v criteria', () => {
	ls.test.each(
		testData
	)(
		'emailInput, criteria, expectedCalls',
		async ({inputs, referenceOutputs}) => {
			// Use this helper to set things up
			const {emailAssistant, threadConfig ,store} = setupAssistant();

			// Run the assistant
			const result = await emailAssistant.invoke(
				{emailInput: inputs.emailInput},
				threadConfig
			);

			// Get the end state from the assistand and clean it up
			const state = await emailAssistant.getState(threadConfig);
			const values = extractValues(state);

			// Pull out the tool calls from the messages
			const allMessagesStr = formatMessagesString(values.messages);

			// Get the LLM to evaluate our test
			const evalResult = await criteriaEvalStructuredLLM.invoke([
			    {role: 'system', content: RESPONSE_CRITERIA_SYSTEM_PROMPT},
				{role: 'user', content: `

			Response criteria: ${referenceOutputs.criteria}

			Assistant's response:

			${allMessagesStr}

			Evaluate whether the assistant's response meets the criteria and provide justification for your evaluation.`
				}
			]);

			// log to LangSmith
			ls.logOutputs({
				justification: evalResult.justification,
				response: allMessagesStr
			});

			// Now let's assert we passed (or not)
			expect(evalResult.grade).toBe(true);
		}
	)
});

//////////// Utility Functions ////////////
// Setup the email assistant and create thread configuration.
//Returns the assistant, thread config, and store.
function setupAssistant() {
	// Set place holder for the memory (if used)
	let store = null;
	let emailAssistant = null;
	// Set up the thread
	const threadId = uuid4();
	const threadConfig = {configurable: {thread_id: threadId}};

	switch (AGENT_MODULE) {
		case 'email_assistant_hitl_memory':
			// Memory implementation needs a store and a checkpointer
			store = new InMemoryStore();
			emailAssistant = overallWorkflow.compile({checkpointer: new MemorySaver(), store: store});
			break;
		case 'email_assistant_hitl':
			// Just use a checkpointer for HITL version
			emailAssistant = overallWorkflow.compile({checkpointer: new MemorySaver()});
			break;
		default:
			// Just use a checkpointer for other versions
			emailAssistant = overallWorkflow.compile({checkpointer: new MemorySaver()});
			break;
	}

	return {emailAssistant: emailAssistant, threadConfig: threadConfig, store: store};
}


// Extract values from state object regardless of type.
function extractValues(state) {
	let result = state;
	if ('values' in state) {result = state.values;}
	return result;
}
