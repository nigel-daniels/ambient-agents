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
You also need an API key to use LangSmith, you can sign up and get a key [here](https://smith.langchain.com). As per the OpenAI key you need to export this too:
```
export LANGCHAIN_API_KEY='your_secret_key_value'
```
When you restart the shell or your machine the environment variables `OPENAI_API_KEY` and `LANGCHAIN_API_KEY` will be in place.

### Node and JS
Before trying any of the exercises don't forget to run `npm install` in the `./ambient-agents` directory to install the Node modules needed.

In each subdirectory you will find a `*.js` or a `*.ts` file and, sometimes, some supporting files. Each file contains multiple prompts.

In most cases the initial exercise is ready to run and the other exercises are commented out using the `\* ... *\` comment markers. These equate to the major steps in the Python Jupyter notebooks. In these cases the commented code blocks will have their own calls to the LLM. If you uncomment these blocks then be sure to comment out the last to calls above while you run that exercise, it will reduce run time and costs. If you need to retain any blocks for future exercises they will be noted as such.
