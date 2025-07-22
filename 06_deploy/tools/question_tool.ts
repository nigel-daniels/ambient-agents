import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// A tool for HITL
export const question = tool((input: {content: string}) => {
	return input.content;
},{
	name: 'question',
	description: 'Question to ask user.',
	schema: z.object({
		content: z.string()
	})
});
