import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// A tool to let us know the email was sent
export const done = tool((input) => {
	return true;
},{
	name: `Done`,
	description: 'E-mail has been sent.'
});
