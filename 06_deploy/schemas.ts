import { z } from 'zod';
import { MessagesAnnotation, Annotation } from '@langchain/langgraph';

// This is our state across the entire email assistant
// Note that we are extending the MessagesAnnotation to handle the messages for us
export const state = Annotation.Root({
	...MessagesAnnotation.spec,													// Merge in the MessagesAnnotation
	emailInput: Annotation<Record<string, any>>({								// Let's use a Record in place of a Python dict
    	default: () => {}
	}),
	classificationDescision: Annotation<'ignore' | 'respond' | 'notify'>({		// These form our literals and we default to 'ignore'
		default: () => {'ignore'}
	})
});


// Now lets use Zod to define a structure output schema
// This is used by the triage node in the workflow
export const routerSchema = z.object({
	reasoning: z.string().describe('Step-by-step reasoning behind the classification.'),
	classification: z.enum(['ignore', 'respond', 'notify']).describe(`The classification of an email:
		'ignore' for irrelevant emails,
		'notify' for important information that doesn't need a response,
		'respond' for emails that need a reply`)
});


// Let's define the strucutre of the user preferences for the memory store
export const userPreferencesSchema = z.object({
	chainOfThought: z.string().describe('Reasoning about which user preferences need to add / update if required'),
	userPreferences: z.string().describe('Updated user preferences')
});

// This is the state for the cron service
export const jobKickoff = z.object({
	email: z.string(),
	minutesSince: z.number().default(60),
	graph: z.string().default('assistant'),
	url: z.string().default('http://localhost:2024/'),
	includeRead: z.boolean().default('false'),
	early: z.boolean().default('false'),
	skipFilters: z.boolean().default('false')
});
