# Human In The loop (HITL)
```
                                                                                                                 E-mail service
            ---------------                           -------------      ==================                     /
E-mail ---> |    Agent    | ---> E-mail response ---> | Interrupt | ---> ║ Human Feedback ║ ---> Approved e-mail
input       | (LangGraph) |          draft            -------------      ║  (Agent inbox) ║                     \ Run agent tests
            ---------------                                              ==================                      -----------------
                   ^                                                             |                               |    Testing    |
                   |                                                             \/                              |  (LangSmith)  |
           ----------------         Learn preferences over time          -------------------                     -----------------
           |   Memory     | <------------------------------------------- | Memory updating |
           ----------------                                              -------------------
```
Continuing our tour of this high-level view of things, we are going to look at how we get human feedback into what the agents are doing. Do we trust the agents to send emails for us or do we want some say on the matter? There are two places in which we may want to step in to provide human feedback:
```
                                                 E-mail responding
                      ----> { ignore }        ----------------------
                     /                        |      action        |
E-mail -----> Routing ----> { respond } ----->| LLM ----X---> Tool | -----> E-mail sent
	                 \                        |  ^      ^      |   |
	                  ----> { notify } X- - ->|  -------|-------   |
                                       ^      |     feed|back      |
                                       |      ----------|-----------
                                       |                |
                                     human            human
                                   feedback          feedback
```
At each of the points `X` we want the graph to pause and to await for that input.
## Agent Inbox
This simple interface let's us see messages from agents, we can drill down into their work and see what further information the agent needs or provide feedback.
## Building the assistant
The assistant we are building is the same assistant we constructed in *Building Agents* then tested in *Agent Evaluation*. We are taking that basic assistant and adding some features.
### New tool
See [tools](../shared/tools.ts).

In the tools file the `question` tool is there. This allows the agent to ask the user questions about the action they intend to take or to request further clarification. This also has the updated `HITL_TOOLS_PROMPT` that makes the agent aware of the new tool.
### Triage updates
The routing is the same as before with a difference at`notify`. If the decision is to notify the user then we will transition to a new node `triage_interrupt_handler` which posts the notification to the agent inbox.
```
                      Triage Router
           ---------------------------------
           |     'respond' ----------------|-->
           |                               |
		   |                  user         |
           |                decision       |
           |                   /\  respond |
E-mail --->| LLM 'notify' ----<  >---------|-->
           |                   \/          |
           |                   |           |
           |                 ignore        |
           |                   |           |
           |                   V           |
           |     'ignore' --> END          |
           ---------------------------------
```
#### New node
The node we are adding to the `notify` decision, the `triage_interrupt_handler`, has two key functions:
1. Show the classification to the user: add the classification to the interrupt.
2. Let the user respond: handle the Agent Inbox response.
To do this we create a `request` object in the `triage_interrupt_handler`, this is sent to the Agent Inbox.

This `request` object has three key attributes:
* `action_request`: The action name and any tool call arguments.
* `config`: Flags to tell the Agent Inbox what interactions are allowed.
* `description`: Details on what is requested (can be Markdown).

What's happening is we are forming the interrupt with the `request` to Agent Inbox on how to render the content as well as the content itself.

### Response agent updates
In the `callLLM` node it mostly remains as before but it includes the `HITL_TOOLS_PROMPT` that introduces the new question tool. This, combined with a new `interrupt_handler` node that deals with `response` options gives us a new set of routings internal to the response agent.

#### Interrupt handler
This is the heart of our HITL process in the agent, it will examine tool calls and decide which need review before execution. To do this it:

1. **Select Tool**: This is a list of HITL tools:
   - `write_email`: This has the most potential risk.
   - `schedule_meeting`: This can impact your calendar.
   - `question`: This needs direct interaction.
2. **Directly Execution**: Tools not on the HITL list can just be executed.
3. **Prepare Context**: For tools needing review the handler:
   - Retrieves the input email for context.
   - Formats the tool calls for display.
   - Configures the interactions allowed for the tools.
4. **Creates interrupt**: Handles the structured request with:
   - Action name and args.
   - Interaction configuration.
   - A description and proposed action.
5. **Processes Response**: Handle the human response:
   - `accept`: execute the tool with the original args.
   - `edit`: Execute the tool with updated args.
   - `ignore`: Cancel the execution.
   - `response`: Note the feedback and do not execute.

So for each of our tools that the HITL needs to deal with we can build the following table:

| Tool Selected | Response | Notes | Outcomes |   |
|:--------------|:-------|:------|:---------|:--|
|`question`|`ignore`|Ignore tool call|END||
||`respond`|Give agent an answer to the question|Answer Message||
|`write_email`|`ignore`|Ignore tool call|END|||
||`respond`|Provide feedback on how to write the email|Feedback Message||
||`accept`|Accept the tool call|Invoke Tool|Done|
||`edit`|Edit the tool call|Invoke Tool (edited args)|Done|
| `schedule_meeting`|`ignore`|Ignore tool call|END||
||`respond`|Provide agent feed back on the schedule to try again|Feedback Message||
||`accept`|Accept the tool call|Invoke Tool|Done|
||`edit`|Edit the tool call|Invoke Tool (edited args)|Done|

### HITL patterns review
See the updated [assistant](./assistant.ts).

**Triage Interruption**: if an email is classed as `notify` the system shows it to the user:
* *User decision* ignore it or provide feedback.
* *Control flow* end if ignored or send feedback to the response agent.

**Write email**: show a draft email to the user:
* *User decision, Control flow*: ignore and end, respond with feedback, accept and continue or edit details and continue.

**Schedule meeting**: show the proposed meeting to the user:
* *User decision, Control flow*: ignore and end, respond with feedback, accept and continue or edit details and continue.

**Question**: Ask the user for further information:
* *User decision, Control flow*: ignore and end, respond with answer.

## Calling Interrupts
When we hit the interrupt the graph is paused before the tool call takes place. You can see the tool name in the `action` property and the `args` to accompany it. To handle the interrupt we use the `Command` interface. So far we have used it to:
* `goto`: route to the next node.
* `update`: modify the state.

Here we will use another feature:
* `resume`: provide a return value from an interrupt.

The return value should match the expected values according to the graph, in our case a `type` that can be `accept`, `edit`, `ignore` or `response`. Therfore returning `{type: 'accept'}` to the `resume` will continue our graph using the `accept` path.

### Review and accept
See [review and accept](./01_review_accept.ts).

This is relatively straight forward, we stream the response from the graph until we hit the interrupt (we examine it), then we use a Command to accept both the tool call results.

### Review and edit
See [review and edit](./02_review_edit.ts)
