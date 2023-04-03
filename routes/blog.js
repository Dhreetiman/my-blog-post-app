let router = require("express").Router();
let User = require("../models/User");
let Blog = require("../models/Blog");
let auth = require("../middleware/auth");
const redis = require("redis");
const { promisify } = require("util");

//==============< Redis connection >==============//

const redisConnect = redis.createClient(
  10601,
  "redis-10601.c212.ap-south-1-1.ec2.cloud.redislabs.com",

  { no_ready_check: true, legacyMode: true }
);

redisConnect.auth("kDeXAKuAxskvd0Nnm45BSV341noNbWHR", function (err) {
  if (err) throw err;
});

redisConnect.on("connect", async function () {
  console.log("Redis is Connected...");
});

//--------------------------------------------------------------------

// const redisClient = redis.createClient({host:'redis-10601.c212.ap-south-1-1.ec2.cloud.redislabs.com',port:10601,username:'default',password:'kDeXAKuAxskvd0Nnm45BSV341noNbWHR'});

// redisClient.on('connect',() => {
//     console.log('connected to redis successfully!');
// })

// redisClient.on('error',(error) => {
//     console.log('Redis connection error :', error);
// })

const GET_ASYNC = promisify(redisConnect.GET).bind(redisConnect);
const SET_ASYNC = promisify(redisConnect.SETEX).bind(redisConnect);

//==============< Function for validating input >==============//

const isValidInput = function (value) {
  if (typeof value === "undefined" || typeof value === "null") {
    return false;
  }
  if (typeof value === "string" && value.trim().length == 0) {
    return false;
  }
  return true;
};

//==============< Create Post - Login required >==============//

router.post("/createpost", auth, async (req, res) => {
  try {
    let { createdBy, message, comments } = req.body;

    // Getting data from redis............

    let cahcedProfileData = await GET_ASYNC(`${message}`);

    if (cahcedProfileData) {
      let txt = JSON.parse(cahcedProfileData);
      res.status(200).send({ msg: "from get", data: txt });
    } else {
      let obj = {};

      if (!isValidInput(message))
        return res.status(400).send("This field cannot be empty");

      obj.createdBy = req.user.id;
      obj.message = message;
      obj.comments = comments;

      let findData = await Blog.findOne({ message: message }).select({
        _id: 0,
        __v: 0,
      });

      if (findData) {
        //-------- create in redis---------------//
        await SET_ASYNC(`${message}`, 60 * 5, JSON.stringify(findData));

        return res.status(200).send({ message: "by redis", Data: findData });
      }

      let blog = await Blog.create(obj);
      res.json(blog);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json("Something went wrong");
  }
});

//==========<< Fetch all Posts of current loggedin user >>===========//

router.get("/getpost", auth, async (req, res) => {
  try {
    // Getting data from redis............
    let cachedProfileData = await GET_ASYNC(`${req.user.id}`);

    if (cachedProfileData) {
      let txt = JSON.parse(cachedProfileData);
      res.status(200).send({ msg: "from get", data: txt });
    } else {
      let user = await User.findById(req.user.id)
        .select({ password: 0, __v: 0 })
        .lean();
      let post = await Blog.find({ createdBy: req.user.id })
        .select({ createdBy: 0 })
        .lean();

      user.posts = post;

      //Saving cache data in redis......
      await SET_ASYNC(`${req.user.id}`, 60 * 5, JSON.stringify(user));
      res.status(200).json(user);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json("Something went wrong");
  }
});

//==============< Fetch all post - Login required >==============//

router.get("/getallpost", auth, async (req, res) => {
  try {
    let post = await Blog.find({})
      .populate("createdBy", "name email mobile")
      .populate("comments.sentBy", "name email mobile")
      .populate("comments.liked", "name email mobile");

    return res.status(200).json(post);
  } catch (error) {
    console.log(error);
    return res.status(500).json("Something went wrong");
  }
});

//==============< Update post - Login required >==============//

router.put("/updatepost/:id", auth, async (req, res) => {
  try {
    let post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).send("Not Found");
    if (post.createdBy != req.user.id)
      return res.status(401).send("Unauthorized user");

    if (!isValidInput(req.body.message))
      return res.status.send("This field cannot be empty");

    let obj = {};
    obj.message = req.body.message;

    let updatedPost = await Blog.findByIdAndUpdate(
      { _id: req.params.id },
      { $set: obj },
      { new: true }
    );
    console.log(updatedPost);
    res.status(200).json({
      message: "blog has been updated successfully",
      data: updatedPost,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json("Something went wrong");
  }
});

//==============< Delete post - Login required >==============//

router.delete("/deletepost/:id", auth, async (req, res) => {
  try {

    let post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).send("Not Found");
    if (post.createdBy != req.user.id) return res.status(401).send("Unauthorized user");

    let deletedpost = await Blog.findByIdAndDelete(req.params.id)
    res.status(200).send("post deleted successfully")


  } catch (error) {
    console.log(error);
    return res.status(500).json("Something went wrong");
  }
});

module.exports = router;
