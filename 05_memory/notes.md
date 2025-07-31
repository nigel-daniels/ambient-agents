# Memory
```
                                                                                                                 E-mail service
            ---------------                           -------------      ------------------                     /
E-mail ---> |    Agent    | ---> E-mail response ---> | Interrupt | ---> | Human Feedback | ---> Approved e-mail
input       | (LangGraph) |          draft            -------------      |  (Agent inbox) |                     \ Run agent tests
            ---------------                                              ------------------                      -----------------
                   ^                                                             |                               |    Testing    |
                   |                                                             \/                              |  (LangSmith)  |
           ================         Learn preferences over time          ===================                     -----------------
           ║   Memory     ║ <------------------------------------------- ║ Memory updating ║
           ================                                              ===================
```
In this lesson we will be extending the email assistant (it can decide how to handle an email and we can provide feedback on the decisions) with a memory. The memory will be used to record the feedback we have provided and use it to inform future decisions the system makes.
## Memory in LangGraph
```
    Short-term memory      |           Long-term memory
-------------------------     ----------------------------------
| -----------------     |  |  | ----    ----    ----    ----   |
| | Human message |     |     |   ----    ----    ----    ---- |
| -----------------     |  |  | ----    ----    ----    ----   |  
|        -------------- |     |   ----    ----    ----    ---- |
|        | AI message | |  |  | ----    ----    ----    ----   |
| 	     -------------- |     |   ----    ----    ----    ---- |
| -----------------     |  |  ----------------------------------
| | Human message |     |            |        ^        |
| -----------------     |  |         |      /   \      |
|        -------------- |            ----->/     \<-----
|        | AI message | |  |              <       >
|        -------------- |                  \     /
-------------------------  |                \   /
       Checkpointer                           v
             |	           |                Store
             |                                |
			 ------------>LLM<-----------------
```
There are two types on memory in LangGraph:
**Thread-Scoped Memory (short-term memory)**
This is a single conversation thread. It's tracked in `State` and we persist this by giving a thread scope to a `checkpointer`. It's the working memory for a single conversation and can contain the messages and other associated data we decide to store.
**Across-thread memory (long-term memory)**
This is a knowledge base made up of multiple single thread conversations across different sessions. These are stored as JSON docs, organized by namespaces and individual keys. These persist over multiple conversations and allow us to retain past preferences, decisions and other knowledge. It allows agents to recall pertinent past conversations that pertain to the current conversation.

A store has a consistent interface that let's us manage our persisted information with different backing mechanisms, be it in memory or a production grade data store.

### LangGraph stores
The store implementations vary with the deployment:
1. **In-Memory**
   * uses `import 'InMemoryStore from '@langchain/langgraph';`
   * this is based on a JavaScript `Map` with no persistence
   * then the process terminates data is lost.
   * useful for testing, experiments.
2. **Local development using `npx @langchain/langgraph-cli dev`**
   * this offers pseudo-persistence
   * it writes to your file system between restarts
   * lightweight, fast and no external data store needed
   * usful for development but not up to production standards
3. **LangGraph Platform/production environment**
   * uses PostgresSQL as the data store
   * a fully persistent store (LangGraph Platform also provides backups)
   * scales for large datasets
   * the default distance is cosine similarity (can be configured)

A guide to adding semantic search to memory can be found [here](https://langchain-ai.github.io/langgraphjs/how-tos/semantic-search/).

See [memory store example](./01_memory_example.ts).
This brief code example show how we can use the `InMemoryStore`. If we wanted to use this to store across threads in a graph we would do something like:
```javascript
import { MemorySaver, InMemoryStore } from '@langchain/langgraph';

// We need this to store the thread conversations
const checkpoint = new MemorySaver();

// This is required to store those conversations across different threads
const inMemoryStore = new InMemoryStore();

...

// Now we can compile a graph with thread-scoped and cross-thread memories
const compiledGraph = graph.compile({checkpointer: checkpoint, store: inMemoryStore});
```
## Adding memory to the assistant
```
                      Triage Router
           ---------------------------------
           |     'respond' ----------------|-->
           |                               |
		   | (Memory)         user         |
           |  |             decision       |
           |  V                /\  respond |
E-mail --->| LLM 'notify' ----<  >---------|-->
           |                   \/          |
           |                   |           |
           |                 ignore        |
           |                   |           |
           |                   V           |
           |     'ignore' --> END          |
           ---------------------------------
```
In the triage router the memory is available to the LLM to provide past feedback on how emails should be triaged. We also provide memory to the response agent LLM so it can make better decisions on how to respond to emails based on prior feedback. But how do we gather that feedback and ensure it is in the memory? This is also a function that the response agent handles:
| Tool Selected | Response | Notes | Outcome | Store ? | Finish ? |
|:--------------|:-------|:------|:---------|:-:|:---|
|`question`|`ignore`|Ignore tool call||Y|END|
||`respond`|Give agent an answer to the question|Answer Message||
|`write_email`|`ignore`|Ignore tool call||Y|END|
||`respond`|Provide feedback on how to write the email|Feedback Message|Y||
||`accept`|Accept the tool call|Invoke Tool||Done|
||`edit`|Edit the tool call|Invoke Tool (edited args)|Y|Done|
| `schedule_meeting`|`ignore`|Ignore tool call||Y|END|
||`respond`|Provide agent feed back on the schedule to try again|Feedback Message|Y||
||`accept`|Accept the tool call|Invoke Tool|||
||`edit`|Edit the tool call|Invoke Tool (edited args)|Y||

In the table above there is no a *Store ?* column that indicates that any time we learn something from the use or something about their preferences we want to store that information for future use. This is when they decide we should `ignore` an e-mail, they `edit` a tool call or provide a `response`. The only time we don't record a response is when the agent explicitly asks a question.

### Managing memories
See [memory assistant](./assitant.ts).

We know we need to add a `Store` to the graph but we need to consider:
1. How we structure it?
2. How we update it?

**Structure**: Here we record simple strings and this is defined in the [schemas](../shared/schemas.ts) file (there are some default preferences to get us started in the [prompts file](../shared/prompts.ts)). Un the assistant there is a helper function, `getMemory`, that fetches memories from the store or updates them with a what is passed in (initially the default preferences q.v.).

**Updates**: Some features of the [GPT prompt guide](https://cookbook.openai.com/examples/gpt4-1_prompting_guide) were used to develop the prompts. You may need to review your own LLM providers advice and update these. The GPT 4.1 guide suggested:
* Repeat the key instruction at the start and end of the prompt.
* Write clear, explicit instructions.
* Use XML to delimit.
* Provide examples.

The update prompt (`MEMORY_UPDATE_INSTRUCTIONS`) is also in the shared prompts file, as is a reinforcing prompt (`MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT`). The updating takes place via the function `updateMemory` and we use the `userPreferences` schema.

Note that in JS the store is not passed directly to the nodes but a `LangGraphRunnableConfig` is. It is from this we then extract the store.

## Testing the agent memory
We can use different user interactions to test the formation of memories (updates to preferences) to improve the systems performance. The key items to evaluate are:
1. How do we capture and store preferences?
2. How do the preferences affect future decisions?
3. Which interactions create which types of memory?

See [utilities](../shared/utils.ts).

To assist with this we create the `displayMemoryContent` function for reviewing the memories as they are developed.

### Accepting the tool calls
See [accepting tool calls](./02_accept_memory.ts).

In this test we don't make any modifications (i.e. there is no feedback) so the memory should remain the same. What happens is:
1. We use the tax planning e-mail used before.
2. The agent triages it as a `respond` e-mail.
3. We `accept` the proposed schedule.
4. An e-mail response is generated.
5. We `accept` the proposed e-mail.

Running this we output the state of the memories in the store prior to us accepting the tool calls and after. This shows how the system is initialized with the defaults and, as we gave no feedback, the remain unchanged.

### Edit the tool calls
See [editing tool calls](./03_edit_memory.ts).

In this exercise we are changing the tool calls so the system should learn from the changes we make and add some memories from the feedback. In this case:
1. We use the tax planning e-mail used before.
2. The agent triages it as a `respond` e-mail.
3. We `edit` the proposed schedule to:
   * a shorter time.
   * use e-mail addresses in the to field.
   * shorten the title.
4. An e-mail response is generated.
5. We `edit` the proposed e-mail to:
   * be shorter and less formal.
   * use names and email address.

Now when we run this we can compare the preferences in the store and we can see the agent updates these to include notes on the changes we made, for example the calendar preferences start out as:
```
30 minute meetings are preferred, but 15 minute meetings are also acceptable.
```
and after we have edited the too arguments it is updated to:
```
30 minute meetings are preferred, but 15 minute meetings are also acceptable.

When creating calendar invitations, use specific email addresses for attendees rather than just names or roles.

Use concise subject lines for calendar invitations.
```
### Responding to tool calls
See [responding to tool calls](./04_respond_memory.ts).

In this case it starts as before but we respond with some different feedback in the form of freeform test in our responses. Here:
1. We use the tax planning e-mail used before.
2. The agent triages it as a `respond` e-mail.
3. We `respond` the proposed schedule to say:
   * `Please schedule this for 30 minutes instead of 45 minutes, and I prefer afternoon meetings after 2pm.`
4. Following this we `accept` the proposed schedule.
5. An e-mail response is generated.
6. We `respond` the proposed e-mail to say:
   * `Shorter and less formal.`
   * `Include a closing statement about looking forward to the meeting!`
7. We then `accept` the proposed e-mail.

Again we can compare the changes to the memories to see the effect of our responses. For example the calendar preferences change from the default to become:
```
30 minute meetings are preferred, but 15 minute meetings are also acceptable.
Meetings should be scheduled in the afternoon, after 2pm, when possible.
```
The response preferences gain the following new section:
```
Additional preferences:
- Make responses shorter and less formal when possible.
- When confirming meetings, include a closing statement expressing that you look forward to the meeting.
```
## Deploy

There is a `langgraph.json` file set up to run our `memory_assistant` locally. We can start this by running:
```sh
npx @langchain/langgraph-cli dev
```
This will open LangGraph Studio (check you are looking at the `memory_assistant`). Test this with an e-mail such as:
```json
{
"emailInput": {
    "author": "Alice Smith <alice.smith@company.com>",
    "to": "John Doe <john.doe@company.com>",
    "subject": "Quick question about API documentation",
	"emailThread": "Hi John,\n\nI was reviewing the API documentation for the new authentication service and noticed a few endpoints seem to be missing from the specs. Could you help clarify if this was intentional or if we should update the docs?\n\nSpecifically, I'm looking at:\n- /auth/refresh\n- /auth/validate\n\nThanks!\nAlice"
	}
}
```
This will run until we hit the interrupt, this time we can click on the *Memory* button at the top of the graph display. This will open a display of the memory found in our local deployment. You can examine the current content of each of the memories we set up (initially these will be the defaults). This is a view of the `json` store in the local `.langgraph_api` directory.

Now open the [Agent Inbox](https://dev.agentinbox.ai/) (you may need to set the inbox up as we did before). This time, to exercise the memory, let's *Edit* the *Content* argument to be much more terse:
```
Hi Alice,

Thanks! I will take care of that!

Best regards,
John
```
When we hit submit the graph will finish the run. If we examine the run for the overall `email_assistant` in LangSmith we can see after the call to the `write_email` tool was made the call to *ChatOpenAI* considered our updated response and in the *Output* we can see the updated profile with a justification for the change.

Returning to LangGraph Studio we can agin look at the memory but this time note the `response_preferences` have been updated more recently and now include the new suggestions to the LLM.

## Notes
In our example the store we use is very simple:
* The schema is a string.
* We overwrite the memory with a replacement string.

We could add semantic search to the long term memory then it is possible to search over collections of memories in the store. We do this by adding an embedding model to the store. A guide on this can be found here:
* [Adding semantic search](https://langchain-ai.github.io/langgraphjs/how-tos/semantic-search/).
