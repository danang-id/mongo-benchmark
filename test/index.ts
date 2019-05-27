export function test() {
	const variableRegExp = new RegExp(/\{(.*?)\}/g)
	const string = 'Saya selalu memberikan { NAMA_MAKANAN } dan { NAMA_MINUMAN } kepada { NAMA_KEWAN}'
	let executionResult
	while ((executionResult = variableRegExp.exec(string)) !== null) {
		const enclosedString = executionResult[1].replace(/\s/g, '')
		console.log(enclosedString)
	}
}

test()
