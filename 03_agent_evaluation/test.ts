
const referenceOutputs = {
	expectedCalls: ['a', 'b', 'c']
};

const extractedToolCalls = ['a', 'b', 'd'];

const missingCalls = referenceOutputs.expectedCalls.filter(call =>
	!extractedToolCalls.includes(call.toLowerCase())
);

const extraCalls = extractedToolCalls.filter(call =>
	!referenceOutputs.expectedCalls.includes(call.toLowerCase())
);

console.log('missingCalls: ' + missingCalls);
console.log('extraCalls: ' + extraCalls);
