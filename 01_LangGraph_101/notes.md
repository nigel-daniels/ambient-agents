# Introduction
This provides an over view of LangGraph and what this module covers.
## Chat
See [01_chatModels.ts](./01_chatModels.ts).
```

                                  AGENT
                            -------------------
       User request ------> | LLM ---->       |
USER      Output    <------ |     <---- Tools |
                            -------------------
```
In a typical chat use case a user makes a request to an agent, the agent calls some tools and generates a response to the user. So how do we go beyond this when a user does not want to be conversing with the agent to get things done?
## Ambient Agents
|                      |       Chat Agents        |    Ambient Agents    |
| :------------------- | :----------------------- | :------------------- |
| Agent Trigger        | User message/request     | Listening to events  |
| Concurrency          | ~1 user request          | Many events          |
| UX                   | Chat UI/await completion | Background/notify me |
| Latency Requirements | Needs to be fast         | Can take longer      |
## E-mail management agent
In this module the aim is to build an e-mail management agent to handle your in-box, some key features are using LangGraph for the agent, adding human-in-the-loop to get feedback on proposed actions (before sending anything!) and using persistence to form memory.
```
                                                                                                                 E-mail service
            ---------------                           -------------      ------------------                     /
E-mail ---> |    Agent    | ---> E-mail response ---> | Interrupt | ---> | Human Feedback | ---> Approved e-mail
input       | (LangGraph) |          draft            -------------      |  (Agent inbox) |                     \ Run agent tests
            ---------------                                              ------------------                      -----------------
                   ^                                                             |                               |    Testing    |
                   |                                                             \/                              |  (LangSmith)  |
           ----------------         Learn preferences over time          -------------------                     -----------------
           |   Memory     | <------------------------------------------- | Memory updating |
           ----------------                                              -------------------
```
### Models for building the solution
```
  ^
P |
r |  1 Prompt LLM
e |
d |              2 Router workflow
i |
c |
t |
a |
b |
i |
l |
i |
t |                             3 Agent
y |
   ---------------------------------------->
                  Agency
```
#### 1 Prompt LLM
See [02_workflows.ts](./02_workflows.ts).
```
        Prompt   E-mail tool      
            \     /
             \   /
E-mail -----> LLM -----> Tool Call -----> Run tool -----> E-mail sent
```
This is a simple prompt based agent where you make a request for an e-mail to be sent, the LLM generates a response but in a structured format to call a tool to send the email. In this case it is the tool that provides some level of agency (it could be an API to and email sender). The agent generates an output to conform to the API and the email is sent. This is highly predictable as a request comes in and an email is sent.
#### 2 Router workflow
See [03_router_workflow.ts](./03_router_workflow.ts).
```
            Router
            Prompt                    Prompt   E-mail tool      
               |   ----> { ignore }       \     /
               |  /                        \   /
E-mail -----> LLM -----> { respond } -----> LLM -----> Tool Call -----> Run tool -----> E-mail sent
                  \
                   ----> { notify }
```
In this case we can add some predefined behaviors based on incoming emails. In this case we can add a routing LLM that decides if we want to send an email, not send an email or notify the inbox owner based on some pre-set criteria. Should the decision be to send an email and e-mail agent is called similar to the first email. This is has more agency as decisions are made up front but the predictability is lower, we don't always send an email.
#### 3 Agent
See [04_router_agent.ts](./04_router_agent.ts).
```
        Prompt    Tools      
            \     /
             \   /
E-mail -----> LLM -----> Tool Call -----> Run tool -----> Loop termination
               ^                             |
               |_____________________________|
```
In this case the agent has a collection of tools, after a tool call the agent considers the response and decides what to do next. The loop repeats until a termination condition is met. This has higher agency as the agent controls the decisions and actions and is less predictable. The agent can call any sequence of tools that is has.
### Workflows V's agents
|                      | Workflow                          | Agent                                     |
| :------------------- | :-------------------------------- | :---------------------------------------- |
| Action sequence      | Easy to enumerate in advance      | Unknown until runtime (depends on input)  |
| Process              | Linear or branching control flow  | Flexible decision making (backtracking)   |
| Performance          | Latency/cost are crucial          | Ok to trade-off for more reasoning        |

**Heuristic:** If you can easily draw the flow of control on a whiteboard, a simple workflow will probably do.
## LangGraph
As we saw in the code, LangGraph is a workflow framework for building agent applications, at the core we have:
|      | Description     |
| :------------- | :------------- |
| Node  | A unit of work (code) to give imperative direct control. |
| Edge  | A declarative transition between nodes.                  |

These components can be composed into directed graphs with a start node. This allows us to combine workflows and agents, this provides us with a way of transitioning between the low agency/high predictability of a pure workflow agent to the high agency/low predictability of a full agent (or any stage in between).

Another important element in LangGraph is the persistence layer, this allows us to pause the application and save the state. This enables human-in-the-loop interactions, long running actions and the ability to build long-term memory.

There are several tools we will use to build the application:
| Tool | Purpose |
| :--- | :------ |
| LangSmith | Observability (tracing and evaluation) |
| LangGraph | Orchestration (application control flow) |
| LangChain | Integrations (standard interfaces) |

The benefits we from using LangGraph are:

* **Control:** It is simple to define and/or combine agents and workflows.
* **Persistence:** We can store the graph state for memory or human interactions.
* **Test, debug, deploy:** We have an on-ramp to manage our applications.

### Control
We created our graph with:
1. *State:* The information we need to track over the course of the application.
2. *Nodes:* How we update this information.
3. *Edges:* How we link the nodes together.

### Persistence
See [05_persistence.ts](./05_persistence.ts).
```
Graph        {state:"I"} --> Node_1 --> Node_2 --> {state: "I heart langgraph"}        Control flow of nodes, edges

Super-steps                  Node_1     Node_2                                         Each sequential node is a separate
                                                                                       super-step, while parallel nodes
                                                                                       share the same super-step.

                 --------------------          ------------------------------
                 | state: "I heart" |          | state: "I heart langgraph" |          State and relevant metadata packaged
Checkpoints      | next: node_2     |          | next: END                  |          at every super-step
                 | id: ......       |          | id: ......                 |
                 | etc: ......      |          | etc: ......                |
                 --------------------          ------------------------------

                 - - - - - - - - - - - - - - - -
                 |                             |
Thread           |   node_1          node_2    |                                       Collection of checkpoints
                 |                             |
                 - - - - - - - - - - - - - - - -

StateSnapshot       StateSnapshot()        StateSnapshot()                             Type for checkpoints
```
The persistence layer in LangGraph is built on checkpoints, these happen after each node and save the condition of the state after each node processes it.
