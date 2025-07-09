import { EMAIL_INPUTS, EXPECTED_TOOL_CALLS, TRIAGE_OUTPUTS_LIST, RESPONSE_CRITERIA_LIST } from './datasets.ts';

const testCaseIx = 0;

console.log('Email input: ' + JSON.stringify(EMAIL_INPUTS[testCaseIx], null, 2).
    replace(/\\r/g, '\r').
    replace(/\\n/g, '\n'));
console.log('');
console.log('Expected triage output: ' + TRIAGE_OUTPUTS_LIST[testCaseIx]);
console.log('Expected tool calls: ' + EXPECTED_TOOL_CALLS[testCaseIx]);
console.log('Response criteia: ' + RESPONSE_CRITERIA_LIST[testCaseIx]);
