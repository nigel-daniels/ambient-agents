# Agent Evaluation
```
                                                                                                                 E-mail service
            ---------------                           -------------      ------------------                     /
E-mail ---> |    Agent    | ---> E-mail response ---> | Interrupt | ---> | Human Feedback | ---> Approved e-mail
input       | (LangGraph) |          draft            -------------      |  (Agent inbox) |                     \ Run agent tests
            ---------------                                              ------------------                      =================
                   ^                                                             |                               ║    Testing    ║
                   |                                                             \/                              ║  (LangSmith)  ║
           ----------------         Learn preferences over time          -------------------                     =================
           |   Memory     | <------------------------------------------- | Memory updating |
           ----------------                                              -------------------
```
Now were going to focus on testing the agent to ensure it's performs well and as expected. We can do this testing at different levels of granularity.
## Test granularity
```
                                             3. Trajectory unit test
					2. Triage unit test     --------------------------
                   ----------------------   |   E-mail responding    |  1. End-to-end test
                   |  ----> { ignore }  |   | ---------------------- |   ----------------
                   | /                  |   | |      action        | |   |              |
E-mail -----> Routing ----> { respond } ----->| LLM --------> Tool | -----> E-mail sent |
                   | \                  |   | |  ^             |   | |   |              |
                   |  ----> { notify }  |   | |  ---------------   | |   ----------------
                   ----------------------   | |     feedback       | |
                                            | ---------------------- |
											--------------------------  
________________________________________    ____________________________________________
   Simple branching step to classify            Based on the email, need different
   incoming emails, so use a Router             tools (schedule, check cal, etc)
                                                so use an Agent 	 
```
Looking at the structure of our overall system we can test it's components as well as the end-to-end setup this gives us three areas of testing:
1. **End-to-end:** evaluate the agent's final response.
2. **Triage unit test:** evaluate a triage decision.
3. **Trajectory unit test:** did my agent call the right tools, or take the right steps.

In setting up these tests there are two kinds of test we can apply to this.
||Structured|Unstructured|
|:------------:|:---------:|:-----------:|
|Output|`{classification: 'respond'}`| Hi Nick,<br><br>I just scheduled a meeting for us<br>on Tuesday at 3pm!<br><br>Best,<br>Lance|
|+|+|+|  
|Reference output|`{ground_truth: 'respond'}`|Success Criteria: Schedule a meeting on Tuesday|
|\|<br>V|\|<br>V|\|<br>V|
|Evaluator|Exact match evaluator|LLM as judge evaluator|
|=|=|=|
|Pass?|`true`|`true`|                             

In the first case we can use a simple comparison of the expected and actual outputs to see if the test is a pass or a fail. In the unstructured case were evaluating a more complex situation, was this email the right email to send? Here we use an LLM to consider if it met a description of the expected result.

Comparing these two options with our breakdown of tests above we end up with the following:
```
                Structured       Unstructured
            ------------------------------------
            |                 |         /      |
End-to-end  |                 |        /       |
            |                 |      \/        |
			------------------------------------
			|          /      |                |
Unit test   |         /       |                |
            |       \/        |                |
			------------------------------------
```
There are two ways to do this:
### Unit test framework (Vitest)
This is well understood unit test frameworks for testing JavaScript code. Some key benefits are:
* It suits complex evaluations with specific checks and success criteria.
* It integrates with LangSmith.
### LangSmith datasets
These can be created in Langsmith and run against the assistant using the LangSmith API. Benefits here are:
* You can collaborate as a team on the datasets.
* You can use production traces, annotation queues, synthetic data, etc. to add to the dataset.
* These work well with evaluators that can be applied to every test case (similarity, match accuracy, etc.).
## Test Cases
See [datasets](./datasets.ts).
To start we need to define our tests, some emails to test with along with some things to test. In our case we have the following:
1. **Input e-mails:** A collection of test e-mails.
2. **Ground truth classifications:** `[respond, notify, ignore]`
3. **Expected tool calls:** Tools called for each email needing a response.
4. **Response criteria:** What makes a good response for emails needing replies?

As a result we have:
* End-to-end integration tests.
* Tests for specific steps (unit tests).

The file [datasets test](./datasets.test.ts) just confirms the data set loads ok before we proceed simply run this by calling:
```
npx tsx datasets.test.ts
```

### Vitest tests
See [unit tests](./assistant.vitest.eval.ts).
These tests are stored in the file `assistant.vitest.eval.ts` to let us know we are testing `assistant.ts` using Vitest evaluations. To run the test use:
```
npx vitest run --config ls.vitest.config.ts
```
Note that this calls the Vitest [configuration](ls.vitest.config.ts) file `ls.vitest.config`, this configures the reporter to LangChain and test file definition. Once the test run has completed LangSmith provides a link to the Langsmith console:

![LangSmith console](./images/langsmith-assistant.png)

The pass in the console is determined by the call `expect(missingToolCalls.length = 0);`. The `logOutputs` call populates the **Outputs** column and the data provided to the `ls.test.each()` call can be fount in the **Inputs** column, with each row corresponding to each array element. The `ls.describe()` string forms the name of the project under **Datasets & Experiments**.

### LangSmith Datasets
```
--------------------           ---------------------            -----------------
| Dataset Examples |--inputs-->| Agent (LangGraph) |--outputs-->| Test function |---> Evaluator output
--------------------           ---------------------            -----------------
          |                                                              ^
		  ---------------------- referenceOutputs ------------------------
```
In this case rather than evaluating the entire assistant we are evaluating tool calling accuracy. We will start by looking at the triage worklow step and understanding if it makes the correct classification, especially the `response` option.

See [triage evaluation](./triage.eval.ts).

We start by splitting our data set into an array of inputs and an array of outputs. The inputs look like:
```
inputs = [
	{
	input: {
	    author: 'Alice Smith <alice.smith@company.com>',
	    to: 'John Doe <john.doe@company.com>',
	    subject: 'Quick question about API documentation',
		emailThread: 'Hi John,\n\nI was reviewing the API documentation for the new authentication service and noticed a few endpoints seem to be missing from the specs. Could you help clarify if this was intentional or if we should update the docs?\n\nSpecifically, I\'m looking at:\n- /auth/refresh\n- /auth/validate\n\nThanks!\nAlice'
		}
	},
	{
	input: {
		...
		}
	},
	...
];
```
And the corresponding output file:
```
outputs = [
	{outputs: 'respond'},
	{outputs: 'ignore'},
	...
];
```
So when we create our examples these are loaded as independent datasets unlike Python where a single example set is loaded. It's also important to note the `classificationEvaluator` has to return an object conforming to the `ComparisonEvaluationResult` interface, as this is used by the `evaluate` function. This is independent from the LangSmith Client `evaluateRun` function which is marked as *deprecated*.

You can run this test using the command:
```
npx tsx triage.eval.ts
```
This will begin running the tests and provide a link to LangSmith where you can review the results.

![Triage test results](./images/langsmith-triage.png)
