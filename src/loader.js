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

	    // Solidity 0.4.10
	    const keys = _.map(output.contracts, (value, key) => {
	    	return key.substring(key.indexOf(':')+1)
	    })

        const contents = _.map(output.contracts, compiled => {

        	let contractType = undefined

        	const abi = JSON.parse(compiled.interface)

        	const setMainAddressFunc = compiled.functionHashes['setMainAddress(address)']
        	const addContractFunc = compiled.functionHashes['addContract(bytes32,address)']
        	const removeContractFunc = compiled.functionHashes['removeContract(bytes32)']
        	const contractsFunc = compiled.functionHashes['contracts(bytes32)']

			const hasConstructor = _.some(abi, abiDef => (abiDef.type === 'constructor'))
        	const hasSetMainAddressFunc = (setMainAddressFunc && setMainAddressFunc === 'db9771f5') || false
        	const hasAddContractFunc = (addContractFunc && addContractFunc === '5188f996') || false
        	const hasRemoveContractFunc = (removeContractFunc && removeContractFunc === 'a43e04d8') || false
        	const hasContractsFunc = (contractsFunc && contractsFunc === 'ec56a373') || false
        	
        	if (hasSetMainAddressFunc) contractType = hasConstructor ? 'DougEntity' : 'DougContract'
        	else if (hasAddContractFunc && hasRemoveContractFunc && hasContractsFunc) contractType = 'DougMain'

        	return {
	        	type: contractType,
	            abi: abi,
	            unlinked_binary: compiled.bytecode
	        }
        })

		return resolve(_.zipObject(keys, contents))
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
