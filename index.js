const express = require("express");
let connectDB = require("./database");
const app = express();

connectDB();
app.use(express.json({ extended: false }));

app.use('/api/auth', require('./routes/user'))
app.use('/api/blog', require('./routes/blog'))

app.listen(process.env.PORT, () => {
  console.log(`Server is running on Port ${process.env.PORT}`);
});
