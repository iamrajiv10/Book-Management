const BookModel = require('../Model/bookModel')
const reviewModel = require('../Model/reviewModel')
const UserModel = require('../Model/userModel')
const {uploadFile}= require('../Middleware/aws')
const moment = require("moment");
const { default: mongoose } = require('mongoose');


//**************************VALIDATION FUNCTION*******************/

const isValid = function (value) {
  if (typeof value == "undefined" || value == null) return false
  if (typeof value == "string" && value.trim().length > 0) return true
}

const isValidRequestBody = function (object) {
  return Object.keys(object).length > 0
}

const isValidIdType = function (objectId) {
  return mongoose.Types.ObjectId.isValid(objectId)
}

const isValidSubcategory = function (value) {
  if (typeof value == "undefined" || value == null) return false
  if (typeof value == "string" && value.trim().length > 0) return true
}


//************************************NEW BOOK REGISTRATION*************************/

const createBook = async function (req, res) {

  try {

    //const requestBody = req.body;
    const queryParams = req.query;
    const decoded = req.decoded;

    //  query params should be empty
    //if (isValidRequestBody(queryParams)) { return res.status(400).send({ status: false, message: "invalid request" }) }

    //if (!isValidRequestBody(requestBody)) { return res.status(400).send({ status: false, message: "Book data is required to create a new Book" }) }

    // using destructuring then validate the keys
    const { title, excerpt, userId, ISBN, category, subcategory, releasedAt } = requestBody;

    if (!isValid(title)) { return res.status(400).send({ status: false, message: `title is required and should be in valid format` }) }

    // title must be unique
    const isTitleUnique = await BookModel.findOne({ title: title, isDeleted: false })

    if (isTitleUnique) { return res.status(400).send({ status: false, message: `title already exist` }) }

    if (!isValid(excerpt)) { return res.status(400).send({ status: false, message: `excerpt is required and should be in valid format` }) }

    if (!isValid(userId)) { return res.status(400).send({ status: false, message: `userId is required and should be in valid format` }) }

    if (!isValidIdType(userId)) { return res.status(400).send({ status: false, message: `enter a valid userId` }) }

    // finding user with the given id
    const isUserExistWithID = await UserModel.findById(userId)

    if (!isUserExistWithID) { return res.status(404).send({ status: false, message: `no user exist with ${userId}` }) }

    // authorization
    if (decoded.userId != requestBody.userId) { return res.status(403).send({ status: false, message: `unauthorized access` }) }

    if (!isValid(ISBN)) { return res.status(400).send({ status: false, message: `ISBN is required` }) }
    // checking ISBN format
    if (!/^(?=(?:\D*\d){13}(?:(?:\D*\d){3})?$)[\d-]+$/.test(ISBN)) {
      return res.status(400).send({ status: false, message: `enter a valid ISBN of 13 digits` })
    }

    // ISBN should be unique
    const isUniqueISBN = await BookModel.findOne({ ISBN: ISBN, isDeleted: false })

    if (isUniqueISBN) { return res.status(400).send({ status: false, message: `ISBN already exist` }) }

    if (!isValid(category)) { return res.status(400).send({ status: false, message: `category is required and should be in valid format` }) }

    // validating subcategory
    if (!isValidSubcategory(subcategory)) { return res.status(400).send({ status: false, message: `subcategory is required and should be in valid format` }) }

    if (!isValid(releasedAt)) { return res.status(400).send({ status: false, message: `releasedAt is required` }) }

    // checking date format
    if (!/^[0-9]{4}[-]{1}[0-9]{2}[-]{1}[0-9]{2}/.test(releasedAt)) {
      return res.status(400).send({ status: false, message: `released date format should be YYYY-MM-DD` })
    }

    // validating the date
    if (moment(releasedAt).isValid() == false) { return res.status(400).send({ status: false, message: "enter a valid released date" }) }



    
    let file = req.files

    if(file && file.length>0){
        //upload to s3 and get the uploaded link
        // res.send the link back to frontend/postman
        let uploadedFileURL= await uploadFile(file[0])

        requestBody['bookCover'] = uploadedFileURL
        console.log(uploadedFileURL)
    }
    else{
        res.status(400).send({status : false, message: "No file found" })
    }
      
  



    const newBook = await BookModel.create(requestBody);
    res.status(201).send({ status: true, message: "new book added successfully", data: newBook });
  }
  catch (err) {

    res.status(500).send({ error: err.message })

  }
};

//-----------------------------------------------------GET /books-------------------------------------------------------------

const getBooks = async function (req, res) {
  try {
    let queryParams = req.query;
    const requestBody = req.body;
    let queryData = { isDeleted: false, ...queryParams }

    if (queryParams.userId) {
      if (!isValidIdType(queryParams.userId)) {
        return res
          .status(400)
          .send({ status: false, message: `enter a valid userId` });
      }
    }

    if (isValidRequestBody(requestBody)) {
      return res
        .status(400)
        .send({ status: false, message: "invalid request" });
    }

    if (!isValidRequestBody(queryParams)) {
      const books = await BookModel.find({ isDeleted: false }).select({ title: 1, excerpt: 1, userId: 1, category: 1, releasedAt: 1, reviews: 1 }).sort({ title: 1 })
      if (Object.keys(books).length == 0) { return res.status(404).send({ status: false, message: "No book found" }) }
      res.status(200).send({ status: true, message: "Books list", data: books });
    }
    else {

      const books = await BookModel.find(queryData).select({ title: 1, excerpt: 1, userId: 1, category: 1, releasedAt: 1, reviews: 1 }).sort({ title: 1 })
      if (Object.keys(books).length == 0) { return res.status(404).send({ status: false, message: "No book found" }) }
      res.status(200).send({ status: true, message: "Books list", data: books });

    }

  }
  catch (error) {
    res.status(500).send({ status: false, Error: error.message });
  }
}


// ----------------------------------------------------- GET /books/:bookId -------------------------------------------------------


const getBooksById = async function (req, res) {

  try {

    let bookId = req.params.bookId
    if (!isValidIdType(bookId)) { return res.status(400).send({ status: false, message: "please give valid bookId" }) }
    let findBook = await BookModel.findOne({ _id: bookId, isDeleted: false }).lean()
    if (!findBook) { return res.status(404).send({ status: false, message: "No book found" }) }

    const reviewData = await reviewModel.find({ bookId: findBook._id, isDeleted: false }).select({ _id: 1, bookId: 1, reviewedBy: 1, reviewedAt: 1, rating: 1, review: 1 })
    findBook["reviewsData"] = reviewData
    res.status(200).send({ status: true, message: 'Book list', data: findBook })

  }
  catch (error) {
    return res.status(500).send({ status: false, message: error.message });

  }
};

//---------------------PUT /books/:bookId------------------------------------------------------------------------------//

const updateBooks = async function (req, res) {
  try {
    let bookId = req.params.bookId
    let requestBody = req.body
    let queryParams = req.query

    //  query params should be empty
    if (isValidRequestBody(queryParams)) { return res.status(400).send({ status: false, message: "invalid request" }) }

    if (!isValidRequestBody(requestBody)) { return res.status(400).send({ status: false, message: "Book data is required to update a new Book" }) }

    let { title, excerpt, releasedAt, ISBN } = requestBody

    const isTitleUnique = await BookModel.findOne({ title: title, isDeleted: false })

    if (title) {
      if (!isValid(title)) { return res.status(400).send({ status: false, message: `title is required and should be in valid format` }) }

      if (isTitleUnique) { return res.status(400).send({ status: false, message: `title already exist` }) }
    }

    if (ISBN) {
      if (!isValid(ISBN)) { return res.status(400).send({ status: false, message: `ISBN is required` }) }

      // checking ISBN format
      if (!/^(?=(?:\D*\d){13}(?:(?:\D*\d){3})?$)[\d-]+$/.test(ISBN)) {
        return res.status(400).send({ status: false, message: `enter a valid ISBN of 13 digits` })
      }

      const isUniqueISBN = await BookModel.findOne({ ISBN: ISBN, isDeleted: false })

      if (isUniqueISBN) { return res.status(400).send({ status: false, message: "ISBN already exist" }) }
    }


    const bookUpdated = await BookModel.findOneAndUpdate({ _id: bookId, isDeleted: false }, { $set: { title: title, excerpt: excerpt, releasedAt: Date.now(), ISBN: ISBN } }, { new: true })
    if (!bookUpdated) return res.status(400).send({ status: false, message: "books are already deleted" })
    return res.status(200).send({ status: true, data: bookUpdated })
  }
  catch (err) {
    return res.status(500).send({ status: false, message: err.message })
  }
}



//---------------------Delete:/ DeleteBookByParams---------------------------------------------------------------------//

const deleteBookById = async function (req, res) {
  try {
    let bookId = req.params.bookId;
    let deletedata = await BookModel.findByIdAndUpdate(
      bookId,
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    res.status(200).send({ status: true, message: "SuccessFully Deleted" });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
}


module.exports.createBook = createBook;
module.exports.getBooks = getBooks
module.exports.getBooksById = getBooksById
module.exports.deleteBookById = deleteBookById
module.exports.updateBooks = updateBooks