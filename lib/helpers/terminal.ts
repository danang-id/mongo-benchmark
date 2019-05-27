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

class Terminal implements ITerminal {
	private readonly stdout: NodeJS.WriteStream

	constructor(stdout: NodeJS.WriteStream) {
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
}

export function createTerminal(options: ITerminalOptions = {}) {
	const stdout = options.stdout ? options.stdout : process.stdout
	const terminal = new Terminal(stdout)
	return terminal
}

export const terminal = createTerminal()

export const styles = chalk

interface ITerminal {
	print: (text: string, styler?: TerminalStyler) => Terminal
	printLine: (text: string, styler?: TerminalStyler) => Terminal
	center: (
		text: string,
		wingCharacter?: string,
		styler?: TerminalStyler
	) => Terminal
	newLine: (line?: number) => Terminal
	clear: () => Terminal
}

interface ITerminalOptions {
	stdout?: NodeJS.WriteStream
}

type TerminalStyler = (text: string) => string
