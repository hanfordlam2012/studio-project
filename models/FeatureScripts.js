const bcrypt = require('bcryptjs')
// hash password feature for password resets
hashPassword = async function () {
    let salt = bcrypt.genSaltSync(10)
    let hashedPassword = bcrypt.hashSync('connie2024', salt)
    console.log(hashedPassword)
}

hashPassword()