const express = require('express')
const bodyParser = require("body-parser")
const route = require('./routes/route')
const mongoose = require('mongoose')
const app = express();
const multer = require('multer')

app.use(express.json());
app.use(multer().any())
mongoose.connect("mongodb+srv://ShailyTripathi:ShailyCompass2125@shailytripathi.ifjbsp5.mongodb.net/group61Database?retryWrites=true&w=majority", {
    useNewUrlParser: true
})
    .then(() => console.log("MongoDb is connected"))
    .catch(err => console.log(err))

app.use('/', route)


app.listen(process.env.PORT || 3000, function () {
    console.log('Express app running on port ' + (process.env.PORT || 3000))
})
