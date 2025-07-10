import 'dotenv/config';
import { EMAIL_INPUTS, RESPONSE_CRITERIA_LIST } from '../shared/datasets.ts';
import { formatMessagesString } from '../shared/utils.ts';
import { RESPONSE_CRITERIA_SYSTEM_PROMPT } from '../shared/eval-prompts.ts';
import { emailAssistant } from '../shared/assistant.ts';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const criteriaEvalLLM = new ChatOpenAI({model: 'gpt-4.1', temperature: 0});

// Score the response against specific criteria.
const criteriaGrade = z.object({
	justification: z.string().describe('The justification for the grade and score, including specific examples from the response.'),
	classification: z.boolean().describe('Does the response meet the provided criteria?')
});

// Now we can define our evaluation LLM and provide it with our strutured output schema
// This should coerce the output to match the schema
const criteriaEvalStructuredLLM = criteriaEvalLLM.withStructuredOutput(criteriaGrade);


// Let's try out one test
const emailInput = EMAIL_INPUTS[0];
const successCriteria = RESPONSE_CRITERIA_LIST[0];

// First get the assistant to respond to the email
const response = await emailAssistant.invoke({emailInput: emailInput});

// Convert the messages to an easy to read format
const allMessagesStr = formatMessagesString(response.messages);

// Here is where we do the evaluation using the criteria and response
// Note we also have an evaluation prompt as the system prompt to set the scene
const evalResult = await criteriaEvalStructuredLLM.invoke([
    {role: 'system', content: RESPONSE_CRITERIA_SYSTEM_PROMPT},
	{role: 'user', content: `

Response criteria: ${successCriteria}

Assistant's response:

${allMessagesStr}

Evaluate whether the assistant's response meets the criteria and provide justification for your evaluation.`
	}
]);

// Let's see what we got
console.log(evalResult);
