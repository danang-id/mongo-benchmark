/**
 * Copyright 2019, Danang Galuh Tegar Prasetyo.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import chalk from 'chalk'
import readline from 'readline'

class Terminal implements ITerminal {
	private readonly stdin: NodeJS.ReadStream
	private readonly stdout: NodeJS.WriteStream

	constructor(stdin: NodeJS.ReadStream, stdout: NodeJS.WriteStream) {
		this.stdin = stdin
		this.stdout = stdout
	}

	public print(text: string, styler?: TerminalStyler): Terminal {
		if (styler !== void 0) {
			text = styler(text)
		}
		this.stdout.write(Buffer.from(text))
		return this
	}

	public printLine(text: string, styler?: TerminalStyler): Terminal {
		return this.print(text, styler).newLine()
	}

	public clearLine() {
		readline.clearLine(this.stdout, 0)
		readline.cursorTo(this.stdout, 0)
		return this
	}

	public center(
		text: string,
		wingCharacter: string = ' ',
		styler?: TerminalStyler
	): Terminal {
		const terminalLength = this.stdout.columns || 30
		const textLength = text.length + 2
		const length =
			terminalLength >= textLength ? terminalLength - textLength : 0
		const leftLength = Math.floor(length / 2)
		const rightLength = leftLength + (length % 2 !== 0 ? 1 : 0)
		wingCharacter = wingCharacter.charAt(0)
		let _text = ''
		for (let i = 0; i < leftLength; i++) {
			_text = _text.concat(wingCharacter)
		}
		_text = _text.concat(text)
		for (let i = 0; i < rightLength; i++) {
			_text = _text.concat(wingCharacter)
		}
		return this.print(_text, styler)
	}

	public newLine(line: number = 1): Terminal {
		if (line < 1) {
			return this
		}
		for (let l = 0; l < line; l++) {
			this.stdout.write(Buffer.from('\n'))
		}
		return this
	}

	public clear(): Terminal {
		this.stdout.write(Buffer.from('\u001b[2J\u001b[0;0H'))
		return this
	}

	public async ask(question: string): Promise<string> {
		const readlineInterface = readline.createInterface({
			input: this.stdin,
			output: this.stdout
		})
		return new Promise((resolve) => {
			readlineInterface.question(question, answer => {
				readlineInterface.close()
				resolve(answer)
			})
		})
	}
}

export function createTerminal(options: ITerminalOptions = {}) {
	const stdin = options.stdin ? options.stdin : process.stdin
	const stdout = options.stdout ? options.stdout : process.stdout
	return new Terminal(stdin, stdout)
}

export const terminal = createTerminal()

export const styles = chalk

interface ITerminal {
	print: (text: string, styler?: TerminalStyler) => Terminal
	printLine: (text: string, styler?: TerminalStyler) => Terminal
	clearLine: () => Terminal
	center: (
		text: string,
		wingCharacter?: string,
		styler?: TerminalStyler
	) => Terminal
	newLine: (line?: number) => Terminal
	clear: () => Terminal
	ask: (question: string) => Promise<string>
}

interface ITerminalOptions {
	stdin?: NodeJS.ReadStream
	stdout?: NodeJS.WriteStream
}

type TerminalStyler = (text: string) => string
