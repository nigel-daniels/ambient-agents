import format from 'string-template';

let foo = 'hello {name}!';

const name = 'world';

console.log(format(foo, {
	name: name
}));
