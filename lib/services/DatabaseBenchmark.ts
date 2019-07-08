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

import fs from 'fs-extra'
import path from 'path'
import { EventEmitter } from 'events'

import DatabaseService from './Database'
import { DatabaseEvent } from './Database'
import Flows from '../helpers/flows'

class DatabaseBenchmark extends EventEmitter{
	private readonly DATABASE_NAME: string
	private readonly DATABASE_SERVICE: DatabaseService
	private readonly DATABASE_DIRECTORY: fs.PathLike

	private readonly flowsConfig: Flows
	private readonly benchmarkResults: IBenchmarkResults
	private readonly writtenResults: string[]
	private readonly benchmarkToRun: { 
		create: boolean,
		read: boolean, 
		update: boolean,
		delete: boolean
	}

	constructor(dataDirectory: string, databaseName: string, benchmarkToRun: { 
		create: boolean,
		read: boolean, 
		update: boolean,
		delete: boolean
	}) {
		super()
		this.DATABASE_NAME = databaseName
		this.DATABASE_SERVICE = new DatabaseService(this.DATABASE_NAME)
		this.DATABASE_DIRECTORY = path.join(dataDirectory, this.DATABASE_NAME)
		this.flowsConfig = new Flows(dataDirectory, databaseName)
		this.benchmarkResults = {
			create: {},
			read: {},
			update: {},
			delete: {},
			isFinished: false,
			hasFlowsConfig: this.flowsConfig.hasFlowsJSON
		}
		this.writtenResults = []
		this.benchmarkToRun = benchmarkToRun
		this.addDatabaseServiceEventListener(DatabaseEvent.error, (error: Error) => {
			this.emit(DatabaseBenchmarkEvent.benchmarkError, error)
		})
	}

	private isCollectionDirectory(_path: fs.PathLike) {
		try {
			return fs.lstatSync(_path).isDirectory()
		} catch (error) {
			return false
		}
	}

	private isDataFile(_path: fs.PathLike, _preExtension: string) {
		try {
			const isFile = fs.lstatSync(_path).isFile()
			const pathArray = _path.toString().split('.')
			const extension = pathArray[pathArray.length - 1]
			const preExtension = pathArray[pathArray.length - 2]
			const isJSON = extension.toLowerCase() === 'json'
			const hasCorrectPreExtension =
				preExtension.toLocaleLowerCase() === _preExtension
			if (isFile && isJSON && hasCorrectPreExtension) {
				const data = fs.readFileSync(_path)
				const parsed = JSON.parse(data.toString())
				return !!parsed
			} else {
				return false
			}
		} catch (error) {
			return false
		}
	}

	private isCreateDataFile(_path: fs.PathLike) {
		return this.isDataFile(_path, 'create')
	}

	private isUpdateDataFile(_path: fs.PathLike) {
		return this.isDataFile(_path, 'update')
	}

	private isDatabaseDirectoryPathValid() {
		try {
			return fs.existsSync(this.DATABASE_DIRECTORY)
		} catch (error) {
			return false
		}
	}

	private isCollectionDirectoryPathValid(collection: string) {
		try {
			return fs.existsSync(
				path.join(<string>this.DATABASE_DIRECTORY, collection)
			)
		} catch (error) {
			return false
		}
	}

	private isDataFilePathValid(collection: string, data: string) {
		try {
			return fs.existsSync(
				path.join(<string>this.DATABASE_DIRECTORY, collection, data)
			)
		} catch (error) {
			return false
		}
	}

	private getCollections() {
		if (!this.isDatabaseDirectoryPathValid()) {
			throw new Error('Database directory path is not valid!')
		}
		return <string[]>(
			fs.readdirSync(this.DATABASE_DIRECTORY).filter(collectionLike => {
				return this.isCollectionDirectory(
					path.join(<string>this.DATABASE_DIRECTORY, collectionLike)
				)
			})
		)
	}

	private getCollectionDataSets(collection: string) {
		if (!this.isCollectionDirectoryPathValid(collection)) {
			throw new Error('Collection directory path is not valid!')
		}
		const collectionDirectoryListing = fs.readdirSync(
			path.join(<string>this.DATABASE_DIRECTORY, collection)
		)
		const createDataFilePaths: fs.PathLike[] = collectionDirectoryListing.filter(
			dataLike =>
				this.isCreateDataFile(
					path.join(
						<string>this.DATABASE_DIRECTORY,
						collection,
						dataLike
					)
				)
		)
		const updateDataFilePaths: fs.PathLike[] = collectionDirectoryListing.filter(
			dataLike =>
				this.isUpdateDataFile(
					path.join(
						<string>this.DATABASE_DIRECTORY,
						collection,
						dataLike
					)
				)
		)
		const dataSets: ICollectionDataSet[] = []
		for (const createDataFilePath of createDataFilePaths) {
			let updateDataFilePath = createDataFilePath
				.toString()
				.substring(0, createDataFilePath.toString().length - 11)
			if (
				updateDataFilePaths.findIndex(
					path => path.toString() === updateDataFilePath
				) === -1
			) {
				updateDataFilePath = createDataFilePath.toString()
			}
			dataSets.push({
				createDataPath: createDataFilePath.toString(),
				updateDataPath: updateDataFilePath
			})
		}
		return dataSets
	}

	private getDataSets() {
		try {
			const collections = this.getCollections()
			const dataSets: IDataSet = {}
			for (const collection of collections) {
				dataSets[collection] = <ICollectionDataSet[]>(
					this.getCollectionDataSets(collection)
				)
			}
			return dataSets
		} catch (error) {
			throw error
		}
	}

	private getDataFileContent(collection: string, dataPath: string) {
		if (!this.isDataFilePathValid(collection, dataPath)) {
			throw new Error('Data file path is not valid!')
		}
		const _path = path.join(
			<string>this.DATABASE_DIRECTORY,
			collection,
			dataPath
		)
		try {
			const isFile = fs.lstatSync(_path).isFile()
			const pathArray = _path.toString().split('.')
			const extension = pathArray[pathArray.length - 1]
			const isJSON = extension.toLowerCase() === 'json'
			return isFile && isJSON
				? JSON.parse(fs.readFileSync(_path).toString())
				: {}
		} catch (error) {
			throw error
		}
	}

	private async runCreateBenchmark(
		benchmarkRequest: ICreateBenchmarkRequest
	) {
		let session = null
		try {
			session = await this.DATABASE_SERVICE.startTransaction()
			const benchmarkResult: IBenchmarkResult = {}
			for (const collection in benchmarkRequest) {
				if (benchmarkRequest.hasOwnProperty(collection)) {
					benchmarkResult[collection] = []
					for (const { data, dataPath } of benchmarkRequest[
						collection
					]) {
						const hrStart = process.hrtime()
						const {
							result,
							insertedId
						} = await this.DATABASE_SERVICE.create(collection, data)
						if (result.ok) {
							const hrEnd = process.hrtime(hrStart)
							this.emit(DatabaseBenchmarkEvent.operationDone, collection, 'createResult', String(insertedId), result)
							benchmarkResult[collection].push({
								hrtime: hrEnd,
								data: data,
								id: insertedId,
								dataPath: dataPath
							})
						}
					}
				}
			}
			await this.DATABASE_SERVICE.commitTransaction(session)
			return benchmarkResult
		} catch (error) {
			if (session !== null) {
				await this.DATABASE_SERVICE.abortTransaction(session)
			}
			throw error
		}
	}

	private async runReadBenchmark(benchmarkRequest: IReadBenchmarkRequest) {
		try {
			const benchmarkResult: IBenchmarkResult = {}
			const collectionFlowsConfigs = this.flowsConfig.flowsConfig.collections
			const readAllCollections = this.flowsConfig.hasFlowsJSON ? this.flowsConfig.flowsConfig.readOtherCollections : true
			for (const collection in benchmarkRequest) {
				if (benchmarkRequest.hasOwnProperty(collection)) {
					const collectionFlowsConfig = this.flowsConfig.hasFlowsJSON ? collectionFlowsConfigs[collection] : void 0
					const hasCollectionFlowsConfig = collectionFlowsConfig !== void 0
					if (readAllCollections || hasCollectionFlowsConfig) {
						benchmarkResult[collection] = []
						for (const { id } of benchmarkRequest[collection]) {
							const hrStart = process.hrtime()
							const dataContent = await this.DATABASE_SERVICE.read(
								collection,
								{ _id: id }
							)
							const hrEnd = process.hrtime(hrStart)
							if (hasCollectionFlowsConfig) {
								for (const propertyKey in collectionFlowsConfig) {
									if (
										collectionFlowsConfig.hasOwnProperty(propertyKey)
										&& dataContent.hasOwnProperty(propertyKey)
									) {
										let propertyFlowsConfig = collectionFlowsConfig[propertyKey]
										const validationResult = this.flowsConfig.validateFlowsConfig({
											propertyKey, collectionName: collection
										})
										if (validationResult.valid) {
											const row = dataContent
											const value = dataContent[propertyKey] !== void 0 ? dataContent[propertyKey] : ''
											const parsingResult = this.flowsConfig.parseFlowsConfig({
												propertyKey, collectionName: collection, row, value
											})
											if (parsingResult.parsed) {
												propertyFlowsConfig = parsingResult.propertyFlowsConfig
											}
										}
										const condition = propertyFlowsConfig.findById !== void 0
											? { _id: <string>propertyFlowsConfig.findById }
											: <{ [key: string]: any }>propertyFlowsConfig.findOne
										const repetitiveHrStart = process.hrtime()
										dataContent[propertyKey] = await this.DATABASE_SERVICE.read(
											propertyFlowsConfig.refCollection,
											condition
										)
										if (dataContent[propertyKey] === null && propertyFlowsConfig.findById !== void 0) {
											condition._id = parseInt(condition._id)
											dataContent[propertyKey] = await this.DATABASE_SERVICE.read(
												propertyFlowsConfig.refCollection,
												condition
											)
										}
										const repetitiveHrEnd = process.hrtime(repetitiveHrStart)
										hrEnd[0] = hrEnd[0] + repetitiveHrEnd[0]
										hrEnd[1] = hrEnd[1] + repetitiveHrEnd[1]
									}
								}
							}
							this.emit(DatabaseBenchmarkEvent.operationDone, collection, 'readResult', String(id), dataContent)
							benchmarkResult[collection].push({
								hrtime: hrEnd,
								data: dataContent,
								id: id
							})
						}
					}
				}
			}
			return benchmarkResult
		} catch (error) {
			throw error
		}
	}

	private async runUpdateBenchmark(
		benchmarkRequest: IUpdateBenchmarkRequest
	) {
		let session = null
		try {
			session = await this.DATABASE_SERVICE.startTransaction()
			const benchmarkResult: IBenchmarkResult = {}
			for (const collection in benchmarkRequest) {
				if (benchmarkRequest.hasOwnProperty(collection)) {
					benchmarkResult[collection] = []
					for (const { id, data, dataPath } of benchmarkRequest[
						collection
					]) {
						const hrStart = process.hrtime()
						const { result } = await this.DATABASE_SERVICE.update(
							collection,
							{ _id: id },
							data
						)
						if (result.ok) {
							const hrEnd = process.hrtime(hrStart)
							this.emit(DatabaseBenchmarkEvent.operationDone, collection, 'updateResult', String(id), result)
							benchmarkResult[collection].push({
								hrtime: hrEnd,
								data: data,
								id: id,
								dataPath: dataPath
							})
						}
					}
				}
			}
			await this.DATABASE_SERVICE.commitTransaction(session)
			return benchmarkResult
		} catch (error) {
			if (session !== null) {
				await this.DATABASE_SERVICE.abortTransaction(session)
			}
			throw error
		}
	}

	private async runDeleteBenchmark(
		benchmarkRequest: IDeleteBenchmarkRequest
	) {
		let session = null
		try {
			session = await this.DATABASE_SERVICE.startTransaction()
			const benchmarkResult: IBenchmarkResult = {}
			for (const collection in benchmarkRequest) {
				if (benchmarkRequest.hasOwnProperty(collection)) {
					benchmarkResult[collection] = []
					for (const { id } of benchmarkRequest[collection]) {
						const hrStart = process.hrtime()
						const { result } = await this.DATABASE_SERVICE.delete(
							collection,
							{ _id: id }
						)
						if (result.ok) {
							const hrEnd = process.hrtime(hrStart)
							this.emit(DatabaseBenchmarkEvent.operationDone, collection, 'deleteResult', String(id), result)
							benchmarkResult[collection].push({
								hrtime: hrEnd,
								data: {},
								id: id
							})
						}
					}
				}
			}
			await this.DATABASE_SERVICE.commitTransaction(session)
			return benchmarkResult
		} catch (error) {
			if (session !== null) {
				await this.DATABASE_SERVICE.abortTransaction(session)
			}
			throw error
		}
	}

	private async runBenchmarkPromise() {
		if (this.benchmarkResults.isFinished) {
			this.emit(DatabaseBenchmarkEvent.benchmarkError, new Error(
				'Benchmark for database [' +
				this.DATABASE_NAME +
				'] has already done.'
			))
		}
		try {
			this.emit(DatabaseBenchmarkEvent.benchmarkStart, this.DATABASE_DIRECTORY, this.flowsConfig.hasFlowsJSON)
			if (this.flowsConfig.hasFlowsJSON) {
				this.flowsConfig.loadFlowsConfig()
			}
			// Initialise benchmark requests and results object
			const benchmarkRequests: IBenchmarkRequests = {
				create: {},
				read: {},
				update: {},
				delete: {}
			}
			// Check if there is any collection
			if (this.getCollections().length <= 0) {
				this.emit(
					DatabaseBenchmarkEvent.benchmarkError,
					new Error('No collections found in DB_DIR for database [' + this.DATABASE_NAME + '].')
				)
				return
			}
			// Check if there is any data at all
			let noDataAtAll = true
			for (const collection of this.getCollections()) {
				if (this.getCollectionDataSets(collection).length > 0) {
					noDataAtAll = false
				}
			}
			if (noDataAtAll) {
				this.emit(
					DatabaseBenchmarkEvent.benchmarkError,
					new Error('No data file found in all collections in DB_DIR for database [' + this.DATABASE_NAME + '].')
				)
				return
			}
			// Connect database
			await this.DATABASE_SERVICE.connect()
			// Drop database
			await this.DATABASE_SERVICE.drop()
			// Prepare create benchmark
			const dataSets = this.getDataSets()
			for (const collection in dataSets) {
				if (dataSets.hasOwnProperty(collection)) {
					benchmarkRequests.create[collection] = []
					for (const dataSet of dataSets[collection]) {
						const dataPath = dataSet.createDataPath
						const data = this.getDataFileContent(
							collection,
							dataPath
						)
						benchmarkRequests.create[collection].push({
							data,
							dataPath
						})
					}
				}
			}
			// Run create benchmark
			if (this.benchmarkToRun.create) {
				this.benchmarkResults.create = await this.runCreateBenchmark(
					benchmarkRequests.create
				)
			}
			// Prepare read, update, and delete benchmark
			for (const collection in this.benchmarkResults.create) {
				if (this.benchmarkResults.create.hasOwnProperty(collection)) {
					benchmarkRequests.read[collection] = []
					benchmarkRequests.update[collection] = []
					benchmarkRequests.delete[collection] = []
					for (const { id, data, dataPath } of this.benchmarkResults
						.create[collection]) {
						const dataSet = dataSets[collection].find(
							collectionDataSet =>
								collectionDataSet.createDataPath === dataPath
						)
						const updateDataPath =
							dataSet !== void 0
								? dataSet.updateDataPath
								: <string>dataPath
						benchmarkRequests.read[collection].push({
							id
						})
						benchmarkRequests.update[collection].push({
							id,
							data,
							dataPath: updateDataPath
						})
						benchmarkRequests.delete[collection].push({
							id
						})
					}
				}
			}
			// Run read benchmark
			if (this.benchmarkToRun.create && this.benchmarkToRun.read) {
				this.benchmarkResults.read = await this.runReadBenchmark(
					benchmarkRequests.read
				)
			}
			// Run update benchmark
			if (this.benchmarkToRun.create && this.benchmarkToRun.update) {
				this.benchmarkResults.update = await this.runUpdateBenchmark(
					benchmarkRequests.update
				)
			}
			// Run delete benchmark
			if (this.benchmarkToRun.create && this.benchmarkToRun.delete) {
				this.benchmarkResults.delete = await this.runDeleteBenchmark(
					benchmarkRequests.delete
				)
			}
			// Set benchmark results as finished and return it
			this.benchmarkResults.isFinished = true
		} catch (error) {
			this.emit(DatabaseBenchmarkEvent.benchmarkError, error)
		} finally {
			await this.DATABASE_SERVICE.disconnect()
		}
	}

	public runBenchmark() {
		this.runBenchmarkPromise().then(() => {
			this.emit(DatabaseBenchmarkEvent.benchmarkDone)
		})
	}

	public finishBenchmark() {
		const benchmarkResultsFile = path.join(<string>this.DATABASE_DIRECTORY, 'BenchmarkResults.json')
		if (this.benchmarkResults.isFinished) {
			this.emit(DatabaseBenchmarkEvent.benchmarkFinish, true, this.benchmarkResults, benchmarkResultsFile)
		} else {
			this.benchmarkResults.isFinished = true
			this.emit(DatabaseBenchmarkEvent.benchmarkFinish, false, this.benchmarkResults, benchmarkResultsFile)
		}
	}

	public getBenchmarkResults(): IBenchmarkResults {
		return this.benchmarkResults
	}

	public writeResultToFile(collection: string, result: string, filename: string, resultData: { [key: string]: any }) {
		const resultPath = path.join(<string>this.DATABASE_DIRECTORY, collection, result)
		if (this.writtenResults.findIndex(r => r === resultPath) === -1) {
			if (fs.existsSync(resultPath)) {
				fs.removeSync(resultPath)
			}
			fs.mkdirSync(resultPath)
			this.writtenResults.push(resultPath)
		}
		const resultFilePath = path.join(resultPath, `${filename}.json`)
		fs.writeFileSync(resultFilePath, JSON.stringify(resultData))
	}

	public addDatabaseServiceEventListener(event: string | symbol, listener: (...args: any[]) => void) {
		this.DATABASE_SERVICE.addListener(event, listener)
		return this
	}
}

export enum DatabaseBenchmarkEvent {
	benchmarkStart = 'start',
	benchmarkDone = 'done',
	benchmarkFinish = 'finish',
	benchmarkError = 'error',
	operationDone = 'operationDone'
}

export interface ICollectionDataSet {
	createDataPath: string
	updateDataPath: string
}

export interface ICollectionCreateBenchmarkRequest {
	dataPath: string
	data: { [key: string]: any }
}

export interface ICollectionReadBenchmarkRequest {
	id: any
}

export interface ICollectionUpdateBenchmarkRequest {
	dataPath: string
	id: any
	data: { [key: string]: any }
}

export interface ICollectionDeleteBenchmarkRequest {
	id: any
}

export interface ICollectionBenchmarkResult {
	dataPath?: string
	hrtime: [number, number]
	data: { [key: string]: any }
	id: any
}

export interface IDataSet {
	[collection: string]: ICollectionDataSet[]
}

export interface ICreateBenchmarkRequest {
	[collection: string]: ICollectionCreateBenchmarkRequest[]
}

export interface IReadBenchmarkRequest {
	[collection: string]: ICollectionReadBenchmarkRequest[]
}

export interface IUpdateBenchmarkRequest {
	[collection: string]: ICollectionUpdateBenchmarkRequest[]
}

export interface IDeleteBenchmarkRequest {
	[collection: string]: ICollectionDeleteBenchmarkRequest[]
}

export interface IBenchmarkRequests {
	create: ICreateBenchmarkRequest
	read: IReadBenchmarkRequest
	update: IUpdateBenchmarkRequest
	delete: IDeleteBenchmarkRequest
}

export interface IBenchmarkResult {
	[collection: string]: ICollectionBenchmarkResult[]
}

export interface IBenchmarkResults {
	create: IBenchmarkResult
	read: IBenchmarkResult
	update: IBenchmarkResult
	delete: IBenchmarkResult
	isFinished: boolean
	hasFlowsConfig: boolean
}

export default DatabaseBenchmark
