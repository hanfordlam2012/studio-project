const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
dotenv.config()

let Message = function(data) {
    this.email = data.email
    this.message = data.message
}

Message.sendEmail = function (data) {
    return new Promise(async (resolve, reject) => {
        try {
            let email = data.email
            // blacklist feature 
            if (email == "ericjonesonline@outlook.com") {
                reject('spam detected');
            } else {
                let message = data.message
                let output = `<ul>
                <li>Email: ${email}</li>
                <li>Message: ${message}</li>
                </ul>`
                // create reusable transporter object using the default SMTP transport
                let transporter = nodemailer.createTransport({
                    host: "localhost",
                    port: 465,
                    secure: true, // true for 465, false for other ports
                    auth: {
                    user: process.env.A2EMAIL,
                    pass: process.env.A2EMAILPASSWORD,
                    },
                });

                // send mail with defined transport object
                await transporter.sendMail({
                    from: process.env.A2EMAIL, // sender address
                    to: process.env.EMAIL, // list of receivers
                    subject: "Contact from hanfordlam.com", // Subject line
                    html: output, // html body
                });
                resolve('success')
                }
        } catch (err) {
            console.log(err)
            reject('fail')
        }
        
    })
}

module.exports = Message