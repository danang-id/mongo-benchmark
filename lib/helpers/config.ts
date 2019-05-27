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

import fs from 'fs'
import path from 'path'
import { styles, terminal } from './terminal'

class Config {
	private readonly _configFileName: string
	private _config: IConfig
	private _configPath?: string

	constructor(configFileName: string = 'benchmark.config.json') {
		this._configFileName = configFileName
		this._config = {
			isLoaded: false,
			app: { dataDirectory: '' },
			database: { uriString: '' }
		}
	}

	public load() {
		if (this._configPath !== void 0 || this._config.isLoaded) {
			throw new Error('Configuration already loaded.')
		}
		const currentDir = process.cwd()
		if (fs.existsSync(this._configFileName)) {
			this._configPath = this._configFileName
		} else if (fs.existsSync(path.join(currentDir, this._configFileName))) {
			this._configPath = path.join(currentDir, this._configFileName)
		} else if (
			fs.existsSync(path.join(currentDir, '..', this._configFileName))
		) {
			this._configPath = path.join(currentDir, '..', this._configFileName)
		} else if (
			fs.existsSync(
				path.join(currentDir, '..', '..', this._configFileName)
			)
		) {
			this._configPath = path.join(
				currentDir,
				'..',
				'..',
				this._configFileName
			)
		}
		if (this._configPath === void 0) {
			throw new Error('No configuration file found')
		}
		this._config = JSON.parse(fs.readFileSync(this._configPath).toString())
		this._config.isLoaded = true
	}

	public get config(): IConfig {
		return this._config
	}
}

const config = new Config()

try {
	if (!config.config.isLoaded) {
		config.load()
	}
} catch (e) {
	terminal.printLine(e, styles.bold.red)
}

export default config.config

interface IConfig {
	isLoaded: boolean
	app: {
		dataDirectory: string
	}
	database: {
		uriString: string
	}
}
