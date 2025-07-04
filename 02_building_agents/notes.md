# Building Agents
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
Here is what we are aiming to build and in this part of the course we are building the `Agent` block. We will also use the `Testing` part to ensure the agent is performant. We do this at such an early stage as performance quality topped the concerns of agent developers (41% said this was a key issue, more than twice the next two concerns, cost and safety concerns).

## Benchmarking the agent
```
------------              ---------------      ------------
| Dataset  | e-mail input |    Agent    |      |   Test   |        Test
| Examples |------------->| (LangGraph) |----->| Function |-----> output
------------              ---------------      ------------
     |                 Expected output               ^
     -------------------------------------------------
```
We can look at how to build datasets and test to ensure the agent is performant.
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
