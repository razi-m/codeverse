// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MessageBoard
/// @notice Demo contract for the hackathon scaffold: users post messages on-chain
///         and can tip a post's author. Replace with your real domain logic.
contract MessageBoard {
    struct Post {
        uint256 id;
        address author;
        string content;
        uint256 timestamp;
        uint256 tips;
    }

    Post[] private posts;
    mapping(address => uint256[]) private postsByAuthor;

    uint256 public constant MAX_CONTENT_LENGTH = 280;

    event PostCreated(uint256 indexed id, address indexed author, string content, uint256 timestamp);
    event PostTipped(uint256 indexed id, address indexed from, address indexed author, uint256 amount);

    error EmptyContent();
    error ContentTooLong(uint256 length);
    error NoSuchPost(uint256 id);
    error ZeroTip();
    error TipTransferFailed();

    function createPost(string calldata content) external returns (uint256 id) {
        bytes memory raw = bytes(content);
        if (raw.length == 0) revert EmptyContent();
        if (raw.length > MAX_CONTENT_LENGTH) revert ContentTooLong(raw.length);

        id = posts.length;
        posts.push(
            Post({id: id, author: msg.sender, content: content, timestamp: block.timestamp, tips: 0})
        );
        postsByAuthor[msg.sender].push(id);

        emit PostCreated(id, msg.sender, content, block.timestamp);
    }

    /// @notice Tip a post's author. Funds forward straight to the author, so the
    ///         contract never custodies balances.
    function tipPost(uint256 id) external payable {
        if (id >= posts.length) revert NoSuchPost(id);
        if (msg.value == 0) revert ZeroTip();

        Post storage post = posts[id];
        post.tips += msg.value;

        (bool ok, ) = payable(post.author).call{value: msg.value}("");
        if (!ok) revert TipTransferFailed();

        emit PostTipped(id, msg.sender, post.author, msg.value);
    }

    function getPost(uint256 id) external view returns (Post memory) {
        if (id >= posts.length) revert NoSuchPost(id);
        return posts[id];
    }

    function postCount() external view returns (uint256) {
        return posts.length;
    }

    function getPostsByAuthor(address author) external view returns (uint256[] memory) {
        return postsByAuthor[author];
    }

    /// @notice Paginated read so the frontend never pulls an unbounded array.
    function getPosts(uint256 offset, uint256 limit) external view returns (Post[] memory page) {
        uint256 total = posts.length;
        if (offset >= total) return new Post[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        page = new Post[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = posts[i];
        }
    }
}
