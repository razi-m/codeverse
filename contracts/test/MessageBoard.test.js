const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MessageBoard", function () {
  let board, owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    board = await ethers.deployContract("MessageBoard");
    await board.waitForDeployment();
  });

  it("starts empty", async function () {
    expect(await board.postCount()).to.equal(0n);
  });

  it("creates a post and emits an event", async function () {
    await expect(board.connect(alice).createPost("gm hackathon"))
      .to.emit(board, "PostCreated")
      .withArgs(0n, alice.address, "gm hackathon", anyUint());

    expect(await board.postCount()).to.equal(1n);

    const post = await board.getPost(0);
    expect(post.author).to.equal(alice.address);
    expect(post.content).to.equal("gm hackathon");
    expect(post.tips).to.equal(0n);
  });

  it("rejects empty content", async function () {
    await expect(board.createPost("")).to.be.revertedWithCustomError(board, "EmptyContent");
  });

  it("rejects content over the length limit", async function () {
    await expect(board.createPost("x".repeat(281))).to.be.revertedWithCustomError(
      board,
      "ContentTooLong"
    );
  });

  it("forwards a tip to the post author", async function () {
    await board.connect(alice).createPost("tip me");
    const tip = ethers.parseEther("1");

    await expect(board.connect(bob).tipPost(0, { value: tip })).to.changeEtherBalances(
      [bob, alice],
      [-tip, tip]
    );

    const post = await board.getPost(0);
    expect(post.tips).to.equal(tip);
  });

  it("rejects a zero tip and an unknown post", async function () {
    await board.connect(alice).createPost("hi");
    await expect(board.tipPost(0, { value: 0 })).to.be.revertedWithCustomError(board, "ZeroTip");
    await expect(board.tipPost(99, { value: 1 })).to.be.revertedWithCustomError(board, "NoSuchPost");
  });

  it("paginates and clamps past the end", async function () {
    for (let i = 0; i < 5; i++) await board.createPost(`post ${i}`);

    expect(await board.getPosts(0, 2)).to.have.lengthOf(2);
    // limit runs past the end -> clamped to what exists
    expect(await board.getPosts(3, 10)).to.have.lengthOf(2);
    // offset past the end -> empty page, not a revert
    expect(await board.getPosts(50, 10)).to.have.lengthOf(0);
  });

  it("tracks posts per author", async function () {
    await board.connect(alice).createPost("a1");
    await board.connect(bob).createPost("b1");
    await board.connect(alice).createPost("a2");

    const aliceIds = await board.getPostsByAuthor(alice.address);
    expect(aliceIds.map(Number)).to.deep.equal([0, 2]);
  });
});

// Matches any uint (used for block timestamps we can't predict).
function anyUint() {
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  return anyValue;
}
