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

import mongodb from 'mongodb'

import config from './../helpers/config'
import { terminal } from './../helpers/terminal'

export class Database {
	private readonly DB_URI_STRING: string
	private readonly DB_NAME: string
	private client?: mongodb.MongoClient
	private database?: mongodb.Db

	constructor(databaseName: string) {
		this.DB_URI_STRING = config.isLoaded ? config.database.uriString : ''
		this.DB_NAME = databaseName
	}

	public async connect() {
		try {
			if (this.client === void 0 || this.database === void 0) {
				terminal.print('Connecting to database [' + this.DB_NAME + ']...')
				this.client = await mongodb.connect(this.DB_URI_STRING, {
					useNewUrlParser: true
				})
				this.database = this.client.db(this.DB_NAME)
				terminal.printLine(' CONNECTED!')
			}
		} catch (error) {
			terminal.printLine(' FAILED!')
			throw error
		}
	}

	public async disconnect() {
		try {
			if (this.client !== void 0 && this.database !== void 0) {
				terminal.print('Closing connection to database...')
				await this.client.close()
				this.client = void 0
				this.database = void 0
				terminal.printLine(' DONE!')
			}
		} catch (error) {
			terminal.printLine(' FAILED!')
			throw error
		}
	}

	public async startTransaction() {
		if (this.client === void 0 || this.database === void 0) {
			throw new Error('Database is not connected!')
		}
		const session = this.client.startSession()
		session.startTransaction()
		return session
	}

	public async commitTransaction(session: mongodb.ClientSession) {
		await session.commitTransaction()
		session.endSession()
	}

	public async abortTransaction(session: mongodb.ClientSession) {
		await session.abortTransaction()
		session.endSession()
	}

	public async drop() {
		if (this.client === void 0 || this.database === void 0) {
			throw new Error('Database is not connected!')
		}
		return this.database.dropDatabase()
	}

	public async create(
		collectionName: string,
		dataContent: { [key: string]: any }
	) {
		if (this.client === void 0 || this.database === void 0) {
			throw new Error('Database is not connected!')
		}
		const collection = this.database.collection(collectionName)
		try {
			return collection.insertOne(dataContent)
		} catch (error) {
			throw error
		}
	}

	public async read(
		collectionName: string,
		condition: { [key: string]: any }
	) {
		if (this.client === void 0 || this.database === void 0) {
			throw new Error('Database is not connected!')
		}
		const collection = this.database.collection(collectionName)
		try {
			return collection.findOne(condition)
		} catch (error) {
			throw error
		}
	}

	public async update(
		collectionName: string,
		condition: { [key: string]: any },
		dataContent: { [key: string]: any }
	) {
		if (this.client === void 0 || this.database === void 0) {
			throw new Error('Database is not connected!')
		}
		const collection = this.database.collection(collectionName)
		try {
			return collection.updateOne(condition, { $set: dataContent })
		} catch (error) {
			throw error
		}
	}

	public async delete(
		collectionName: string,
		condition: { [key: string]: any }
	) {
		if (this.client === void 0 || this.database === void 0) {
			throw new Error('Database is not connected!')
		}
		const collection = this.database.collection(collectionName)
		try {
			return collection.deleteOne(condition)
		} catch (error) {
			throw error
		}
	}

	public async runQuery(query: string) {
		if (this.client === void 0 || this.database === void 0) {
			throw new Error('Database is not connected!')
		}
		try {
			eval(query)
		} catch (error) {
			throw error
		}
	}
}

export default Database
