import { Token, Wallet } from '../../generated/schema'
import {
  Invoked,
  OwnerChanged,
  Received,
} from '../../generated/templates/BaseWallet/BaseWallet'
import { WalletCreated } from '../../generated/WalletFactory/WalletFactory'
import { Transfer } from '../../generated/GoodDollar/ERC20'
import {
  initToken,
  storeOrUpdateWalletBalance,
  storeTransferEvent,
  storeWalletActivity,
} from './utils'
import { NEONE, ONE, ZERO } from '../helpers/number'

export function handleTransfer(event: Transfer): void {
  /**
   * Handles ERC-20 transfer made by one of the fuse cash wallets and updates the wallets balance
   */
  let fromWallet = Wallet.load(event.params.from.toHexString())
  let toWallet = Wallet.load(event.params.to.toHexString())

  if (fromWallet == null && toWallet == null) return

  let assetAddress = event.address
  let token = Token.load(assetAddress.toHexString())

  if (token == null) {
    token = initToken(event.address)
  }

  token.transferEventCount = token.transferEventCount.plus(ONE)
  token.save()

  storeTransferEvent(event)
  if (fromWallet != null) {
    storeOrUpdateWalletBalance(fromWallet, event, NEONE)
  }
  if (toWallet != null) {
    storeOrUpdateWalletBalance(toWallet, event, ONE)
  }
}

export function handleWalletCreated(event: WalletCreated): void {
  /*
   ** Adds a new fuse cash wallet
   */
  let owner = event.params._owner
  let walletAddress = event.params._wallet

  let wallet = new Wallet(walletAddress.toHexString())
  wallet.address = walletAddress
  wallet.owner = owner
  wallet.balance = ZERO

  wallet.save()
}

export function handleWalletReceive(event: Received): void {
  /**
   * Updates the native balance of fuse cash wallet when it receives native coins
   * TODO: log the event inside TransferEvent entity with tokenAddress 0x0
   */
  if(Wallet.load(event.address.toHexString()) == null) 
    return

  let wallet = Wallet.load(event.address.toHexString()) as Wallet
  wallet.balance = wallet.balance.plus(event.params.value)

  storeWalletActivity(
    event.transaction.hash.toHexString(),
    wallet.id,
    'Received',
    event.params.sender,
    event.params.value,
  )

  wallet.save()
}

export function handleWalletInvoked(event: Invoked): void {
  /**
   * Updates the native balance of fuse cash  wallet when it sends a transaction
   * TODO: log the event inside the TransferEvent entity with tokeAddress 0x0
   */
  if(Wallet.load(event.address.toHexString()) == null) 
    return

  let wallet = Wallet.load(event.address.toHexString()) as Wallet
  let value = event.params.value

  wallet.balance = wallet.balance.minus(value)

  storeWalletActivity(
    event.transaction.hash.toHexString(),
    wallet.id,
    'Invoked',
    event.params.target,
    event.params.value,
  )

  wallet.save()
}

export function handleWalletOwnerChanged(event: OwnerChanged): void {
  /**
   * Handles wallet ownership transfer
   */
  if(Wallet.load(event.address.toHexString()) == null) 
    return

  let newOwner = event.params.owner
  let wallet = Wallet.load(event.address.toHexString()) as Wallet

  wallet.owner = newOwner

  storeWalletActivity(
    event.transaction.hash.toHexString(),
    wallet.id,
    'OwnerChanged',
    event.params.owner,
    ZERO,
  )

  wallet.save()
}
