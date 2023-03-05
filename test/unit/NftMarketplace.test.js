const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developementChains } = require("../../helper-hardhat-config")

!developementChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
          let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract, deployer, user
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0

          beforeEach(async () => {
              //<*************************Code from video******************************>
              //deployer = (await getNamedAccounts()).deployer
              //player = (await getUnnamedAccounts()).player
              //this line will deploy all contracts (will run through everythimg in deploy folder)
              //await deployments.fixture(["all"])
              //nftMarketplace = await ethers.getContract("NftMarketplace")

              //<---------------------------------------------------------------->
              //if we grab contract by getContract() then if we call any function in contract is called by default account
              //which is "deployer"
              //nftMarketplace = await ethers.getContract("NftMarketplace")
              //if we want to call a function on NftMarketplace, with player being the one calling the function,
              //we have to write line written below
              //nftMarketplace = nftMarketplace.connect(player)
              //<---------------------------------------------------------------->

              //<-----------------------we can do this also like this----------------------------------------->
              //first declare nftMarketplaceContract (let nftMarketplaceContract)
              //nftMarketplaceContract = await ethers.getContract("NftMarketplace")
              //nftMarketplace = nftMarketplaceContract.connect(player)
              //<---------------------------------------------------------------->

              //basicNft = await ethers.getContract("BasicNft")
              //await basicNft.mintNft() //deployer calling and minting nft
              //nftMarketplace can't call approve coz it don't own nft
              //so deployer have to call approve and since we grabbed BasicNft contract by getContract,
              //all functions will be called by default account which is deployer (account 0)
              //deployer approving to send it to marketplace
              //await basicNft.approve(nftMarketplace.address, TOKEN_ID)

              //<****************************************************************************>

              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              deployer = accounts[0] //this account will deploy the contracts (msg.sender)
              user = accounts[1]
              //all contracts are deployed by line written below
              await deployments.fixture(["all"])
              nftMarketplaceContract = await ethers.getContract("NftMarketplace")
              //functions declared in nftMarketplace will be called by deployer
              nftMarketplace = nftMarketplaceContract.connect(deployer)
              basicNftContract = await ethers.getContract("BasicNft")
              //functions declared in nftMarketplace will be called by deployer
              basicNft = basicNftContract.connect(deployer)
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID)
          })

          describe("listItem", function () {
              it("emits an event after listing an item", async function () {
                  expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      "ItemListed"
                  )
              })
              it("exclusively items that haven't been listed", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  //   const error = `NftMarketplace__AlreadyListed("${basicNft.address}", ${TOKEN_ID})`
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__AlreadyListed")
                  //   await expect(
                  //       nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  //   ).to.be.revertedWith(error)
              })
              it("exclusively allows owners to list", async function () {
                  //functions declared in nftMarketplace will be called by user
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await basicNft.approve(user.address, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NotOwner")
              })
              it("needs approvals to list item", async function () {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
              })
              it("Updates listing with seller and price", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert(listing.price.toString() == PRICE.toString())
                  assert(listing.seller.toString() == deployer.address)
              })
          })
          describe("cancelListing", function () {
              it("reverts if there is no listing", async function () {
                  //reverted by isListed() modifier in NftMarketplace.sol

                  //   const error = `NftMarketplace__NotListed("${basicNft.address}", ${TOKEN_ID})`
                  //   await expect(
                  //       nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  //   ).to.be.revertedWith(error)
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })
              it("reverts if anyone but the owner tries to call", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  //functions declared in nftMarketplace will be called by user
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await basicNft.approve(user.address, TOKEN_ID)
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NotOwner")
              })
              it("emits event and removes listing", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  expect(await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
                      "ItemCanceled"
                  )
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert(listing.price.toString() == "0")
              })
          })
          describe("buyItem", function () {
              it("reverts if the item isnt listed", async function () {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })
              it("reverts if the price isnt met", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__PriceNotMet")
              })
              it("transfers the nft to the buyer and updates internal proceeds record", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  //functions declared in nftMarketplace will be called by user
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  expect(
                      //nft is bought by user
                      await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  ).to.emit("ItemBought")
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
                  assert(newOwner.toString() == user.address)
                  assert(deployerProceeds.toString() == PRICE.toString())
              })
          })
          describe("updateListing", function () {
              it("must be owner and listed", async function () {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  //functions declared in nftMarketplace will be called by user
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NotOwner")
              })
              it("updates the price of the item", async function () {
                  const updatedPrice = ethers.utils.parseEther("0.2")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  expect(
                      await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, updatedPrice)
                  ).to.emit("ItemListed")
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert(listing.price.toString() == updatedPrice.toString())
              })
          })
          describe("withdrawProceeds", function () {
              it("doesn't allow 0 proceed withdrawls", async function () {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
                      "NftMarketplace__NoProceeds"
                  )
              })
              it("withdraws proceeds", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  //functions declared in nftMarketplace will be called by user
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  //nft bought by user
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  //functions declared in nftMarketplace will be called by user
                  nftMarketplace = nftMarketplaceContract.connect(deployer)

                  //proceeds (amount) deployer can withdraw from contract if he want to
                  const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                  //balance of deployer before withdrawing proceeds
                  const deployerBalanceBefore = await deployer.getBalance()
                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  //balance of deployer before withdrawing proceeds
                  const deployerBalanceAfter = await deployer.getBalance()

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )
              })
          })
      })
