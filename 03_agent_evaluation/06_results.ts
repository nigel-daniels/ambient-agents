import { Client } from 'langsmith';

// IMPORTANT: replace the experiment name with your own experiment's name
const EXPERIMENT_NAME = 'cooked-thunder-92';

// Initialise the LangSmith client
const client = new Client();

const emailAssistantExperimentResults = await client.readProject({projectName: EXPERIMENT_NAME, includeStats: true});

console.log('***** Results for ' + EXPERIMENT_NAME + ' *****\n');
console.log('Latency p50: ' + emailAssistantExperimentResults.latency_p50);
console.log('Latency p99: ' + emailAssistantExperimentResults.latency_p99);
console.log('Token Usage: ' + emailAssistantExperimentResults.total_tokens);
console.log('Feedback Stats: ' + JSON.stringify(emailAssistantExperimentResults.feedback_stats, null, 2));
