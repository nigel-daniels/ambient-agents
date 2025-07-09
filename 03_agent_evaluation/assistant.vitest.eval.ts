import { EMAIL_INPUTS, EXPECTED_TOOL_CALLS, TRIAGE_OUTPUTS_LIST, RESPONSE_CRITERIA_LIST } from './datasets.ts';
import { formatMessagesString, extractToolCalls } from '../shared/utils.ts';
import { emailAssistant } from './assistant.ts';
import * as ls from 'langsmith/vitest';
import { expect } from 'vitest';

/*
 * Test if email processing contains expected tool calls.
 * This test confirms that all expected tools are called during email processing,
 * but does not check the order of tool invocations or the number of invocations
 * per tool. Additional checks for these aspects could be added if desired.
 */
ls.describe('Email assistant: Test Tools', () => {
	ls.test.each([
   		{inputs: {emailInput: EMAIL_INPUTS[0]}, referenceOutputs: { expectedCalls: EXPECTED_TOOL_CALLS[0]}},
   		{inputs: {emailInput: EMAIL_INPUTS[3]}, referenceOutputs: { expectedCalls: EXPECTED_TOOL_CALLS[3]}}
    ])(
		'For $emailInput expect $expectedCalls',
		async ({inputs, referenceOutputs}) => {
			// Put together our message, make the call and get the results
			const result = await emailAssistant.invoke({emailInput: inputs.emailInput});
			const actualToolCalls = extractToolCalls(result.messages);

			// Check the actual v's expected to see if we are missing any calls
			const missingToolCalls = referenceOutputs.expectedCalls.filter(call =>
				!actualToolCalls.includes(call.toLowerCase())
			);

			// Log stuff to langsmith
			ls.logOutputs({
				missingToolCalls: missingToolCalls,
				actualToolCalls: actualToolCalls,
				response: formatMessagesString(result.messages)
			});

			// Assert we should not be missing any tool calls
			expect(missingToolCalls.length = 0);
		}
	)
});
