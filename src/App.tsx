import React, { Component } from 'react';
import ethers from 'ethers';

import Ethereum from './api/Ethers/Ethereum/Ethereum.jsx';
import Universe from './api/Universe/Universe.jsx';

import './App.css';

type AppProps = {};
type AppState = {
  account?: string,
  provider?: ethers.providers.Provider,
  pools: string[]
};

class App extends Component<AppProps, AppState> {

  constructor(props:any) {
    super(props);
    this.state = {
      account: undefined,
      provider: undefined,
      pools: [
        'aave',
        'barnbridge',
        'compound',
        'illuvium',
        'link',
        'sushi',
        'synthetix'
      ]
    }
    this.handleAccountChanged = this.handleAccountChanged.bind(this);
    this.handleEthereumConnected = this.handleEthereumConnected.bind(this);
  }

  handleAccountChanged(account: string) {
    this.setState({account});
  }

  handleEthereumConnected(provider:ethers.providers.Provider) {
    this.setState({provider});
  }

  render() {

    const { account, provider, pools } = this.state;

    return (
      <div className="App">
        <header className="App-header">
          <div>
            <Ethereum onEthereumConnected={this.handleEthereumConnected} onAccountChanged={this.handleAccountChanged} />
          </div>
          <Universe account={account} impersonate={false} pools={pools} provider={provider} />
        </header>
      </div>
    );
  }
}

export default App;
