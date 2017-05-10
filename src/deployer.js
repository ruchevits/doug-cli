'use strict'

const _ = require('lodash')
const Bluebird = require('bluebird')
const fs = Bluebird.promisifyAll(require('fs'))
const chalk = require('chalk')
const jsonfile = require('jsonfile')
const Web3 = require('web3')
const Table = require('cli-table')

module.exports = class DougDeployer {

	constructor(options){
		this.main = options.main
		this.children = options.children
		this.input = options.input
		this.outputFile = options.output
		this.blockFile = options.blockFile
		const url = `http://${options.web3.host}:${options.web3.port}`
		const provider = new Web3.providers.HttpProvider(url)
		this.web3 = new Web3(provider)
		this.table = new Table({
		    head: ['Contract', 'Address'],
		    colWidths: [36, 44]
		})
	}

	run(){
		this.deploy(this.main, this.children)
	}

	deploy(main, children){
		this.load()
			.then(() => {
				if (!main.name) return new Error(`Main contract name must be supplied`)
				if (!main.address) return this.deployMain(main.name)
				const compiled = this.sources[main.name]
				const contract = this.web3.eth.contract(compiled.abi)
				this.table.push([main.name, main.address])
				console.log(chalk.gray(`Using main contract ${chalk.bold(chalk.blue(main.name))} at ${chalk.bold(chalk.white(main.address))}`))
				return contract.at(main.address)
			})
			.then(main => {
		    	const selected = _.pickBy(this.sources, (value, name) => _.includes(children, name))
				const deployChildContracts = _.map(selected, (source, name) => this.deployChild(main, name))
				return Promise.all(deployChildContracts)
			})
			.then(() => {
				// console.log(this.table.toString())
			})
    		.catch(err => console.log(err))
	}

	load(){
		return new Promise((resolve, reject) => {
			jsonfile.readFile(this.input, (err, sources) => {
				if (err) return reject(err)
				this.sources = sources
				return resolve(sources)
			})
		})
	}

	deployMain(name){
		const blockNumber = this.web3.eth.blockNumber + 1
		fs.writeFileSync(this.blockFile, blockNumber)
		return this.deployContract(name).then(deployed => {
			return fs.writeFileAsync(this.outputFile, deployed.address).then(() => {
				this.table.push([name, deployed.address])
				console.log(chalk.gray(`Deployed main contract ${chalk.bold(chalk.blue(name))} at ${chalk.bold(chalk.white(deployed.address))}`))
				return deployed
			})
		})
	}

	deployChild(main, name){
        return this.deployContract(name).then(deployed => {
        	return this.attachContract(main, name, deployed.address).then(() => {
        		this.table.push([name, deployed.address])
				console.log(chalk.gray(`Deployed child contract ${chalk.bold(chalk.green(name))} at ${chalk.bold(chalk.white(deployed.address))}`))
        	})
        })
	}

	deployContract(name){

	    if (!this.web3.isConnected()) return Promise.reject(`Can't connect to JSON RPC at: ${url}`)
	    
	    return new Promise((resolve, reject) => {
	    	const compiled = this.sources[name]
	        const contract = this.web3.eth.contract(compiled.abi)
	        const options = {
	            from: this.web3.eth.coinbase,
	            data: '0x' + compiled.unlinked_binary,
	            gas: '0x989680',
	            // gasLimit: '0x5B8D80'
	        }
	        // console.log(this.web3.eth.estimateGas({data: '0x' + compiled.unlinked_binary}))
	        contract.new(options, (err, deployed) => {
	            if (err) return reject(err)
	            if (deployed && deployed.address && typeof deployed.address !== 'undefined'){
	                return resolve(deployed)
	            }
	        })
	    })
	}

    attachContract(main, name, address){
    	
    	if (!this.web3.isConnected()) return Promise.reject(`Can't connect to JSON RPC at: ${url}`)
    	
		const txOptions = {
			from: this.web3.eth.coinbase,
			gas: '0x2fefd8',
			// gasLimit: '0x2fefd8'
		}

        return new Promise((resolve, reject) => {
            main.addContract.sendTransaction(name, address, txOptions, (err, tx) => {
                if (err) return reject(err)
                return resolve(tx)
            })
        })
    }
}
