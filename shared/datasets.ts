// Email evaluation dataset with ground truth classifications.

//////////// E-mails ////////////
// Common reply email
export const STANDARD_EMAIL = {
    author: 'Alice Smith <alice.smith@company.com>',
    to: 'John Doe <john.doe@company.com>',
    subject: 'Quick question about API documentation',
	emailThread: `Hi John,

I was reviewing the API documentation for the new authentication service and noticed a few endpoints seem to be missing from the specs. Could you help clarify if this was intentional or if we should update the docs?

Specifically, I'm looking at:
- /auth/refresh
- /auth/validate

Thanks!
Alice`
};

// Common notification email
export const NOTIFICATION_EMAIL = {
    author: 'System Admin <sysadmin@company.com>',
    to: 'Development Team <dev@company.com>',
    subject: 'Scheduled maintenance - database downtime',
	emailThread: `Hi team,

This is a reminder that we'll be performing scheduled maintenance on the production database tonight from 2AM to 4AM EST. During this time, all database services will be unavailable.

Please plan your work accordingly and ensure no critical deployments are scheduled during this window.

Thanks,
System Admin Team`
};

// Dataset examples, these get exported via a list
const EMAIL_INPUT_1 = {
    author: 'Alice Smith <alice.smith@company.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Quick question about API documentation',
	emailThread: `Hi Lance,

I was reviewing the API documentation for the new authentication service and noticed a few endpoints seem to be missing from the specs. Could you help clarify if this was intentional or if we should update the docs?

Specifically, I'm looking at:
- /auth/refresh
- /auth/validate

Thanks!
Alice`
};

const EMAIL_INPUT_2 = {
    author: 'Marketing Team <marketing@company.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'New Company Newsletter Available',
	emailThread: `Hello Lance,

The latest edition of our company newsletter is now available on the intranet. This month features articles on our Q2 results, upcoming team building activities, and employee spotlights.

Check it out when you have a chance!

Best regards,
Marketing Team`
};

const EMAIL_INPUT_3 = {
    author: 'System Admin <sysadmin@company.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Scheduled maintenance - database downtime',
	emailThread: `Hi Lance,

This is a reminder that we'll be performing scheduled maintenance on the production database tonight from 2AM to 4AM EST. During this time, all database services will be unavailable.

Please plan your work accordingly and ensure no critical deployments are scheduled during this window.

Thanks,
System Admin Team`
};

const EMAIL_INPUT_4 = {
    author: 'Project Manager <pm@client.com>',
    to: 'Lance Martin <lance@company.com>',
	subject: 'Tax season let\'s schedule call',
	emailThread: `Lance,

It's tax season again, and I wanted to schedule a call to discuss your tax planning strategies for this year. I have some suggestions that could potentially save you money.

Are you available sometime next week? Tuesday or Thursday afternoon would work best for me, for about 45 minutes.

Regards,
Project Manager`
};

const EMAIL_INPUT_5 = {
    author: 'HR Department <hr@company.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Reminder: Submit your expense reports',
	emailThread: `Hello Lance,

This is a friendly reminder that all expense reports for the previous month need to be submitted by this Friday. Please make sure to include all receipts and proper documentation.

If you have any questions about the submission process, feel free to reach out to the HR team.

Best regards,
HR Department`
};

const EMAIL_INPUT_6 = {
    author: 'Conference Organizer <events@techconf.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Do you want to attend this conference?',
	emailThread: `Hi Lance,

We're reaching out to invite you to TechConf 2025, happening May 15-17 in San Francisco.

The conference features keynote speakers from major tech companies, workshops on AI and ML, and great networking opportunities. Early bird registration is available until April 30th.

Would you be interested in attending? We can also arrange for group discounts if other team members want to join.

Best regards,
Conference Organizers`
};

const EMAIL_INPUT_7 = {
    author: 'Sarah Johnson <sarah.j@partner.com>',
    to : 'Lance Martin <lance@company.com>',
    subject: 'Can you review these docs before submission?',
	emailThread: `Lance,

I've attached the final version of our proposal for the Henderson project. Could you please review the technical specifications section (pages 15-20) before we submit it to the client on Friday?

Your expertise would really help ensure we've covered all the necessary details.

Thanks in advance,
Sarah`
};

const EMAIL_INPUT_8 = {
    author: 'Community Pool <info@cityrecreation.org>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Sign up daughter for swimming class',
	emailThread: `Dear Lance,

Summer swimming registration is now open! Based on your daughter's participation last year, we wanted to let you know that intermediate level classes are available on Mondays and Wednesdays at 4PM or Tuesdays and Thursdays at 5PM.

Classes begin June 1st and run for 8 weeks. Space is limited, so early registration is recommended.

Please let us know if you'd like to reserve a spot.

Regards,
City Recreation Department`
};

const EMAIL_INPUT_9 = {
    author: 'GitHub <notifications@github.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'PR #42: Comment from alex-dev',
	emailThread: `Hey there!

alex-dev commented on your pull request #42 in langchain-ai/project:

> I've reviewed the changes and everything looks good. Just one small suggestion for the error handling in auth_controller.py. Maybe we should add a timeout parameter to prevent hanging requests?

View the comment: https://github.com/langchain-ai/project/pull/42#comment-12345

---
You're receiving this because you authored the thread.
Reply to this email directly, or view it on GitHub
`
};

const EMAIL_INPUT_10 = {
    author: 'Team Lead <teamlead@company.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Quarterly planning meeting',
	emailThread: `Hi Lance,

It's time for our quarterly planning session. I'd like to schedule a 90-minute meeting next week to discuss our roadmap for Q3.

Could you let me know your availability for Monday or Wednesday? Ideally sometime between 10AM and 3PM.

Looking forward to your input on the new feature priorities.

Best,
Team Lead`
};

const EMAIL_INPUT_11 = {
    author: 'AWS Monitoring <no-reply@aws.amazon.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'System admin alert: Instance CPU utilization exceeds threshold',
	emailThread: `ALERT: High CPU Utilization

The following EC2 instance has exceeded the CPU utilization threshold of 90% for more than 15 minutes:

Instance ID: i-0b2d3e4f5a6b7c8d9
Region: us-west-2
Current utilization: 95.3%

This message is automatically generated. Please do not reply.
`
};

const EMAIL_INPUT_12 = {
    author: 'Client Success <success@vendor.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Your subscription will renew automatically',
	emailThread: `Hello Lance,

This is a friendly reminder that your annual subscription to our Developer Pro plan will automatically renew on 04/15/2025.

Your payment method ending in **** 4567 will be charged $1,499.00.

If you would like to make any changes to your subscription, please visit your account settings or contact our support team before the renewal date.

Thank you for your continued business!

Client Success Team`
};

const EMAIL_INPUT_13 = {
    author: 'Dr. Roberts <droberts@medical.org>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Annual checkup reminder',
	emailThread: `Hello Lance,

This is a reminder that it's time for your annual checkup. Our records show that your last visit was approximately one year ago.

Please call our office at (555) 123-4567 to schedule an appointment at your earliest convenience.

Best regards,
Dr. Roberts' Office`
};

const EMAIL_INPUT_14 = {
    author: 'Social Media Platform <notifications@social.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: '5 people liked your post',
	emailThread: `Hi Lance,

5 people liked your recent post about "Machine Learning Techniques for NLP"

See who liked your post and continue the conversation!

[View activity]

To unsubscribe from these notifications, adjust your settings here.
`
};

const EMAIL_INPUT_15 = {
    author: 'Project Team <project@company.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Joint presentation next month',
	emailThread: `Hi Lance,

The leadership team has asked us to prepare a joint presentation on our recent project successes for the all-hands meeting next month.

I've started putting together some slides and would appreciate your input on the technical architecture section. Could we schedule about 60 minutes sometime in the next week to collaborate on this?

I'm generally free on Tuesdays and Thursdays.

Thanks,
Project Team`
};

const EMAIL_INPUT_16 = {
    author: 'Marketing Team <marketing@openai.com>',
    to: 'Lance Martin <lance@company.com>',
    subject: 'Newsletter: New Model from OpenAI',
	emailThread: `Hi Lance,We're excited to announce that we've released a new model from OpenAI!

It's called 'GPT-5' and it's a successor to GPT-4.

It's available now and you can find more information [here](https://openai.com/gpt-5).

Thanks,
Marketing Team`
};

//////////// TRIAGE ////////////
// Triage outputs: 'ignore', 'notify', 'respond'
const TRIAGE_OUTPUT_1 = 'respond';
const TRIAGE_OUTPUT_2 = 'ignore';
const TRIAGE_OUTPUT_3 = 'notify';
const TRIAGE_OUTPUT_4 = 'respond';
const TRIAGE_OUTPUT_5 = 'notify';
const TRIAGE_OUTPUT_6 = 'respond';
const TRIAGE_OUTPUT_7 = 'respond';
const TRIAGE_OUTPUT_8 = 'respond';
const TRIAGE_OUTPUT_9 = 'notify';
const TRIAGE_OUTPUT_10 = 'respond';
const TRIAGE_OUTPUT_11 = 'notify';
const TRIAGE_OUTPUT_12 = 'notify';
const TRIAGE_OUTPUT_13 = 'respond';
const TRIAGE_OUTPUT_14 = 'ignore';
const TRIAGE_OUTPUT_15 = 'respond';
const TRIAGE_OUTPUT_16 = 'notify';

//////////// Responses ////////////
// Response criteria (when applicable)
const RESPONSE_CRITERIA_1 = '• Send email with write_email tool call to acknowledge the question and confirm it will be investigated';
const RESPONSE_CRITERIA_2 = '• No response needed\n• Ensure this is ignored';
const RESPONSE_CRITERIA_3 = '• No response needed\n• Ensure the user is notified';
const RESPONSE_CRITERIA_4 = '• Check calendar availability for Tuesday or Thursday afternoon next week with check_calendar_availability tool call\n• Confirm availability for a 45-minute meeting\n• Send calendar invite with schedule_meeting tool call\n• Send email with write_email tool call to acknowledge tax planning request and notifying that a meeting has been scheduled';
const RESPONSE_CRITERIA_5 = '• No response needed\n• Ensure the user is notified';
const RESPONSE_CRITERIA_6 = '• Express interest in attending TechConf 2025\n• Ask specific questions about AI/ML workshops\n• Inquire about group discount details\n• Send email with write_email tool call to express interest in attending TechConf 2025, ask specific questions about AI/ML workshops, and inquire about group discount details';
const RESPONSE_CRITERIA_7 = '• Explicitly agree to review the technical specifications\n• Acknowledge Friday deadline\n• Send email with write_email tool call to explicitly agree to review the technical specifications and acknowledge Friday deadline';
const RESPONSE_CRITERIA_8 = '• Send email with write_email tool call to express interest in registering daughter for swimming class';
const RESPONSE_CRITERIA_9 = '• No response needed\n• Ensure the user is notified';
const RESPONSE_CRITERIA_10 = '• Check calendar for 90-minute meeting availability for Monday or Wednesday with check_calendar_availability tool call\n• Send email acknowledging the request and providing availability with write_email tool call';
const RESPONSE_CRITERIA_11 = '• No response needed\n• Ensure the user is notified';
const RESPONSE_CRITERIA_12 = '• No response needed\n• Ensure the user is notified';
const RESPONSE_CRITERIA_13 = '• Acknowledge annual checkup reminder\n• Send email with write_email tool call to acknowledge annual checkup reminder';
const RESPONSE_CRITERIA_14 = '• No response needed\n• Ensure this is ignored';
const RESPONSE_CRITERIA_15 = '• Check calendar for 60-minute meeting availability for Tuesday or Thursday with check_calendar_availability tool call\n• Send calendar invite with schedule_meeting tool call\n• Send email agreeing to collaborate on the joint presentation and notifying that a meeting has been scheduled with write_email tool call';
const RESPONSE_CRITERIA_16 = '• No response needed\n• Ensure the user is notified';

//////////// Exports ////////////
export const EXAMPLES_TRIAGE = [
  [EMAIL_INPUT_1, TRIAGE_OUTPUT_1],
  [EMAIL_INPUT_2, TRIAGE_OUTPUT_2],
  [EMAIL_INPUT_3, TRIAGE_OUTPUT_3],
  [EMAIL_INPUT_4, TRIAGE_OUTPUT_4],
  [EMAIL_INPUT_5, TRIAGE_OUTPUT_5],
  [EMAIL_INPUT_6, TRIAGE_OUTPUT_6],
  [EMAIL_INPUT_7, TRIAGE_OUTPUT_7],
  [EMAIL_INPUT_8, TRIAGE_OUTPUT_8],
  [EMAIL_INPUT_9, TRIAGE_OUTPUT_9],
  [EMAIL_INPUT_10, TRIAGE_OUTPUT_10],
  [EMAIL_INPUT_11, TRIAGE_OUTPUT_11],
  [EMAIL_INPUT_12, TRIAGE_OUTPUT_12],
  [EMAIL_INPUT_13, TRIAGE_OUTPUT_13],
  [EMAIL_INPUT_14, TRIAGE_OUTPUT_14],
  [EMAIL_INPUT_15, TRIAGE_OUTPUT_15],
  [EMAIL_INPUT_16, TRIAGE_OUTPUT_16],
];

export const EMAIL_INPUTS = [
        EMAIL_INPUT_1, EMAIL_INPUT_2, EMAIL_INPUT_3, EMAIL_INPUT_4, EMAIL_INPUT_5,
        EMAIL_INPUT_6, EMAIL_INPUT_7, EMAIL_INPUT_8, EMAIL_INPUT_9, EMAIL_INPUT_10,
        EMAIL_INPUT_11, EMAIL_INPUT_12, EMAIL_INPUT_13, EMAIL_INPUT_14, EMAIL_INPUT_15,
        EMAIL_INPUT_16
	];

export const EMAIL_NAMES = [
    'email_input_1', 'email_input_2', 'email_input_3', 'email_input_4', 'email_input_5',
    'email_input_6', 'email_input_7', 'email_input_8', 'email_input_9', 'email_input_10',
    'email_input_11', 'email_input_12', 'email_input_13', 'email_input_14', 'email_input_15',
    'email_input_16'
];

export const RESPONSE_CRITERIA_LIST = [
    RESPONSE_CRITERIA_1, RESPONSE_CRITERIA_2, RESPONSE_CRITERIA_3, RESPONSE_CRITERIA_4, RESPONSE_CRITERIA_5,
    RESPONSE_CRITERIA_6, RESPONSE_CRITERIA_7, RESPONSE_CRITERIA_8, RESPONSE_CRITERIA_9, RESPONSE_CRITERIA_10,
    RESPONSE_CRITERIA_11, RESPONSE_CRITERIA_12, RESPONSE_CRITERIA_13, RESPONSE_CRITERIA_14, RESPONSE_CRITERIA_15,
    RESPONSE_CRITERIA_16
];

export const TRIAGE_OUTPUTS = [
    TRIAGE_OUTPUT_1, TRIAGE_OUTPUT_2, TRIAGE_OUTPUT_3, TRIAGE_OUTPUT_4, TRIAGE_OUTPUT_5,
    TRIAGE_OUTPUT_6, TRIAGE_OUTPUT_7, TRIAGE_OUTPUT_8, TRIAGE_OUTPUT_9, TRIAGE_OUTPUT_10,
    TRIAGE_OUTPUT_11, TRIAGE_OUTPUT_12, TRIAGE_OUTPUT_13, TRIAGE_OUTPUT_14, TRIAGE_OUTPUT_15,
    TRIAGE_OUTPUT_16
];

// Define expected tool calls for each email response based on content analysis
// Options: write_email, schedule_meeting, check_calendar_availability, done
export const EXPECTED_TOOL_CALLS = [
    ['write_email', 'done'],                                                    // email_input_1: API documentation question
    [],                                                                         // email_input_2: Newsletter notification - ignore
    [],                                                                         // email_input_3: System maintenance notification - notification only
    ['check_calendar_availability', 'schedule_meeting', 'write_email', 'done'], // email_input_4: Tax call scheduling
    [],                                                                         // email_input_5: Expense report reminder - notification only
    ['write_email', 'done'],                                                    // email_input_6: Conference invitation - needs response
    ['write_email', 'done'],                                                    // email_input_7: Document review request
    ['write_email', 'done'],                                                    // email_input_8: Swimming class registration
    [],                                                                         // email_input_9: GitHub PR comment - notification only
    ['check_calendar_availability', 'write_email', 'done'],                     // email_input_10: Planning meeting
    [],                                                                         // email_input_11: AWS alert - notification only
    [],                                                                         // email_input_12: Subscription renewal - ignore
    ['write_email', 'done'],                                                    // email_input_13: Doctor appointment reminder
    [],                                                                         // email_input_14: Social media notification - no action needed
    ['check_calendar_availability', 'schedule_meeting', 'write_email', 'done'], // email_input_15: Joint presentation
    [],                                                                         // email_input_16: Newsletter - notification only
];
