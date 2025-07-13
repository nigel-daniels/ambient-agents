import { InMemoryStore } from '@langchain/langgraph';

// Instanciate a new store in the memory
const inMemoryStore = new InMemoryStore();

// Now set up a user and a namespece (here we just use 'memories')
// The name space is an array representing a hierachical path
const userId = '1';
const namespaceForMemory = [userId, 'memory'];

// Now let's store a memeory
const key = 'food_preference';
const value = 'I like pizza.';

await inMemoryStore.put(namespaceForMemory, key, value);

// Let's take a look at what we stored
const memories = await inMemoryStore.search(namespaceForMemory);
console.log(JSON.stringify(memories[memories.length-1], null, 2));
