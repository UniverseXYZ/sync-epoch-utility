import React, { Component } from 'react';

import { ethers } from "ethers";

import config from './config.js';
import './Universe.css';

export default class Universe extends Component {

	constructor(props) {
		super(props);
		
		this.state = {
			balances: {},
			pools: {}
		};
		
		this.tokenDecimals = {};

		this.handleSyncButtonClick = this.handleSyncButtonClick.bind(this);
		this.handleWithdrawRequest = this.handleWithdrawRequest.bind(this);
	}

	componentDidMount() {
		if(this.props.provider) {
			this.initialize(this.props.provider);
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if(this.props.provider && 'undefined' === typeof prevProps.provider) {
			this.initialize();
		}
	}

	handleSyncButtonClick(event) {
		const tokenName = event.target.dataset.token,
			nextEpoch = this.state.pools[tokenName] + 1;

		this.manualEpochInit(tokenName, nextEpoch);
	}

	async handleWithdrawRequest(event) {
		const userAddr = config.impersonate,
			impersonatedContract = this.contract.connect(userAddr),
			tokenName = event.target.dataset.token,
			tokenAddr = config.pools[tokenName],
			balance = this.state.balances[tokenName];

		if(window.confirm(`Withraw ${balance} ${tokenName}?`)) {
			const tx = impersonatedContract.withdraw(tokenAddr, balance);
			await tx.wait();
		}
	}

	async initialize() {
		// Init contract object
		this.contract = new ethers.Contract(
			config.stakingContractAddress,
			config.abi,
			this.props.provider
		);
		
		// Look up the current epoch
		const currentEpochBigNumber = await this.contract.getCurrentEpoch(),
			currentEpoch = ethers.BigNumber.from(currentEpochBigNumber._hex).toNumber();

		// Store current epoch in state, then lookup most recently initialized epoch for each farm
		this.setState({ currentEpoch }, () => {
			for(let tokenName of Object.keys(config.pools)) {
				this.updateLatestInitializedEpoch(tokenName);
				this.updateUserPoolBalance(tokenName);
			}
		});		
	}

	/**
	 * Call manualEpochInit method on contract for provide token/epoch
	 */
	async manualEpochInit(tokenName, epoch) {
		// Attach signer to contract if not yet present
		if(!this.contract.signer) {
			this.signer = this.props.provider.getSigner();
			this.contract = this.contract.connect(this.signer);
		}

		// Call contract function
		const tokenAddress = config.pools[tokenName];
		const tx = await this.contract.manualEpochInit([tokenAddress], epoch);
		await tx.wait(1);  // Wait for a confirmation

		// Update token in UI
		this.updateLatestInitializedEpoch(tokenName);
	}

	async updateUserPoolBalance(tokenName) {
		if(this.props.account) {

			if(!this.tokenDecimals[tokenName]) {
				const tokenContract = new ethers.Contract(
					config.pools[tokenName],
					config.tokenAbi,
					this.props.provider
				);

				this.tokenDecimals[tokenName] = await tokenContract.decimals();
			}		

			//const balanceBigNumber = await this.contract.balanceOf(
			const balanceBigNumber = await this.contract.balanceOf(
				config.impersonate || this.props.account,
				config.pools[tokenName]
			);

			const balance = ethers.BigNumber.from(balanceBigNumber._hex).toNumber();

			this.setState(currentState => {
				const balances = currentState.balances;
				balances[tokenName] = balance;
				return balances;
			})
		}
	}

	/**
	 * Update UI w/ details for provided token
	 */
	async updateLatestInitializedEpoch(tokenName) {
		
		let initialized, epoch = this.state.currentEpoch;

		// Work backwards from current epoch to find most recently initialized epoch for the token
		do{
			initialized = await this.contract.epochIsInitialized(config.pools[tokenName], epoch);
			initialized || (epoch -= 1);
		} while (!initialized);

		this.setState(currentState => {
			const pools = currentState.pools;
			pools[tokenName] = epoch;
			return { pools };
		});
	}

	render() {
		
		const { balances, currentEpoch, pools } = this.state,
			columns = ['Pool', 'Epoch', 'Balance', 'Action'],
			contractUrl = `https://etherscan.io/address/${config.stakingContractAddress}#code`;

		const rows = Object.keys(pools).sort().map((tokenName , index) => {
			const epoch = pools[tokenName],
				action = epoch < currentEpoch ? 'sync' : (balances[tokenName] > 0 ? 'withdraw' : undefined),
				balancePretty = balances[tokenName] ? ethers.utils.formatUnits(balances[tokenName], this.tokenDecimals[tokenName]) : 0,
				epochClassName = epoch === currentEpoch
					? 'in-sync' : epoch === currentEpoch - 1
						? 'pending-sync'
						: 'out-of-sync',
				button = action === 'sync'
					? <button data-token={tokenName} onClick={this.handleSyncButtonClick}>Initialize Epoch {epoch + 1}</button>
					: action === 'withdraw'
						? <button data-token={tokenName} onClick={this.handleWithdrawRequest}>Withdraw</button>
						: '',
				tokenAddress = config.pools[tokenName];

			return (
				<tr key={index}>
					<td className="token-name" title={tokenAddress} data-token={tokenName}>{tokenName}</td>
					<td className={`epoch ${epochClassName}`}>{epoch}</td>
					<td className="balance">{balancePretty}</td>
					<td className="button">{button}</td>
				</tr>
			)
		});

		// Yeah yeah it's a table, but that's because it's tabular data
		return (
			<div>
				{ currentEpoch &&
				<div className="current-epoch abs top left">Current Epoch: <span className='epoch in-sync'>{currentEpoch}</span></div>
				}
				{ Object.keys(pools).length > 0 &&
				<table>
					<thead>
						<tr><th colSpan={columns.length}>Staking Pools</th></tr>
						<tr>{columns.map((text, index) => <th key={index}>{text}</th>)}</tr>
					</thead>
					<tbody>
						{rows}
						<tr>
							<td colSpan={columns.length}>
								<a className="address staking-contract" href={contractUrl} target="_new">Staking Contract ↗️</a>
							</td>
						</tr>
					</tbody>
				</table>
				}				
			</div>
		);
	}

}