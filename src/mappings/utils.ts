import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { Transfer, ERC20 } from '../../generated/GoodDollar/ERC20'
import {
  Token,
  TransferEvent,
  Wallet,
  WalletActivity,
  WalletBalance,
} from '../../generated/schema'
import { ZERO } from '../helpers/number'

function walletAsset(walletAddress: Bytes, assetAddress: Bytes): string {
  return walletAddress.toHexString() + '-' + assetAddress.toHex()
}

export function initToken(address: Address): Token {
  /**
   * bind with the contract and get token details
   */
  let contract = ERC20.bind(address)
  let token = new Token(address.toHexString())
  token.name = contract.name()
  token.address = address
  token.decimals = contract.decimals()
  token.symbol = contract.symbol()
  token.transferEventCount = ZERO

  return token as Token
}

export function storeTransferEvent(event: Transfer): void {
  let transferEvent = new TransferEvent(event.transaction.hash.toHexString())

  transferEvent.token = event.address.toHexString()
  transferEvent.amount = event.params.value
  transferEvent.from = event.params.from
  transferEvent.to = event.params.to
  transferEvent.block = event.block.number
  transferEvent.timestamp = event.block.timestamp
  transferEvent.transaction = event.transaction.hash

  transferEvent.save()
}

export function storeOrUpdateWalletBalance(
  wallet: Wallet,
  event: Transfer,
  multiplier: BigInt,
): void {
  let walletBalanceId = walletAsset(wallet.address, event.address)
  let walletBalance = WalletBalance.load(walletBalanceId)

  if (walletBalance == null) {
    walletBalance = new WalletBalance(walletBalanceId)
    walletBalance.account = wallet.id
    walletBalance.token = event.address.toHexString()
    walletBalance.amount = ZERO
  }

  walletBalance.block = event.block.number
  walletBalance.modified = event.block.timestamp
  walletBalance.transaction = event.transaction.hash
  walletBalance.amount = walletBalance.amount.plus(
    event.params.value.times(multiplier),
  )

  walletBalance.save()
}

export function storeWalletActivity(
  txHash: string,
  walletAddress: string,
  activityType: string,
  target: Address,
  amount: BigInt,
): void {
  let walletActivity = new WalletActivity(txHash)
  walletActivity.activityType = activityType
  walletActivity.wallet = walletAddress
  walletActivity.target = target
  walletActivity.amount = amount
  walletActivity.save()
}
