let router = require("express").Router();
let User = require("../models/User");
let Blog = require("../models/Blog");
let auth = require("../middleware/auth");
let JWT = require("jsonwebtoken");
let bcrypt = require("bcryptjs");
let { body, validationResult } = require("express-validator");

router.post(
  "/signup",
  [
    body("email", "Plaese enter valid email").isEmail(),
    body("mobile", "Plaese enter valid mobile no.").isLength({
      min: 10,
      max: 10,
    }),
    body("password", "Password must be minimum 6 character").isLength({
      min: 6,
    }),
    body("name", "Please enter a valid name")
      .not()
      .isEmpty()
      .isLength({ min: 3 }),
  ],
  async (req, res) => {
    try {
      const { name, email, mobile, password } = req.body;

      //validations
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      let user = await User.findOne({ email: email, mobile: mobile });

      if (user) {
        return res.status(400).send("user already exist, please login!");
      }
      //encrypting password using bcrypt
      let salt = await bcrypt.genSalt(10);
      let secretpwd = await bcrypt.hash(password, salt);
      // creating new user
      user = await User.create({
        name: name,
        email: email,
        mobile: mobile,
        password: secretpwd,
      });
      // authenticating user using jwt
      const payload = {
        user: {
          id: user.id,
        },
      };

      JWT.sign(payload, "shhh", { expiresIn: 144000 }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json("Something went wrong");
    }
  }
);

//===================< Login >=======================//

router.post(
  "/login",
  [
    body("email", "Plaese enter valid email").isEmail(),
    body("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { email, password } = req.body;
      let user = await User.findOne({ email: email });
      if (!user)
        return res.status(400).json({ errors: { msg: "Invalid Credentials" } });
      let checkPassword = await bcrypt.compare(password, user.password);
      if (!checkPassword)
        return res.status(400).json({ errors: { msg: "Invalid Credentials" } });

      let payload = {
        user: {
          id: user.id,
        },
      };

      JWT.sign(payload, "shhh", { expiresIn: 144000 }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send("Something went wrong");
    }
  }
);

//===================< Users Details >====================//

router.get("/getuser", auth, async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select({ password: 0, __v: 0 });
    return res.json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Something went wrong");
  }
});

router.put("/updateuser/:id", auth, async (req, res) => {
  //validations
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, mobile, password } = req.body;
    let obj = {};

    if (name) {
      obj.name = name;
    }
    if (email || mobile) {
      let checkEmail = await User.findOne({ email: email, mobile: mobile });
      if (checkEmail)
        return res.status(400).send("provided email or phone already exits");
      obj.email = email;
    }
    if (password) {
      let salt = await bcrypt.genSalt(10);
      let secretpwd = await bcrypt.hash(password, salt);
      obj.password = secretpwd;
    }

    let checkUser = await User.findById(req.params.id);
    if (!checkUser) return res.status(404).send("User not found");
    if (checkUser._id.toString() !== req.user.id) {
      return res.status(401).send("Unauthorized user");
    }

    let updateUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: obj },
      { new: true }
    );

    res.json({ mesaage: "User has been updated", data: updateUser });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Something went wrong");
  }
});

router.delete("/deleteuser/:id", auth, async (req, res) => {
  try {

    let user = User.findById(req.params.id)
    if (!user) return res.status(404).send("user not found or already deleted")
    if (user._id.toString() !== req.user.id) {
      return res.status(401).send("Unauthorized user");
    }

    user = User.findByIdAndDelete(req.user.id)
    return res.send('User deleted successfully')

    
  } catch (error) {
    console.log(error);
    return res.status(500).send("Something went wrong");
  }
});

module.exports = router;
