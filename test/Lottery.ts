import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lottery", function () {

  async function getBalance(participant: any) {
    return await ethers.provider.getBalance(participant);
  }

  async function deployLotteryFixture() {
    const [owner, participantOne, participantTwo, participantThree] = await ethers.getSigners();
    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy();
    return { lottery, owner, participantOne, participantTwo, participantThree };
  }

  describe("Pick the winner - positive flow", function () {
    it("Winner balance should change", async function () {
      const { lottery, owner, participantOne, participantTwo, participantThree } = await loadFixture(deployLotteryFixture);
        const weiValue = ethers.parseUnits("1","ether");
        
        await lottery.connect(participantOne).participate({ value: weiValue });
        await lottery.connect(participantTwo).participate({ value: weiValue });
        await lottery.connect(participantThree).participate({ value: weiValue });

        let ownerBalanceAfterParticipation = await getBalance(owner);
        let participantOneBalanceAfterParticipation = await getBalance(participantOne);
        let participantTwoBalanceAfterParticipation = await getBalance(participantTwo);
        let participantThreeBalanceAfterParticipation = await getBalance(participantThree);

        let participantBalancesAfterParticipation: Array<bigint>;
        participantBalancesAfterParticipation = [participantOneBalanceAfterParticipation, participantTwoBalanceAfterParticipation, participantThreeBalanceAfterParticipation];

        console.log("BALANCES AFTER PARTICIPATING:");
        console.log(participantBalancesAfterParticipation);

        await lottery.connect(owner).pickTheWinner();

        let ownerBalanceAfterLottery = await getBalance(owner);
        let participantOneBalanceAfterLottery = await getBalance(participantOne);
        let participantTwoBalancefterLottery = await getBalance(participantTwo);
        let participantThreeBalanceAfterLottery = await getBalance(participantThree);

        let participantBalancesAfterLottery: Array<bigint>;
        participantBalancesAfterLottery = [participantOneBalanceAfterLottery, participantTwoBalancefterLottery, participantThreeBalanceAfterLottery];

        console.log("BALANCES AFTER LOTTERY:");
        console.log(participantBalancesAfterLottery);

        expect(ownerBalanceAfterLottery).to.be.lessThan(ownerBalanceAfterParticipation,
          "The administrator can't win!"
        );

        let winnerCount = 0;
        let unchangedCount = 0;

        for(let balanceAfterLottery of participantBalancesAfterLottery.values()){
          // means balance is the same
            if(participantBalancesAfterParticipation.includes(balanceAfterLottery)){
              unchangedCount += 1; 
            } else {
              let prize = weiValue * BigInt(participantBalancesAfterParticipation.length);
              let winnerBalance = balanceAfterLottery - prize;
              if(participantBalancesAfterParticipation.includes(winnerBalance)){
                winnerCount += 1;
              } 
            }
        }

        expect(winnerCount).to.equal(1, "Only 1 winner balace can be!");
        expect(unchangedCount).to.equal(participantBalancesAfterLottery.length - 1, "Loser's count should be #participants - 1!");
    });
  });

  describe("Deployment", function () {
    it("The lottery smart contract can have only one owner", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);
      expect(await lottery.owner()).to.equal(owner.address);
    });
  });

  describe("Participate", function () {
    describe("Validations", function () {
      it("Should revert with the right error if participate called from admin account", async function () {
        const { lottery, owner } = await loadFixture(deployLotteryFixture);
        await expect(lottery.connect(owner).participate()).to.be.revertedWith(
          "The administrator cannot participate as a user in the lottery!"
        );
      });

      it("Should revert with the right error if participate called twice from the same account", async function () {
        const { lottery, participantOne } = await loadFixture(deployLotteryFixture);
        const weiValue = ethers.parseUnits("0.5","ether");
        await lottery.connect(participantOne).participate({ value: weiValue });
        await expect(lottery.connect(participantOne).participate({ value: weiValue })).to.be.revertedWith(
          "You are already participating in the lottery!"
        );
      });

      it("Should revert with the right error if participant payed ticket price less than 0.5 ETH", async function () {
        const { lottery, participantOne } = await loadFixture(deployLotteryFixture);
        const weiValue = ethers.parseUnits("0.49","ether");
        await expect(lottery.connect(participantOne).participate({ value: weiValue })).to.be.revertedWith(
          "The minimum ticket price (lot) is 0.5 Ether!"
        );
      });
    });

    describe("Events", function () {
      it("Should emit an event on WinnerFound", async function () {
        const { lottery, owner, participantOne, participantTwo, participantThree } = await loadFixture(deployLotteryFixture);
        const weiValue = ethers.parseUnits("1","ether");
        await lottery.connect(participantOne).participate({ value: weiValue });
        await lottery.connect(participantTwo).participate({ value: weiValue });
        await lottery.connect(participantThree).participate({ value: weiValue });
        await expect(lottery.connect(owner).pickTheWinner()).to.emit(lottery, "WinnerFound").withArgs(anyValue); 
      });
    });
  });

  describe("Pick The Winner", function () {
    describe("Validations", function () {
      it("Should revert with the right error if pickTheWinner called from another account", async function () {
        const { lottery, participantOne } = await loadFixture(deployLotteryFixture);
        await expect(lottery.connect(participantOne).pickTheWinner()).to.be.revertedWith(
          "Only the administrator can pick the winner!"
        );
      });

      it("Should revert with the right error if pickTheWinner called with less than 3 participants", async function () {
        const { lottery, owner, participantOne, participantTwo } = await loadFixture(deployLotteryFixture);
        const weiValue = ethers.parseUnits("1","ether");
        await lottery.connect(participantOne).participate({ value: weiValue });
        await lottery.connect(participantTwo).participate({ value: weiValue });
        await expect(lottery.connect(owner).pickTheWinner()).to.be.revertedWith(
          "A minimum of 3 users is required to participate in the lottery!"
        );
      });
    });

    describe("Events", function () {
      it("Should emit an event on ParticipantEntered", async function () {
        const { lottery, participantOne, participantTwo } = await loadFixture(deployLotteryFixture);
        const weiValue = ethers.parseUnits("1","ether");
        await expect(await lottery.connect(participantOne).participate({ value: weiValue })).to.emit(lottery, "ParticipantEntered").withArgs(participantOne.address); 
        await expect(await lottery.connect(participantTwo).participate({ value: weiValue })).to.emit(lottery, "ParticipantEntered").withArgs(participantTwo.address);
      });
    });
  });
});
