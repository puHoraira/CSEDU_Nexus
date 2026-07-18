/**
 * Test script for social features (Posts and Chat)
 * Run with: node backend/scripts/test-social-features.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { Post } = require("../src/models/Post");
const { PostComment } = require("../src/models/PostComment");
const { PostLike } = require("../src/models/PostLike");
const { ChatMessage } = require("../src/models/ChatMessage");
const { ChatConversation } = require("../src/models/ChatConversation");
const { User } = require("../src/models/User");

async function testSocialFeatures() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test 1: Check if User collection exists and has data
    console.log("📊 Test 1: Checking User collection...");
    const userCount = await User.countDocuments();
    console.log(`   Found ${userCount} users`);
    
    if (userCount === 0) {
      console.log("   ⚠️  No users found. Run seedBaseData.js first!\n");
      process.exit(1);
    }

    const sampleUser = await User.findOne().select("firstName lastName email");
    console.log(`   Sample user: ${sampleUser.firstName} ${sampleUser.lastName} (${sampleUser.email})`);
    console.log("   ✅ User collection OK\n");

    // Test 2: Create a test post
    console.log("📝 Test 2: Creating a test post...");
    const testPost = await Post.create({
      authorId: sampleUser._id,
      content: "This is a test post created by the test script! #testing",
      images: [],
      isAnnouncement: false,
      tags: ["testing", "automated"],
      mentions: [],
      visibility: "Public",
    });
    console.log(`   ✅ Created post: ${testPost._id}`);
    console.log(`   Content: "${testPost.content}"\n`);

    // Test 3: Fetch posts
    console.log("📋 Test 3: Fetching posts...");
    const posts = await Post.find({ isDeleted: false })
      .populate("authorId", "firstName lastName avatarUrl")
      .limit(5)
      .lean();
    console.log(`   Found ${posts.length} posts`);
    posts.forEach((post, index) => {
      console.log(`   ${index + 1}. "${post.content.substring(0, 50)}..." by ${post.authorId.firstName} ${post.authorId.lastName}`);
    });
    console.log("   ✅ Posts fetch OK\n");

    // Test 4: Create a comment
    console.log("💬 Test 4: Creating a comment...");
    const testComment = await PostComment.create({
      postId: testPost._id,
      authorId: sampleUser._id,
      content: "This is a test comment!",
      images: [],
      mentions: [],
    });
    console.log(`   ✅ Created comment: ${testComment._id}`);
    console.log(`   Content: "${testComment.content}"\n`);

    // Test 5: Like the post
    console.log("❤️  Test 5: Liking the post...");
    const testLike = await PostLike.create({
      userId: sampleUser._id,
      postId: testPost._id,
      reactionType: "Like",
    });
    console.log(`   ✅ Created like: ${testLike._id}\n`);

    // Test 6: Check Chat models
    console.log("💬 Test 6: Checking Chat collections...");
    const messageCount = await ChatMessage.countDocuments();
    const conversationCount = await ChatConversation.countDocuments();
    console.log(`   Messages: ${messageCount}`);
    console.log(`   Conversations: ${conversationCount}`);
    console.log("   ✅ Chat collections accessible\n");

    // Test 7: Create a test chat message (need 2 users)
    const users = await User.find().limit(2).select("_id firstName lastName");
    if (users.length >= 2) {
      console.log("📨 Test 7: Creating a test chat message...");
      const testMessage = await ChatMessage.create({
        senderId: users[0]._id,
        receiverId: users[1]._id,
        content: "Hello! This is a test message from the test script.",
        images: [],
      });
      console.log(`   ✅ Created message: ${testMessage._id}`);
      console.log(`   From: ${users[0].firstName} → To: ${users[1].firstName}\n`);

      // Create conversation
      console.log("💬 Test 8: Creating/updating conversation...");
      const participants = ChatConversation.getConversationId(users[0]._id, users[1]._id);
      const conversation = await ChatConversation.findOneAndUpdate(
        { participants },
        {
          $set: {
            lastMessageId: testMessage._id,
            lastMessageContent: testMessage.content.substring(0, 200),
            lastMessageAt: testMessage.createdAt,
          },
          $setOnInsert: {
            participants,
            unreadCount: new Map([[users[1]._id.toString(), 1]]),
          },
        },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Conversation ID: ${conversation._id}\n`);
    } else {
      console.log("   ⚠️  Need at least 2 users for chat test. Skipping.\n");
    }

    // Summary
    console.log("=" .repeat(60));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=" .repeat(60));
    console.log("\n📊 Database Summary:");
    console.log(`   Users: ${userCount}`);
    console.log(`   Posts: ${await Post.countDocuments()}`);
    console.log(`   Comments: ${await PostComment.countDocuments()}`);
    console.log(`   Likes: ${await PostLike.countDocuments()}`);
    console.log(`   Chat Messages: ${await ChatMessage.countDocuments()}`);
    console.log(`   Conversations: ${await ChatConversation.countDocuments()}`);
    console.log("\n🚀 You can now test the API endpoints!");
    console.log("   - GET http://localhost:5000/api/v1/posts");
    console.log("   - POST http://localhost:5000/api/v1/posts");
    console.log("   - GET http://localhost:5000/api/v1/chat/conversations");
    console.log("   - POST http://localhost:5000/api/v1/chat/messages\n");

  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

testSocialFeatures();
