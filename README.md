# Mongo Benchmark

Benchmark a set of collection schemas by testing CRUD speed.

[![hosting terbaik](https://goo.gl/CJlcyZ)](https://www.domainesia.com/?aff=4049)

## Getting started

### Run Benchmark

To use this app, there are few steps you need to do.

 1. Download the latest build of this program at the [release](https://github.com/danang-id/mongo-benchmark/releases) page.
 2. Unzip your downloaded file.
 3. Open `benchmark.config.json` file, and make sure your configuration satisfy your needs. The configuration follows [these rules](#configuration).
 4. Also make sure that your data directory (the one defined in `benchmark.config.json` > `app` > `dataDirectory`) satisfy your needs; and it's structure follows [these rules](#data-directory).
 5. Run the application.

### Data Directory 

#### Structure

```
data
│
└───<FirstDatabaseName>
│   │   flows.json
│   │   
│   └───<nameOfCollectionA>
│   │   │
│   │   │   <data1>.create.json
│   │   │   <data1>.update.json
│   │
│   └───<nameOfCollectionB>
│       │
│       │   <data1>.create.json
│       │   <data2>.create.json
│       │   <data2>.update.json
│
└───<SecondDatabaseName>
│   │
│   └───<nameOfCollectionC>
│       │   
│       │   <data1>.create.json
│       │   <data1>.update.json
│   │   │   <data2>.create.json
│   │   │   <data2>.update.json
```

#### Rules

 1. **Database Directory** - Data directory should have child directories, which directories' name represent database name. These directories are called database directories. Data directory should have one or more database directory.
 2. **Collection Directory** - Database directory should have child directories, which directories' name represent collection name. These directories are called collection directories. Database directory should have one or more collection directory.
 3. **Flows Configuration File** - Database directory may have a flows configuration file named `flows.json`, written in JSON format standard according to [these rules](#flows-configuration). Flow configuration files defines of the program operates on READ operations.
 4. **Data File Set** - Collection directory should have data file sets. Data file set is a set of files that defines the data operated on CREATE and UPDATE operation. The set consist of data create file (named: `<dataA>.create.json`) and an optional data update file (named: `<dataA>.update.json`). When optional data update file is present, it will be used as the update data for the data created by data create file which has the same name. When optional data update file is not present, it will use it data create file counterpart to use as the update data. The contents of data file is free and depends on your needs. Collection directory should have one or more data file set.

#### Flows Configuration

The flows configuration file, named `flows.json`, must satisfy following formats.

 ```json
{
    "collections": {
        "<collectionName>": {
            "<propertyName>": {
                "refCollection": "Referenced collection",
                "findById": "The row ID to be referenced with. Should not present when findOne is present.",
                "findOne": "Condition to find the row to be referenced with. Should not present when findById is present."
             }
        }
    },
    "readOtherCollections": "true or false; whether or not to read any other collections, others than the ones which defines in this flows configuration file"
}
```

The value of `refCollection`, `findById`, and `findOne` may have special variable inserted. These variables are provided and they should be written in enclosed percentage `{}`.

 * `{value}` - Return the value of the property.
 * `{row}` - Return the object of the row.
 
When the return value of variable is an object (for example `{row}`), you may specify the property you'd like to return like this `{row.column_first}`.

An example of flows configuration file available on [example](example) directory. The example will be like follows.

 ```json
{
    "collections": {
        "logs": {
            "ref_one": {
                "refCollection": "collection_{value}",
                "findById": "{row.ref_id}"
             },
            "ref_two": {
                "refCollection": "collection_{value}",
                "findOne": {
                    "id": "{row.ref_id}"
                }
             }
        },
        "services": {}
    },
    "readOtherCollections": false
}
```

## Build from Source

### Preparation

To build this program from source, make sure you already have [NodeJS](https://nodejs.org) and [Yarn Package Manager](https://yarnpkg.org) installed.

First clone this repository.

```bash
git clone https://github.com/danang-id/mongo-benchmark.git
cd mongo-benchmark
```

Then, install dependencies needed for program to run.

```bash
yarn install
```

### On Development

On development process, you may want to start the app. To do so, use the `dev` script.

```bash
yarn dev
```

### Build into JavaScript executable

To build the application into a single JavaScript executable, use the `build` script.

```bash
yarn build
```

The executable files is then located on `bin` folder of root directory. It consist of:
 * `mongobenchmark`: JavaScript executable file (run directly on Linux/macOS, or using `node mongobenchmark`)
 * `mongobenchmark.cmd`: Wrapper for Windows
 * `mongobenchmark.sh`: Wrapper for Linux/macOS
 
You may run one of these files to start the built app. You may also use `yarn start` script to start `bin/mongobenchmark` file. 

**Remember:** To start the app using this method, you still need NodeJS installed on the host system. Yet, no need to satisfy the dependency.
 
### Build into binary executable files for distribution

Even is you're able to execute `bin/mongobenchmark`, it was not written in a binary executable format. Thus, it will not works when you have no NodeJS installed and **is not appropriate for binary distribution**.

To make binary executable files for distribution, you have to run the `dist` script. 

```bash
yarn dist
```

This command will generate binary executable files with NodeJS 10 included for **Linux (64 bit)** and **Windows (both 32 and 64 bit)**.

You may also run one of these commands to build of specific OSes accordingly.

 * `yarn dist:linux` (Linux 64 bit)
 * `yarn dist:win` (Windows, both 32 and 64 bit)
 * `yarn dist:win32` (Windows 32 bit)
 * `yarn dist:win64` (Windows 64 bit)
 * `yarn dist:macos` (macOS, see Note on macOS Build below)
 
The distribution binary will be generated at `dist` folder.
 
***Note on macOS Build***

```bash
yarn dist:macos
```

To build macOS binary, **you need to run on macOS**. Otherwise, if you try to build macOS binary not using macOS, an error shall appear.

## Configuration

Configuration for this program is saved on `benchmark.config.json`. This file can be located on:
 * besides the binary executable file; or
 * the root of this project.
 
The configuration file consist of these settings.
 
 ```json
{
    "app": {
        "dataDirectory": "Absolute path to data directory."
    },
    "database": {
        "uriString": "MongoDB URI String to connect to."
    }
}
```

An example of the configuration file available on [example](example) directory. The example will be like follows.

 ```json
{
    "app": {
        "dataDirectory": "D:\\mongo-benchmark\\data"
    },
    "database": {
        "uriString": "mongodb://localhost:27017/test?retryWrites=true"
    }
}
```

## Contribution

To contribute, simply fork this project, and issue a pull request.

## Versioning

This project is using [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/danang-id/mongo-benchmark/tags).

## Authors

-   **Danang Galuh Tegar Prasetyo** - _Initial work_ - [danang-id](https://github.com/danang-id)

See also the list of [contributors](https://github.com/danang-id/mongo-benchmark/contributors) who participated in this project.

## License

This project is licensed under the Apache License version 2.0 (Apache-2.0). See [LICENSE](LICENSE) for details.
