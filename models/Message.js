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
            let message = data.message
            let output = `<ul>
            <li>Email: ${email}</li>
            <li>Message: ${message}</li>
            </ul>`
            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                host: "smtp.live.com",
                port: 25,
                secure: false, // true for 465, false for other ports
                auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAILPASSWORD,
                },
            });

            // send mail with defined transport object
            await transporter.sendMail({
                from: process.env.EMAIL, // sender address
                to: process.env.EMAIL, // list of receivers
                subject: "Contact from hanfordlam.com", // Subject line
                html: output, // html body
            });
            resolve('success')
        } catch (err) {
            reject('fail')
        }
        
    })
}

module.exports = Message