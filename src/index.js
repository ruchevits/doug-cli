#!/usr/bin/env node

'use strict'

const program = require('commander')
const Loader = require('./loader')
const Deployer = require('./deployer')

program
  .version('0.0.1')
  .command('load')
  .option('--contracts-file [contractsFile]', 'path to the file where contract definitions will be saved')
  .option('--sources [sources]', 'comma-separated list of source directories with Solidity contracts')
  .description('Load contracts')
  .action((req, optional) => {
    const loader = new Loader({
      input: req.sources.split(','),
      output: req.contractsFile
    })
    return loader.run()
  })

program
  .version('0.0.1')
  .command('deploy')
  .option('--name [name]', 'project name')
  .option('--address [address]', 'address of the main contract')
  .option('--contracts-file [contractsFile]', 'path to the file with contract definitions')
  .option('--address-file [addressFile]', 'path to the file where the main contract address will be saved')
  .option('--contracts [contracts]', 'comma-separated list of child contracts to deploy')
  .description('Deploy contracts')
  .action((req, optional) => {
    const deployer = new Deployer({
      main: {
        name: req.name,
        address: req.address
      },
      children: req.contracts.split(','),
      input: req.contractsFile,
      output: req.addressFile,
      web3: {
        host: process.env.TALLYSTICKS_RPC_HOST || '127.0.0.1',
        port: process.env.TALLYSTICKS_RPC_PORT || '8545'
      }
    })
    return deployer.run()
  })

program.parse(process.argv)
