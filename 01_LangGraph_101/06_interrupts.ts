import { showGraph } from '../shared/utils.ts';
import { StateGraph, Annotation, MemorySaver, Command, interrupt, START, END } from '@langchain/langgraph';
import terminalImage from 'terminal-image';

// Let's define a simple state
const State = Annotation.Root({
	input: Annotation<string>,
	user_feedback: Annotation<string>
});

// Now some VERY basic nodes
// Just show we got to this node
async function stepOne(state: State) {
	console.log('--------- Step 1 ---------');
	return;
}

// Show we got to this node then gather feedback to update the state
async function humanFeedback(state: State) {
	console.log('----- Human Feedback -----');
	const feedback = interrupt('Please provide feedback:');
	return {user_feedback: feedback};
}

// Just show we got to this node
async function stepThree(state: State) {
	console.log('--------- Step 3 ---------');
	return;
}

// This time let's just do this in one shot
const graph = new StateGraph(State)
	.addNode('step_1', stepOne)
	.addNode('human_feedback', humanFeedback)
	.addNode('step_3', stepThree)
	.addEdge(START, 'step_1')
	.addEdge('step_1', 'human_feedback')
	.addEdge('human_feedback', 'step_3')
	.addEdge('step_3', END)
	.compile({checkpointer: new MemorySaver()});

// If you want to see the graph looking good, you could always save it to a file instead!
showGraph(graph);

// Set our input
const initialInput = {input: 'hello world'};

// Create a thread
const thread = {configurable: {thread_id: '1'}};

// This time let's stream our results
for await (const event of await graph.stream({...initialInput, streamMode: 'updates'}, thread)) {
	console.log(event);
}
// This is commented out so that on the first run you can see the effect of the interrupt, it just stops the execution

/*
// Now let's resume using a resume command and providing our feedback
for await (const event of await graph.stream(new Command({resume: 'go to step 3!'}), thread, {streamMode: 'updates'})) {
	console.log(event);
}
*/
