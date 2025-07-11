import { EXAMPLES_TRIAGE } from '../shared/datasets.ts';
import { Client, evaluate } from 'langsmith';
import { emailAssistant } from './assistant.ts';
import { evaluate } from "langsmith/evaluation";

// Initialise the LangSmith client
const client = new Client();

// Dataset name
const datasetName = 'E-mail Triage Evaluation';

// Now let's check if the dataset exists yet
if (!(await client.hasDataset({datasetName: datasetName}))) {
	// Set up the data
	const inputs = [];
	const outputs = [];

	// Sort out the data
	EXAMPLES_TRIAGE.map((example) => {
		inputs.push({emailInput: example[0]});
		outputs.push({classificationDecision: example[1]});
	});

	// Now create the data set
	const dataset = await client.createDataset(datasetName, {
		description: 'A dataset of e-mails and their triage decisions.'
	});

	// Add the data to the dataset
	// Note that here we set inputs and outputs
	await client.createExamples({
		inputs: inputs,
		outputs: outputs,
		datasetId: dataset.id
	});
}


// Ok now let's define our target test function
async function targetEmailAssistant(inputs) {
	// Call the triage router only
	const response = await emailAssistant.nodes['triage_router'].invoke({emailInput: inputs.emailInput});
	// Return the decision it made
	return {classificationDecision: response.update.classificationDecision};
}


// Now we define our evaluation function
function classificationEvaluator(outputs, referenceOutputs) {
	// Work out if output and expected output match
	const result = outputs.outputs.classificationDecision.toLowerCase() == referenceOutputs.outputs.classificationDecision.toLowerCase();

	// Return a ComparisonEvaluationResult
	return {
		key: 'correct',
		score: result
	};
}


// Ok so let's put all of this together
// This will run the test we defined against the data set we uploaded to LangSmith
await evaluate((inputs) => targetEmailAssistant(inputs),{
	client: client,
	data: datasetName,
	evaluators: [classificationEvaluator],
	experimentPrefix: 'E-mail assistant workflow',
	maxConcurrency: 2
});
