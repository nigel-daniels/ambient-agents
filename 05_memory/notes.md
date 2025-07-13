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

**Structure**: Here we record simple strings (there are some default preferences to get us started in the [prompts file](../shared/prompts.ts)), so we have a function, `getMemoryStore`,that fetches memories from the store or updates them with a what is passed in (initially the default preferences q.v.).

**Updates**: Some features of the [GPT prompt guide](https://cookbook.openai.com/examples/gpt4-1_prompting_guide) were used to develop the prompts. You may need to review your own LLM providers advice and update these. The GPT 4.1 guide suggested:
* Repeat the key instruction at the start and end of the prompt.
* Write clear, explicit instructions.
* Use XML to delimit.
* Provide examples.

The update prompt (`MEMORY_UPDATE_INSTRUCTIONS`) is also in the shared prompts file, as is a reinforcing prompt (`MEMORY_UPDATE_INSTRUCTIONS_REINFORCEMENT`). The updating takes place via the function `updateMemory` and we use the `userPreferences` schema
