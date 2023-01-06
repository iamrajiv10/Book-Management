const userModel = require('../Model/userModel')
const jwt = require('jsonwebtoken')
const moment = require('moment')


const isValidRequestBody = function (object) {
    return Object.keys(object).length > 0;
};



// ----------------------------------------------------- create User ----------------------------------------------------


const createUser = async function (req, res) {

    try {
        const data = req.body
        const userData = await userModel.create(data)
        return res.status(201).send({ status: true, data: userData })
    }

    catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}

//  --------------------------------------------------------- login ----------------------------------------------------------


const login = async function (req, res) {
    try {
        const requestBody = req.body; // it consist email and password
        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Provide Credentials for login" });
        }
        
        if (!requestBody.email ) { return res.status(400).send({ status: false, message: "email is required for login" }) }
        if (!requestBody.password ) { return res.status(400).send({ status: false, message: "password is required for login" }) }


        const user = await userModel.findOne(requestBody)
        if (!user) return res.status(400).send({ status: false, message: "Invalid Credentials!!" })

        let expiration = '7d'
        let token = jwt.sign({
            userId: user._id.toString(),
            topic: "BooksManagement"
        }, 'project-3-group-61', { expiresIn: expiration });
        res.header("x-api-key", token);
        let tokenData = {
            token: token,
            userId: user._id,
            iat: moment(),
            exp: expiration
        }

        res.status(200).send({ status: true, message: "Success", data: tokenData })

    }
    catch (err) {
        return res.status(500).send({ message: err.message })
    }
}

module.exports.createUser = createUser;
module.exports.login = login;
