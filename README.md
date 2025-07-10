# Building Ambient Agents with LangGraph
This is all based on the LangChain Academy course [Building Ambient Agents with LangGraph](https://academy.langchain.com/courses/take/ambient-agents/) course. In this repository I have converted all of the examples from Python to JavaScript/TypeScript and I've ensured the notes are all available in markdown. Generally the notes and code are very similar but if there is a key difference I've tried to highlight it. I've also endeavored to make the variable names line up but make them JS style, for example Python `email_input` becomes `emailInput` in the code here. I also broke the code into separate files as these were not created in a Jupyter notebook, this lets you run each demo independently in it's own lesson directory. So follow the lesson links, these reflect the notes the course offers and link to the relevant code and config.

## Lessons
- [LangGraph 101](./01_LangGraph_101/notes.md)
- [Building Agents](./02_building_agents/notes.md)
- [Agent Evaluations](./03_agent_evaluation/notes.md)
- [Human-in-the-Loop](./04-human_in_the_loop/notes.md)
- [Memory](./05-memory/notes.md)
- [Deployment](./06-deployment/notes.md)

## Set-Up
### API Keys
If you want to try these out you will first need to setup your own ChatGPT secret key in your local environment. [Here](https://chatgpt.en.obiscr.com/blog/posts/2023/How-to-get-api-key/) is how you get a key. You also need an API key to use LangSmith as well as a flag, you can sign up and get a key [here](https://smith.langchain.com). You have two choices on how these are accessed by the code.
#### Export to the global environment
You can export these values in your global environment so they can be accessed through the shell you are running. For example in Mac OS, assuming you are using `zsh`, append the following to the file `.zshenv` in you own home directory:
```sh
export OPENAI_API_KEY='your_secret_key_value'
export LANGCHAIN_API_KEY='your_secret_key_value'
export LANGSMITH_TRACING=true
export LANGSMITH_PROJECT='interrupt-workshop'
```
When you restart the shell or your machine the environment variables `OPENAI_API_KEY`, `LANGCHAIN_API_KEY`, `LANGSMITH_TRACING` and `LANGSMITH_PROJECT` will be in place.
#### Local .env files
The code is all instrumented to look in the local directory for a `.env` file and load the content into the process environment. To use this approach create a `.env` file in each lesson directory and ensure it has the following content:
```
OPENAI_API_KEY='your_openai_api_key'
LANGSMITH_TRACING=true
LANGSMITH_API_KEY='your_langsmith_api_key'
LANGSMITH_PROJECT='interrupt-workshop'
```
### Node and JS
Before trying any of the demos don't forget to run `npm install` in the `./ambient-agents` directory to install the Node modules needed. Note: This installs the LangGraph command line tools (such as `langgraphjs`) locally. If you want to install them globally then run:
```sh
npm install -g @langchain/langgraph-cli
```

In each subdirectory you will find some `*.js` or `*.ts` files and, sometimes, some supporting files.

In most cases the each demo is ready to run, occasionally other exercises are commented out using the `\* ... *\` comment markers. Consult the lesson notes for more details.
