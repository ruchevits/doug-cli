'use strict'

const _ = require('lodash')
const chalk = require('chalk')
const glob = require('glob')
const fs = require('fs')
const solc = require('solc')
const jsonfile = require('jsonfile')

module.exports = class DougLoader {

	constructor(options){
		this.input = options.input
		this.output = options.output
	}

	run(){
	    console.log(chalk.yellow(`Reading contracts from: `))
	    _.forEach(this.input, (dirPath, index) => console.log(`${dirPath}`))

	    read(this.input)
	    	.then(sources => {
	    		const names = Object.keys(sources)
	   			console.log(chalk.green(`Found ${names.length} Solidity files:`))
	    		console.log(names.join(', '))
	    		return compile(sources)
	    	})
	    	.then(compiled => {
	    		const names = Object.keys(compiled)
	   			console.log(chalk.green(`Compiled ${names.length} contracts:`))
	    		console.log(names.join(', '))
	    		return filter(compiled)
	    	})
	    	.then(filtered => {
	    		const names = Object.keys(filtered)
	   			console.log(chalk.green(`Exported ${names.length} contracts:`))
	    		console.log(names.join(', '))
	    		return save(filtered, this.output)
	    	})
	    	.then(result => {
			    console.log(chalk.yellow(`Saved contracts to:`))
			    console.log(`${this.output}`)
	    	})
	    	.catch(err => console.log(err))
	}
}

function read(inputDirs){
	const calls = _.map(inputDirs, inputDir => loadContractsInDir(inputDir))
	return Promise.all(calls).then(results => _.assign.apply(_, results))
}

function loadContractsInDir(inputDir){
	return new Promise((resolve, reject) => {
		glob(`${inputDir}/**/**/*.sol`, (err, files) => {
			if (err) return reject(err)
		    const keys = _.map(files, file => file.substr(inputDir.length+1))
		    const contents = _.map(files, file => fs.readFileSync(file, 'utf8'))
		    return resolve(_.zipObject(keys, contents))
		})
	})
}

function compile(sources){
    return new Promise((resolve, reject) => {
	    const output = solc.compile({sources: sources}, 1)
	    if (output.errors) return reject(output.errors)
        const result = _.mapValues(output.contracts, compiled => ({
            abi: JSON.parse(compiled.interface),
            unlinked_binary: compiled.bytecode
        }))
		return resolve(result)
    })
}

function filter(compiled){
    return new Promise((resolve, reject) => {
    	const excluded = ['strings', 'owned', 'DougMain', 'DougContract', 'DougEntity', 'DougProvider']
    	const filtered = _.pickBy(compiled, (value, key) => !_.includes(excluded, key))
    	return resolve(filtered)
    })
}

function save(compiled, outputFile){
    return new Promise((resolve, reject) => {
        jsonfile.writeFile(outputFile, compiled, {spaces: 2}, err => {
            if (err) return reject()
            return resolve(outputFile)
        })
    })
}