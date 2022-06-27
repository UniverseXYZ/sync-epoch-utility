import React, { Component } from 'react';

import { ethers } from "ethers";

import './Ethereum.css';

export default class Ethereum extends Component {

	constructor(props) {
		super(props);

		this.state = {
			ethereumConnected: false,
			network: null
		};

		this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
		this.handleButtonClick = this.handleButtonClick.bind(this);
		this.handleNetworkChange = this.handleNetworkChange.bind(this);
	}

	handleButtonClick(event) {
		if(false === this.state.ethereumConnected) {
			// Initialize provider
			this.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
			// Detect network changes
			this.provider.on('network', this.handleNetworkChange);
			// Detect disconnect
			window.ethereum.on('accountsChanged', this.handleAccountsChanged);
			// Get signer
			this.signer = this.provider.getSigner();
			// Initialize MM connection
			this.provider.send('eth_requestAccounts', []).then(accounts => {
				this.handleAccountsChanged(accounts);
				this.setState({ethereumConnected: true, accountAddress: accounts[0]}, () => {
					this.props.onEthereumConnected && this.props.onEthereumConnected(this.provider);					
				});
			});
		}
	}

	handleAccountsChanged(accounts) {
		if(accounts.length) {
			const account = accounts[0];
			this.setState({ accountAddress: account });
			this.props.onAccountChanged && this.props.onAccountChanged(account);	
		} else {
			// If no accounts, user disconnected. Reload page
			window.location.reload();
		}		
	}

	handleNetworkChange(network, oldNetwork) {
		// When a Provider makes its initial connection, it emits a "network"
	    // event with a null oldNetwork along with the newNetwork. So, if the
	    // oldNetwork exists, it represents a changing network
	    if(oldNetwork) {
	    	window.location.reload();
	    } else {
	    	this.setState({network})
	    }
	}

	render() {

		const { accountAddress, ethereumConnected } = this.state,
			accountElided = accountAddress ? accountAddress.replace(/^(.{6}).*(.{4})$/, "$1...$2") : '',
			content = ethereumConnected
				? <div><span className="address">{accountElided}</span> Connected</div>
				: <button onClick={this.handleButtonClick}>Connect Wallet</button>;

		return (
			<div className="connection-dialog abs top right">{content}</div>
		)
	}

}