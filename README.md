# Building Ambient Agents with LangGraph
This is all based on the LangChain Academy course [Building Ambient Agents with LangGraph](https://academy.langchain.com/courses/take/ambient-agents/) course. In this repository I have converted all of the examples from Python to JavaScript/TypeScript.

## Lessons
- [LangGraph 101](./01_LangGraph_101/notes.md)
- [Building Agents](./02_building_agents/notes.md)
- [Agent Evaluations](./03_agent_evaluation/notes.md)
- [Human-in-the-Loop](./04-human_in_the_loop/notes.md)
- [Memory](./05-memory/notes.md)
- [Deployment](./06-deployment/notes.md)

## Set-Up
### API Keys
If you want to try these out you will first need to setup your own ChatGPT secret key in your local environment. [Here](https://chatgpt.en.obiscr.com/blog/posts/2023/How-to-get-api-key/) is how you get a key. Once you have this put it in a local (server side) environment variable. For example in Mac OS, assuming you are using `zsh`, append the following to the file `.zshenv` in you own home directory:
```
export OPENAI_API_KEY='your_secret_key_value'
```
You also need an API key to use LangSmith as well as a flag, you can sign up and get a key [here](https://smith.langchain.com). As per the OpenAI key you need to export this too:
```
export LANGCHAIN_API_KEY='your_secret_key_value'
export LANGSMITH_TRACING=true
```
When you restart the shell or your machine the environment variables `OPENAI_API_KEY`, `LANGCHAIN_API_KEY` and `LANGSMITH_TRACING` will be in place.

### Node and JS
Before trying any of the demos don't forget to run `npm install` in the `./ambient-agents` directory to install the Node modules needed. Note: This installs the LangGraph command line tools (such as `langgraphjs`) locally. If you want to install them globally then run:
```
npm install -g @langchain/langgraph-cli
```

In each subdirectory you will find a `*.js` or a `*.ts` file and, sometimes, some supporting files.

In most cases the entire demo is ready to run, occasionally other exercises are commented out using the `\* ... *\` comment markers.
