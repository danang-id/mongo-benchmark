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
import program from 'commander'

import config from './helpers/config'
import { terminal, styles } from './helpers/terminal'
import BenchmarkService from './services/DatabaseBenchmark'

export class Application {
	private readonly DATABASES_DIRECTORY: fs.PathLike
	private readonly APP_TITLE = 'MongoDB Benchmark'

	constructor() {
		program
			.description('MongoDB Benchmark CLI')
			.version('1.0.0')
			.option('-v, --verbose', 'verbose output')
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
			fs.mkdirSync(this.DATABASES_DIRECTORY)
			terminal.print(
				'Databases directory [./data] is not exist, created one.',
				styles.red
			)
		}
		return <string[]>(
			fs.readdirSync(this.DATABASES_DIRECTORY).filter(database => {
				return this.isDirectory(
					path.join(<string>this.DATABASES_DIRECTORY, database)
				)
			})
		)
	}

	private async main() {
		let databases: string[] = []
		try {
			databases = this.getDatabases()
			if (databases.length <= 0) {
				throw new Error(
					'There is no database defined in databases directory [./data]'
				)
			}
			terminal
				.clear()
				.center(' ' + this.APP_TITLE + ' ', '=', styles.bold)
				.newLine(2)
		} catch (error) {
			throw error
		}
		let benchmarkService: BenchmarkService
		for (const [index, database] of databases.entries()) {
			benchmarkService = new BenchmarkService(
				<string>this.DATABASES_DIRECTORY,
				database
			)
			try {
				await benchmarkService.runBenchmark()
				const benchmarkResults = benchmarkService.getBenchmarkResults()
				if (benchmarkResults.isFinished) {
					const operations = ['create', 'read', 'update', 'delete']
					const operationHeaders = [
						'[C] Create Operation',
						'[R] Read Operation',
						'[U] Update Operation',
						'[D] Delete Operation'
					]
					terminal.printLine('RESULT:', styles.bold.underline)
					for (const [index, operation] of operations.entries()) {
						// @ts-ignore
						const collections = benchmarkResults[operation]
						terminal.printLine(
							operationHeaders[index],
							styles.bold.yellow
						)
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
										styles.cyan
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
					}
				}
			} catch (error) {
				terminal.printLine('ERROR: ' + error.message, styles.red)
				if (program.verbose) {
					console.error(error)
				}
			} finally {
				benchmarkService.finishBenchmark()
				if (index !== databases.length - 1) {
					terminal.newLine()
				}
			}
		}
	}

	public static start() {
		const app = new Application()
		app.main()
			.catch(error => {
				terminal
					.newLine()
					.print('ERROR: ', styles.bold.red)
					.printLine(error.message, styles.bold)
				if (program.verbose) {
					console.error(error)
				}
			})
			.finally(Application.exit)
	}

	public static exit() {
		terminal
			.newLine()
			.center('', '=', styles.bold)
			.newLine(2)
			.print('Press any key to exit')
			.newLine(2)
		process.stdin.resume()
		process.stdin.on('data', () => {
			process.exit()
		})
	}
}
