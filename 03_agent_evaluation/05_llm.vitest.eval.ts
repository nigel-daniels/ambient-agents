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

// Now we can define our routing LLM and provide it with our strutured output schema
// This should coerce the output to match the schema
const criteriaEvalStructuredLLM = criteriaEvalLLM.withStructuredOutput(criteriaGrade);
