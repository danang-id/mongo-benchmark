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

export class Flows implements IFlows {

	private readonly DATABASE_NAME: string
	private readonly DATABASE_DIRECTORY: fs.PathLike

	private _flowsConfig: IFlowsConfig
	private _isFlowsConfigLoaded: boolean

	constructor(dataDirectory: string, databaseName: string) {
		this.DATABASE_NAME = databaseName
		this.DATABASE_DIRECTORY = path.join(dataDirectory, this.DATABASE_NAME)
		this._flowsConfig = {
			collections: {},
			readOtherCollections: false
		}
		this._isFlowsConfigLoaded = false
	}

	private get flowsConfigFilePath() {
		return path.join(<string>this.DATABASE_DIRECTORY, 'flows.json')
	}

	public get hasFlowsJSON() {
		try {
			return fs.existsSync(this.flowsConfigFilePath)
		} catch (error) {
			return false
		}
	}

	public get flowsConfig() {
		return this._flowsConfig
	}

	public loadFlowsConfig() {
		if (this.hasFlowsJSON && !this._isFlowsConfigLoaded) {
			try {
				this._flowsConfig = JSON.parse(fs.readFileSync(this.flowsConfigFilePath).toString())
				this._isFlowsConfigLoaded = true
			} catch (error) {
				// Do nothing
			}
		}
	}

	public validateFlowsConfig(options: IFlowsConfigValidatorOptions) {
		const { collectionName, propertyKey } = options
		const result: IFlowsConfigValidationResult = { valid: false }
		if (!this.hasFlowsJSON || !this._isFlowsConfigLoaded) {
			result.error = new Error ('This database has no flows config nor have it loaded.')
			result.errorCode = 10
			return result
		}
		const collectionFlowsConfigs = this.flowsConfig.collections
		if (!collectionFlowsConfigs[collectionName]) {
			result.error = new Error('Collection ' + collectionName + ' has now flows config defined.')
			result.errorCode = 11
			return result
		}
		const collectionFlowsConfig = collectionFlowsConfigs[collectionName]
		if (!collectionFlowsConfig[propertyKey]) {
			result.error = new Error('Property key ' + collectionName + '[' + propertyKey + '] has now flows config defined.')
			result.errorCode = 12
			return result
		}
		const propertyFlowsConfig = collectionFlowsConfig[propertyKey]
		if (!propertyFlowsConfig.refCollection) {
			result.error = new Error('A required "refCollection" config is not defined in ' + collectionName + '[' + propertyKey + '] flows config.')
			result.errorCode = 20
			return result
		}
		if (!propertyFlowsConfig.findById && !propertyFlowsConfig.findOne) {
			result.error = new Error('One of these config "findById" or "findOne" should exists in ' + collectionName + '[' + propertyKey + '] flows config.')
			result.errorCode = 21
			return result
		}
		if (!!propertyFlowsConfig.findById && !!propertyFlowsConfig.findOne) {
			result.error = new Error('"findById" and "findOne" config should not exist both in ' + collectionName + '[' + propertyKey + '] flows config.')
			result.errorCode = 22
			return result
		}
		result.valid = true
		return result
	}

	public parseFlowsConfig(options: IFlowsConfigParserOptions) {
		const { collectionName, propertyKey } = options
		const result: IFlowsConfigParsingResult = { parsed: false, propertyFlowsConfig: { refCollection: '' } }
		if (!this.hasFlowsJSON || !this._isFlowsConfigLoaded) {
			result.error = new Error ('This database has no flows config nor have it loaded.')
			result.errorCode = 10
			return result
		}
		const collectionFlowsConfigs = this.flowsConfig.collections
		if (!collectionFlowsConfigs[collectionName]) {
			result.error = new Error('Collection ' + collectionName + ' has now flows config defined.')
			result.errorCode = 11
			return result
		}
		const collectionFlowsConfig = collectionFlowsConfigs[collectionName]
		if (!collectionFlowsConfig[propertyKey]) {
			result.error = new Error('Property key ' + collectionName + '[' + propertyKey + '] has now flows config defined.')
			result.errorCode = 12
			return result
		}
		const propertyFlowsConfig = collectionFlowsConfig[propertyKey]
		propertyFlowsConfig.refCollection = Flows.variableParser(propertyFlowsConfig.refCollection, options)
		if (!!propertyFlowsConfig.findById) {
			propertyFlowsConfig.findById = Flows.variableParser(propertyFlowsConfig.findById, options)
		}
		if (!!propertyFlowsConfig.findOne) {
			for (const key in propertyFlowsConfig.findOne) {
				if (propertyFlowsConfig.findOne.hasOwnProperty(key)) {
					propertyFlowsConfig.findOne[key] = Flows.variableParser(propertyFlowsConfig.findOne[key], options)
				}
			}
		}
		result.parsed = true
		result.propertyFlowsConfig = propertyFlowsConfig
		return result
	}

	private static variableParser(string: string, options: IFlowsConfigParserOptions): string {
		const { row, value } = options
		const variableRegExp = new RegExp(/\{(.*?)\}/g)
		let executionResult
		while ((executionResult = variableRegExp.exec(string)) !== null) {
			const searchString = executionResult[0]
			const enclosedString = executionResult[1].toLowerCase().replace(/\s/g, '')
			const enclosedStringArray = enclosedString.split('.')
			const baseVariableString = enclosedStringArray[0]
			if (baseVariableString === 'row' || baseVariableString === 'value') {
				let replaceWith = baseVariableString === 'row' ? row : value
				if (enclosedStringArray.length > 1) {
					for (let i = 1; i < enclosedStringArray.length; i++) {
						const key = enclosedStringArray[i]
						replaceWith = replaceWith[key]
					}
				}
				string = string.replace(searchString, replaceWith)
			}
		}
		return string
	}

}

export default Flows

interface IFlows {
	hasFlowsJSON: boolean
	flowsConfig: IFlowsConfig
	loadFlowsConfig: () => void
	validateFlowsConfig: (options: IFlowsConfigValidatorOptions) => IFlowsConfigValidationResult
	parseFlowsConfig: (options: IFlowsConfigParserOptions) => IFlowsConfigParsingResult
}

interface IFlowsConfigValidatorOptions {
	collectionName: string
	propertyKey: string
}

interface IFlowsConfigValidationResult {
	valid: boolean
	error?: Error
	errorCode?: number
}

interface IFlowsConfigParserOptions {
	collectionName: string
	propertyKey: string
	row: { [key: string]: any }
	value: any
}

interface IFlowsConfigParsingResult {
	parsed: boolean
	propertyFlowsConfig: IPropertyFlowsConfig
	error?: Error
	errorCode?: number
}

interface IFlowsConfig {
	collections: {
		[ key: string ]: ICollectionFlowsConfig
	}
	readOtherCollections: boolean
}

interface ICollectionFlowsConfig {
	[ key: string ]: IPropertyFlowsConfig
}

interface IPropertyFlowsConfig {
	refCollection: string
	findById?: string
	findOne?: { [key: string]: any }
}
