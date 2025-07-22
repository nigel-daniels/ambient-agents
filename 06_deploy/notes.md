# Deploying the assistant
So far we have been building the email assistant with dummy tools and testing it locally. Now lets take a look at how this could be deployed to manage a real email in-box, in this case Gmail and Google Calendar accounts.

## Setting up Gmail
For this I created a gmail account called `aa_test` and assigned a gmail address to the account. This is the account I'll use for this exercise.

## Set-up APIs and access
For this we will need to set up access to APIs, authentication and then configure some authentication files:
### API access
1. For Gmail access, in your account, [enable the Gmail API](https://developers.google.com/workspace/gmail/api/quickstart/nodejs#enable_the_api). When you click the enable API button you may need to set up a project for the API access. I created one called `emailAssistant`. Once you have done this you can proceed to enable the API.
2. For Google Calendar access, in your account, [enable the Google Calendar API](https://developers.google.com/workspace/calendar/api/quickstart/nodejs). This time just check you are in the same project and enable the API.
### Create OAuth credentials
1. Authorize a desktop application [here](https://developers.google.com/workspace/gmail/api/quickstart/nodejs#authorize_credentials_for_a_desktop_application). When you click Goto Clients, ensure you are in the correct project.
2. It is possible you may need to create an application, when you do select external as the type.
3. Go to the **Clients** tab.
4. Then click **+ Create New Client**.
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

## Local Deployment
1. Set up the authentication, then run:
```
langgraph dev
```
2. In another terminal session run the ingest script (with appropriate parameters):
```
