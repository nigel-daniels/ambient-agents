# Building Agents
```
                                                                                                                 E-mail service
            ===============                           -------------      ------------------                     /
E-mail ---> ║    Agent    ║ ---> E-mail response ---> | Interrupt | ---> | Human Feedback | ---> Approved e-mail
input       ║ (LangGraph) ║          draft            -------------      |  (Agent inbox) |                     \ Run agent tests
            ===============                                              ------------------                      -----------------
                   ^                                                             |                               |    Testing    |
                   |                                                             \/                              |  (LangSmith)  |
           ----------------         Learn preferences over time          -------------------                     -----------------
           |   Memory     | <------------------------------------------- | Memory updating |
           ----------------                                              -------------------
```
Here is what we are aiming to build and in this part of the course we are building the `Agent` block.
## Future lessons
Because the cost of error is potentially so high we will add some human in the loop capability to gate certain actions. Especially where the agent decides to notify us (we need interaction anyway there) and prior to calling the tool to send any emails... just in case ;-) We can use agent in-box for this, then based on the responses we will update the memory to improve the agents function. Referring to the first diagram, here is a breakdown of this and the future lessons:
| What build | What we use | Lesson |
| :--------- | :---------- | :----- |
| *Agent* the email assistant | LangGraph | This Lesson 02 |
| *Testing* the email assistant | LangSmith | Lesson 03 |
| *Human Feedback* adding human-in-the-loop | LangGraph | Lesson 04 |
| *Human Feedback* using the agent in-box | Agent Inbox | |
| *Memory* updating preferences over time | LangGraph | Lesson 05 |
| *Everything* deploying the lot | LangGraph Platform | |

## Building the email assistant
```
                                                 E-mail responding
                      ----> { ignore }        ----------------------
                     /                        |      action        |
E-mail -----> Routing ----> { respond } ----->| LLM --------> Tool | -----> E-mail sent
	                 \                        |  ^             |   |
	                  ----> { notify }        |  ---------------   |
                                              |     feedback       |
                                              ----------------------
________________________________________    ____________________________________________
   Simple branching step to classify            Based on the email, need different
   incoming emails, so use a Router             tools (schedule, check cal, etc)
                                                so use an Agent 	 
```
See [assistant](./assistant.ts).

This is a schematic of what we are aiming to build and the key components we need to use. The router is relatively static in function, whereas the agent is more open-ended and may need to use one or more tools to complete it's task.
### Tools
See [tools](../shared/tools.ts).

This is the collection of dummy tools we will be using in the assistant, you can see there are tools to send an email, check a calendar, schedule a meeting, and a tool to say we are done.
NB: `question` is for later use in *Human in the Loop*.
### Router
The router will triage the incoming e-mail.
#### State
First we need to consider the state information we need so we can track the messages and additional information.
#### Structured response
To ensure the agent ands up responding in a structured manner we create a schema that describes what the response should look like and bind it to the LLM, this coerces the LLM to respond with a well structured reply that conforms to our schema.
#### Node and Command
Looking at the main decision node itself, note that it is returning a `Command` this is in place of using a Conditional Edge as we have in previous exercises. The returned `Command` gives direct instruction on where to head next as well as updating the state. Also note the node prompts are coming from the [prompt](./prompt.ts) file (I'm using the `string-template` lib to allow us to have a format like behavior as string literals need the values defining ahead of time.) and some functions are in the [utils](./shared/utils.ts) file, these also get used subsequently.
### Agent
We define the nodes and compile the graph, essentially were building a react agent but this just breaks it down for us to see all of the moving parts, the llm, the tool.
### Assistant (workflow + agent)
Finally we pull all of this together to construct out assistant. There are some local tests that will run to demonstrate the code is working as expected.
```sh
npx tsx assistant.ts
```
In the next section we will learn more about testing the assistant.
