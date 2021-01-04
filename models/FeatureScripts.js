const bcrypt = require('bcryptjs')

// hash password feature for password resets
hashPassword = async function (newPassword) {
    let salt = bcrypt.genSaltSync(10)
    let hashedPassword = bcrypt.hashSync(newPassword, salt)
    console.log(hashedPassword)
}