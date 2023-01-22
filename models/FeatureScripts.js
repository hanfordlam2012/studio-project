const bcrypt = require('bcryptjs')
// hash password feature for password resets
hashPassword = async function () {
    let salt = bcrypt.genSaltSync(10)
    let hashedPassword = bcrypt.hashSync('enylecoj', salt)
    console.log(hashedPassword)
}

hashPassword()