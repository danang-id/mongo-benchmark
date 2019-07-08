/**
 * Copyright 2019, Danang Galuh Tegar Prasetyo.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
s *
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
import program from 'commander'
import { EventEmitter } from 'events'

import config from './helpers/config'
import { terminal, styles } from './helpers/terminal'
import BenchmarkService from './services/DatabaseBenchmark'
import { DatabaseEvent } from './services/Database'
import { DatabaseBenchmarkEvent as BenchmarkEvent } from './services/DatabaseBenchmark'

export class Application extends EventEmitter {
	private readonly DATABASES_DIRECTORY: fs.PathLike

	constructor() {
		super()
		program
			.description('MongoDB Benchmark CLI')
			.version('1.0.0')
			.option('-v, --verbose', 'Verbose output')
			.option('-e, --export', 'Export benchmark results on finish')
			.option('-d, --dropDatabase', 'Drop database before benchmark.')
			.option('--nocreate', 'Do not run create benchmark')
			.option('--noread', 'Do not run read benchmark')
			.option('--noupdate', 'Do not run update benchmark')
			.option('--nodelete', 'Do not run delete benchmark')
		program.parse(process.argv)
		this.DATABASES_DIRECTORY = config.isLoaded
			? config.app.dataDirectory
			: path.join(__dirname, 'data')
	}

	private isDirectory(_path: fs.PathLike) {
		try {
			return fs.lstatSync(_path).isDirectory()
		} catch (error) {
			return false
		}
	}

	private isDatabasesDirectoryExist() {
		return fs.existsSync(this.DATABASES_DIRECTORY)
	}

	private getDatabases() {
		if (!this.isDatabasesDirectoryExist()) {
			return []
		}
		return <string[]>(
			fs.readdirSync(this.DATABASES_DIRECTORY).filter(database => {
				return this.isDirectory(
					path.join(<string>this.DATABASES_DIRECTORY, database)
				)
			})
		)
	}

	private main() {
		if (!this.isDatabasesDirectoryExist()) {
			this.emit(ApplicationEvent.error, new Error('Data directory [' + this.DATABASES_DIRECTORY + '] is not exist.'))
			return
		}
		const databases: string[] = this.getDatabases()
		if (databases.length <= 0) {
			this.emit(ApplicationEvent.error, new Error(
				'There is no any database defined in data directory. Please check your data directory at ' + this.DATABASES_DIRECTORY + '.'
			))
			return
		}
		const benchmarkServices: { database: string, benchmarkService: BenchmarkService }[] = []
		const benchmarkOptions = {
			dropDatabase: program.dropDatabase === true,
			benchmarkToRun: {
				create: program.nocreate !== true,
				read: program.noread !== true,
				update: program.noupdate !== true,
				delete: program.nodelete !== true,
			}
		}
		for (const database of databases) {
			const benchmarkService = new BenchmarkService(
				<string>this.DATABASES_DIRECTORY,
				database,
				benchmarkOptions
			)
			benchmarkServices.push({database, benchmarkService})
		}
		for (const [index, {database, benchmarkService}] of benchmarkServices.entries()) {
			const runningPrefix = 'Running benchmark: '
			benchmarkService.addListener(BenchmarkEvent.benchmarkStart, (dataDirectory: string, hasFlowsConfig: boolean) => {
				terminal.printLine(`Database [${database}]`, styles.bold)
					.print('INFO: ', styles.bold.cyanBright)
					.printLine('Database directory')
					.printLine('      ' + dataDirectory)
					.print('INFO: ', styles.bold.cyanBright)
					.printLine(hasFlowsConfig
						? 'Flows configuration is FOUND for this database. All read operations will be based on this configuration.'
						: 'Flows configuration is NOT FOUND for this database. '
					)
					.newLine()
					.print(runningPrefix + 'Preparing...')
			})
			benchmarkService.addListener(BenchmarkEvent.benchmarkDone, () => {
				const benchmarkResults = benchmarkService.getBenchmarkResults()
				if (benchmarkResults.isFinished) {
					const operations = ['create', 'read', 'update', 'delete']
					const operationHeaders = [
						'[C] Create Operation',
						'[R] Read Operation',
						'[U] Update Operation',
						'[D] Delete Operation'
					]
					const operationStyles = [
						styles.bold.bgBlue.white,
						styles.bold.bgWhite.black,
						styles.bold.bgMagenta.white,
						styles.bold.bgRed.white
					]
					const operationRuns = [
						benchmarkOptions.benchmarkToRun.create,
						benchmarkOptions.benchmarkToRun.read,
						benchmarkOptions.benchmarkToRun.update,
						benchmarkOptions.benchmarkToRun.delete
					]
					terminal.printLine('Benchmark Result', styles.bold)
					for (const [index, operation] of operations.entries()) {
						// @ts-ignore
						const collections = benchmarkResults[operation]
						terminal.printLine(
							operationHeaders[index],
							operationStyles[index]
						)
						if (operationRuns[index]) {
							if (index === 1 && benchmarkResults.hasFlowsConfig) {
								terminal
									.print('|  ')
									.print('INFO: ', styles.bold.cyanBright)
									.printLine('Read operations is done according to flows configuration.')
							}
							let totalOperationCount = 0
							let totalTimeUsed = 0
							for (const collection in collections) {
								if (collections.hasOwnProperty(collection)) {
									let collectionOperationCount = 0
									let collectionTimeUsed = 0
									let collectionAverageTimeUsed = 0
									terminal
										.print(`|- `)
										.printLine(
											`Collection [${collection}]`,
											styles.underline.yellow
										)
									for (const { hrtime, id } of collections[
										collection
										]) {
										collectionOperationCount++
										const time = parseFloat(
											`${hrtime[0]}.${hrtime[1]}`
										)
										terminal.printLine(
											`|    | ${id} | ${time} second(s)`
										)
										collectionTimeUsed += time
									}
									collectionAverageTimeUsed =
										collectionTimeUsed /
										collectionOperationCount
									terminal.printLine(
										`|  Collection Data Count : ${collectionOperationCount}`
									)
									terminal.printLine(
										`|  Operation Time        : ${collectionTimeUsed} second(s)`
									)
									terminal.printLine(
										`|  Avg Operation Time    : ${collectionAverageTimeUsed} second(s)`
									)
									totalOperationCount += collectionOperationCount
									totalTimeUsed += collectionTimeUsed
								}
							}
							terminal
								.print(`|- `)
								.printLine(
									`Finished ${totalOperationCount} ${operation} operation(s) within ${totalTimeUsed} second(s)`,
									styles.green
								)
						} else {
							let message = '';
							switch(index) {
								case 0:
									message = 'Create operation has been skiped by the user using --nocreate option.'
									break;
								case 1:
									message = 'Read operation has been skiped by the user using --noread option.'
									break;
								case 2:
									message = 'Update operation has been skiped by the user using --noupdate option.'
									break;
								case 3:
									message = 'Delete operation has been skiped by the user using --nodelete option.'
									break;
							}
							terminal
								.print('INFO: ', styles.bold.cyanBright)
								.printLine(message)
						}
					}
				}
				benchmarkService.finishBenchmark()
			})
			benchmarkService.addListener(BenchmarkEvent.benchmarkError, (error: Error) => {
				terminal.clearLine().print('ERROR: ', styles.bold.red)
					.printLine(error.message)
				if (program.verbose) {
					console.error(error)
				}
			})
			benchmarkService.addListener(BenchmarkEvent.benchmarkFinish, (success: boolean, benchmarkResults, exportPath: string) => {
				terminal.newLine().print('INFO: ', styles.bold.cyanBright).print(success
					? `Benchmark finished.`
					: `Benchmark ended due to error.`
				)
				if (success) {
					terminal.newLine()
				} else {
					if (program.verbose) {
						terminal.newLine()
					} else {
						terminal.printLine(' Please use --verbose option to see detailed output about the error.')
					}
				}
				if (program.export) {
					if (fs.existsSync(exportPath)) {
						fs.unlinkSync(exportPath)
					}
					fs.writeFileSync(exportPath, JSON.stringify(benchmarkResults))
					terminal.print('INFO: ', styles.bold.cyanBright)
						.printLine('Benchmark results has been exported.')
						.printLine('      Please check inside your data directory.')
				}
				if (index !== databases.length - 1) {
					terminal.newLine().center('', '-').newLine(2)
					const nextBenchmarkService = benchmarkServices[index + 1].benchmarkService
					nextBenchmarkService.runBenchmark()
				} else {
					this.emit(ApplicationEvent.finished)
				}
			})
			benchmarkService.addListener(BenchmarkEvent.operationDone, (collection: string, result: string, filename: string, resultData: { [key: string]: any }) => {
				if (program.export) {
					benchmarkService.writeResultToFile(collection, result, filename, resultData)
				}
			})
			benchmarkService.addDatabaseServiceEventListener(DatabaseEvent.connect, () => {
				terminal.clearLine().print(runningPrefix + 'Connecting to database...')
			})
			benchmarkService.addDatabaseServiceEventListener(DatabaseEvent.connected, () => {
				terminal.clearLine().print(runningPrefix + 'Running benchmark operations...')
			})
			benchmarkService.addDatabaseServiceEventListener(DatabaseEvent.disconnect, () => {
				terminal.clearLine().print(runningPrefix + 'Closing connection to database...')
			})
			benchmarkService.addDatabaseServiceEventListener(DatabaseEvent.disconnected, () => {
				terminal.clearLine()
			})
			benchmarkService.addDatabaseServiceEventListener(DatabaseEvent.error, () => {
				terminal.clearLine()
			})
		}
		benchmarkServices[0].benchmarkService.runBenchmark()
	}

	public static start() {
		terminal
			.clear()
			.newLine()
			.center('', ' ', styles.bgYellow)
			.newLine(2)
			.center(' Mongo Benchmark ', ' ', styles.bold.blue)
			.newLine()
			.center('[ v0.1.1-alpha ]', ' ')
			.newLine(2)
			.center('', ' ', styles.bgYellow)
			.newLine(2)
		const app = new Application()
		app.on(ApplicationEvent.error, (error: Error) => {
			terminal
				.print('ERROR: ', styles.bold.red)
				.printLine(error.message)
			if (program.verbose) {
				console.error(error)
			}
			app.emit(ApplicationEvent.finished)
		})
		app.on(ApplicationEvent.finished, Application.exit)
		app.main()
	}

	public static exit() {
		const year = (new Date()).getFullYear()
		terminal
			.newLine()
			.center('', '-')
			.newLine(2)
			.center('\u00A9 ' + year + ' Danang Galuh Tegar Prasetyo', ' ', styles.bold)
			.newLine()
			.center('https://danang-id.github.io/mongo-benchmark')
			.newLine(2)
			.center('', ' ', styles.bgYellow)
			.newLine(2)
			.print('Please press ENTER / RETURN to exit...')
			.newLine()
		process.stdin.resume()
		process.stdin.on('data', () => {
			process.exit()
		})
	}
}

enum ApplicationEvent {
	error = 'error',
	finished = 'finished'
}
