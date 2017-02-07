# DOUG CLI

Command-line tool for redeployment of Solidity contracts following the DOUG paradigm. Set of such contracts could be generated using [generator-doug](https://github.com/ruchevits/generator-doug) Yeoman generator.

## Loading contracts

Load contracts from Solidity sources, compile them, and save their ABIs and bytecodes to a specified JSON file.

```
doug load \
	--contracts-file /var/myproject/config/contracts.json \
	--sources /var/myproject/contracts/src,/var/myproject/extraContracts/src
```

## Deployer

Deploy main contract together with the selected child contracts:

```
doug deploy \
	--name MyProject 
	--contracts-file /var/myproject/config/contracts.json
	--address-file /var/myproject/config/address
	--contracts FirstStore,SecondStore,FirstManager
```

Deploy selected child contracts and attach them to the main contract:

```
doug deploy \
	--name MyProject \
	--address 0xbb49f14d00fde4f445fa20f406026dc88a8f67b0 \
	--contracts-file /var/myproject/config/contracts.json \
	--address-file /var/myproject/config/address
	--contracts FirstStore,SecondStore,FirstManager
```
