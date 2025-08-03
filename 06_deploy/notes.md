# Deploying the assistant
So far we have been building the email assistant with dummy tools and testing it locally. Now lets take a look at how this could be deployed to manage a real email in-box, in this case Gmail and Google Calendar accounts.

## Setting up Gmail
For this I created a gmail account called `aa_test` and assigned a gmail address to the account. This is the account I'll use for this exercise. You can use your own account or create one for the testing.

## Set-up APIs and access
For this we will need to set up access to APIs, authentication and then configure some authentication files:
### API access
1. For Gmail access, in your account, [enable the Gmail API](https://developers.google.com/workspace/gmail/api/quickstart/nodejs#enable_the_api). When you click the enable API button you may need to set up a project for the API access. I created one called `emailAssistant`. Once you have done this you can proceed to enable the API.
2. For Google Calendar access, in your account, [enable the Google Calendar API](https://developers.google.com/workspace/calendar/api/quickstart/nodejs). This time just check you are in the same project and enable the API.
### Create OAuth credentials
1. Authorize a desktop application [here](https://developers.google.com/workspace/gmail/api/quickstart/nodejs#authorize_credentials_for_a_desktop_application). When you click Goto Clients, ensure you are in the correct project.
2. It is possible you may need to create an application, when you do select external as the type.
3. Go to the **Clients** tab.
4. Then click **Create New Client**.
5. Select `Desktop app` as the type.
6. When the **OAuth client created** modal pops-up click on the **Download JSON** option and keep that file for the next step.
#### Set-up for testing
1. Go to the **Audience** tab.
2. Under *Test Users* click **+ Add users**.
3. Add the Gmail address you will use for testing this. We will use this in the next step.
#### Set-up Auth files
1. In the `06_deploy` directory we add a `.secrets` folder. In this case `/ambient-agents/06_deploy/.secrets`.
2. Move the JSON file we downloaded during the OAuth set up into the new folder.
3. Rename the JSON file to `secrets.json`.
4. In the directory run the utility:
```
node gmail_setup.js
```
5. Log in to Gmail using the test account we assigned to the *Test Users*.
6. This creates a `token.json` file in the `.secrets` directory. This is used for API access later.

## Gmail tools
The key difference between the previous assistants and the Gmail version is, this version has tools that work with a real service. All of these new tools and capabilities can be found in the `tools` directory. The key new items are the:
* [Check calendar tool](./tools/check_calendar_tool.ts)
* [Schedule meeting tool](./tools/schedule_meeting_tool.ts)
* [Fetch e-mails tool](./tools/fetch_email_tool.ts)
* [Send e-mail tool](./tools/send_email_tool.ts)

The additional tools `markEmailAsRead` and the utility to get Gmail credentials `getCredentials` can be found in:
* [Tool utilities](./tools/tool_utils.ts)

## Prompt updates
In the `prompts.ts` file update the `DEFAULT_BACKGROUND` prompt to match your details.

## Local Deployment
1. Set up the authentication, then run:
```
npx @langchain/langgraph-cli dev
```
2. Send a test email to the Gmail address you are using. For example:
```
To: <YOUR GMAIL ADDRESS>
From: <ANOTHER ACCOUNT>
Subject: Review source code
Content:
Hi,

Please can you review the source code I just checked into the test branch? Let me know what you think.

Best regards,

<YOUR NAME>
```
3. In another terminal session run the ingest script (with appropriate parameters), for example:
```
node ingest.js -e <YOUR GMAIL ADDRESS> --include-read
```
This will trigger the collection of the email and submit it to the locally running instance of the assistant.

4. Now check the [Agent Inbox](https://dev.agentinbox.ai/) to review the response email. You may need to set this up, use:

* URL: `http://localhost:2024/`
* Graph ID: `assistant`
* Name: `Gmail Assitant`

Find the message you need to review. If you like it, *Accept* the response and it will arrive in your sending accounts in-box.

### Ingest tool
The `injest.js` tool is a simple tool designed to collect emails from your Gmail account and submit them to the assistant for processing. It is a flexible tool and it accepts the following options:

| Option | Alt name | Parameter | Description | Default | Required |
|:-------|:---------|:---------:|:------------|:-------:|:--------:|
|-e|--email|\<email\>|Gmail address to fetch messages for||✅|
|-m|--minutes-since|\<number\>|Only retrieve emails newer than this many minutes|120||
|-g|--graph|\<graph\>|Name of the LangGraph to use|'assistant'||
|-u|--url|<url>|URL of the LangGraph deployment|'http://localhost:2024'||
||--early||Early stop after processing one email|true||
||--include-read||Include emails that have already been read|true||
||--skip-filters||Skip filtering of emails|true||
|-h|--help||Display help for command|||

## Hosted Deployment
**Note:** As I do not have a LangSmith Plus account I have not tested these steps. However I have tested the Cron tool locally. Should you find any issues with the Hosted Deployment please update the code/docs appropriately and make a pull request!
1. Navigate to the deployments page in LangSmith Click *New Deployment*.
2. Connect it to your fork of the this repo and desired branch (there is a `langgraph.json` file in the root for this).
3. Give it a name like Yourname-Email-Assistant
4. Add the following environment variables:
   * `OPENAI_API_KEY`
   * `GMAIL_SECRET` - This is the full dictionary in .secrets/secrets.json.
   * `GMAIL_TOKEN` - This is the full dictionary in .secrets/token.json.
5. Click Submit.
6. Get the API URL (https://your-email-assistant-xxx.us.langgraph.app) from the deployment page.

To ingest emails you can use the `ingest.js` tool as we did before but use the API URL from step 6. Again visit the Agent Inbox to decide how to handle the emails.

### Cron Job tool
To automate the ingest process so you don't have to keep running the ingest tool manually there is a script for setting up a Cron Job to run this process at regular intervals.
