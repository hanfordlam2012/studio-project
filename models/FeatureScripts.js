const bcrypt = require('bcryptjs')
// hash password feature for password resets
hashPassword = async function () {
    let salt = bcrypt.genSaltSync(10)
    let hashedPassword = bcrypt.hashSync('newpasswordgoeshere', salt)
    console.log(hashedPassword)
}

hashPassword()