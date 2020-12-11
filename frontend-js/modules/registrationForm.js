import axios from 'axios'
import validator from 'validator'

export default class RegistrationForm {
    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#registration-form")
        this.allFields = document.querySelectorAll("#registerForm .input-group")
        this.insertValidationElements()
        // fName
        this.fNameInput = document.querySelector("#fNameInput")
        this.fNameDiv = document.querySelector("#fNameDiv")
        this.fNamePrepend = document.querySelector("#fNamePrepend")
        this.fNameText = document.querySelector("#fNameText")
        this.fNameInput.previousValue = ""
        // lName
        this.lNameInput = document.querySelector("#lNameInput")
        this.lNameDiv = document.querySelector("#lNameDiv")
        this.lNamePrepend = document.querySelector("#lNamePrepend")
        this.lNameText = document.querySelector("#lNameText")
        this.lNameInput.previousValue = ""
        // parentName
        this.parentNameInput = document.querySelector("#parentNameInput")
        this.parentNameDiv = document.querySelector("#parentNameDiv")
        this.parentNamePrepend = document.querySelector("#parentNamePrepend")
        this.parentNameText = document.querySelector("#parentNameText")
        this.parentNameInput.previousValue = ""
        // email
        this.emailInput = document.querySelector("#emailInput")
        this.emailDiv = document.querySelector("#emailDiv")
        this.emailPrepend = document.querySelector("#emailPrepend")
        this.emailText = document.querySelector("#emailText")
        this.emailInput.previousValue = ""
        this.emailInput.isUnique = false
         // mobile
         this.mobileInput = document.querySelector("#mobileInput")
         this.mobileDiv = document.querySelector("#mobileDiv")
         this.mobilePrepend = document.querySelector("#mobilePrepend")
         this.mobileText = document.querySelector("#mobileText")
         this.mobileInput.previousValue = ""
        // username
        this.usernameInput = document.querySelector("#usernameInput")
        this.usernameDiv = document.querySelector("#usernameDiv")
        this.usernamePrepend = document.querySelector("#usernamePrepend")
        this.usernameText = document.querySelector("#usernameText")
        this.usernameInput.previousValue = ""
        this.usernameInput.isUnique = false
        // password
        this.passwordInput = document.querySelector("#passwordInput")
        this.passwordDiv = document.querySelector("#passwordDiv")
        this.passwordPrepend = document.querySelector("#passwordPrepend")
        this.passwordText = document.querySelector("#passwordText")
        this.passwordInput.previousValue = ""
        // secret
        this.secretInput = document.querySelector("#secretInput")
        this.secretDiv = document.querySelector("#secretDiv")
        this.secretPrepend = document.querySelector("#secretPrepend")
        this.secretText = document.querySelector("#secretText")
        this.secretInput.previousValue = ""
        this.secretInput.isCorrect = false

        this.events()
    }


    // Events
    events() {
        this.form.addEventListener("submit", (e) => {
            e.preventDefault()
            this.formSubmitHandler()
        })
        // keyup
        this.fNameInput.addEventListener("keyup", () => {
            this.isDifferent(this.fNameInput, this.fNameInputHandler)
        })
        this.lNameInput.addEventListener("keyup", () => {
            this.isDifferent(this.lNameInput, this.lNameInputHandler)
        })
        this.parentNameInput.addEventListener("keyup", () => {
            this.isDifferent(this.parentNameInput, this.parentNameInputHandler)
        })
        this.usernameInput.addEventListener("keyup", () => {
            this.isDifferent(this.usernameInput, this.usernameInputHandler)
        })
        this.emailInput.addEventListener("keyup", () => {
            this.isDifferent(this.emailInput, this.emailInputHandler)
        })
        this.mobileInput.addEventListener("keyup", () => {
            this.isDifferent(this.mobileInput, this.mobileInputHandler)
        })
        this.passwordInput.addEventListener("keyup", () => {
            this.isDifferent(this.passwordInput, this.passwordInputHandler)
        })
        this.secretInput.addEventListener("keyup", () => {
            this.isDifferent(this.secretInput, this.secretInputHandler)
        })
        // blur
        this.fNameInput.addEventListener("blur", () => {
            this.isDifferent(this.fNameInput, this.fNameInputHandler)
        })
        this.lNameInput.addEventListener("blur", () => {
            this.isDifferent(this.lNameInput, this.lNameInputHandler)
        })
        this.parentNameInput.addEventListener("blur", () => {
            this.isDifferent(this.parentNameInput, this.parentNameInputHandler)
        })
        this.usernameInput.addEventListener("blur", () => {
            this.isDifferent(this.usernameInput, this.usernameInputHandler)
        })
        this.emailInput.addEventListener("blur", () => {
            this.isDifferent(this.emailInput, this.emailInputHandler)
        })
        this.mobileInput.addEventListener("blur", () => {
            this.isDifferent(this.mobileInput, this.mobileInputHandler)
        })
        this.passwordInput.addEventListener("blur", () => {
            this.isDifferent(this.passwordInput, this.passwordInputHandler)
        })
        this.secretInput.addEventListener("blur", () => {
            this.isDifferent(this.secretInput, this.secretInputHandler)
        })
    }

    //Methods
    formSubmitHandler() {
        this.fNameInputImmediately()
        this.fNameInputAfterDelay()
        this.lNameInputImmediately()
        this.lNameInputAfterDelay()
        this.parentNameInputImmediately()
        this.parentNameInputAfterDelay()
        this.usernameInputImmediately()
        this.usernameInputAfterDelay()
        this.emailInputAfterDelay()
        this.mobileInputAfterDelay()
        this.passwordInputImmediately()
        this.passwordInputAfterDelay()
        this.secretInputAfterDelay()

        if (
            !this.fNameDiv.errors &&
            !this.lNameDiv.errors &&
            !this.parentNameDiv.errors &&
            this.usernameInput.isUnique &&
            !this.usernameDiv.errors &&
            this.emailInput.isUnique &&
            !this.emailDiv.errors &&
            !this.mobileDiv.errors &&
            !this.passwordDiv.errors &&
            !this.secretDiv.errors &&
            this.secretInput.isCorrect
            ) {
            console.log(this.fNameDiv.errors)
            console.log(this.lNameDiv.errors)
            console.log(this.parentNameDiv.errors)
            console.log(this.usernameInput.isUnique)
            console.log(this.usernameDiv.errors)
            console.log(this.emailInput.isUnique)
            console.log(this.emailDiv.errors)
            console.log(this.mobileDiv.errors)
            console.log(this.passwordDiv.errors)
            console.log(this.secretInput.isCorrect)
            this.form.submit()
        }
        
    }

    isDifferent(el, handler) {
        if (el.previousValue != el.value) {
            handler.call(this)
        }
        el.previousValue = el.value
    }

    fNameInputHandler() {
        this.fNameDiv.errors = false
        this.fNameInputImmediately()
        // this formula gives standard time delay after events
        clearTimeout(this.fNameInput.timer)
        this.fNameInput.timer = setTimeout(() => this.fNameInputAfterDelay(), 800)
    }

    lNameInputHandler() {
        this.lNameDiv.errors = false
        this.lNameInputImmediately()
        // this formula gives standard time delay after events
        clearTimeout(this.lNameInput.timer)
        this.lNameInput.timer = setTimeout(() => this.lNameInputAfterDelay(), 800)
    }

    parentNameInputHandler() {
        this.parentNameDiv.errors = false
        this.parentNameInputImmediately()
        // this formula gives standard time delay after events
        clearTimeout(this.parentNameInput.timer)
        this.parentNameInput.timer = setTimeout(() => this.parentNameInputAfterDelay(), 800)
    }

    usernameInputHandler() {
        this.usernameDiv.errors = false
        this.usernameInputImmediately()
        // this formula gives standard time delay after events
        clearTimeout(this.usernameInput.timer)
        this.usernameInput.timer = setTimeout(() => this.usernameInputAfterDelay(), 800)
    }

    passwordInputHandler() {
        this.passwordDiv.errors = false
        this.passwordInputImmediately()
        // this formula gives standard time delay after events
        clearTimeout(this.passwordInput.timer)
        this.passwordInput.timer = setTimeout(() => this.passwordInputAfterDelay(), 800)
    }

    emailInputHandler() {
        this.emailDiv.errors = false
        // this formula gives standard time delay after events
        clearTimeout(this.emailInput.timer)
        this.emailInput.timer = setTimeout(() => this.emailInputAfterDelay(), 800)
    }

    mobileInputHandler() {
        this.mobileDiv.errors = false
        // this formula gives standard time delay after events
        clearTimeout(this.mobileInput.timer)
        this.mobileInput.timer = setTimeout(() => this.mobileInputAfterDelay(), 800)
    }

    secretInputHandler() {
        this.secretDiv.errors = false
        // this formula gives standard time delay after events
        clearTimeout(this.secretInput.timer)
        this.secretInput.timer = setTimeout(() => this.secretInputAfterDelay(), 800)
    }

    fNameInputImmediately() {
        if (this.fNameInput.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.fNameInput.value)) {
            this.showValidationError(this.fNameDiv, this.fNamePrepend, this.fNameText, "Name can only contain letters and numbers.")
        }

        if (this.fNameInput.value.length > 30) {
            this.showValidationError(this.fNameDiv, this.fNamePrepend, this.fNameText,  "Name must be less than 30 characters.")
        }

        if (!this.fNameDiv.errors) {
            this.hideValidationError(this.fNameDiv, this.fNamePrepend, this.fNameText)
        }
    }

    lNameInputImmediately() {
        if (this.lNameInput.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.lNameInput.value)) {
            this.showValidationError(this.lNameDiv, this.lNamePrepend, this.lNameText, "Name can only contain letters and numbers.")
        }

        if (this.lNameInput.value.length > 30) {
            this.showValidationError(this.lNameDiv, this.lNamePrepend, this.lNameText,  "Name must be less than 30 characters.")
        }

        if (!this.lNameDiv.errors) {
            this.hideValidationError(this.lNameDiv, this.lNamePrepend, this.lNameText)
        }
    }

    parentNameInputImmediately() {
        if (this.parentNameInput.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.parentNameInput.value)) {
            this.showValidationError(this.parentNameDiv, this.parentNamePrepend, this.parentNameText, "Name can only contain letters and numbers.")
        }

        if (this.parentNameInput.value.length > 30) {
            this.showValidationError(this.parentNameDiv, this.parentNamePrepend, this.parentNameText,  "Name must be less than 30 characters.")
        }

        if (!this.parentNameDiv.errors) {
            this.hideValidationError(this.parentNameDiv, this.parentNamePrepend, this.parentNameText)
        }
    }

    usernameInputImmediately() {
        if (this.usernameInput.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.usernameInput.value)) {
            this.showValidationError(this.usernameDiv, this.usernamePrepend, this.usernameText, "Username can only contain letters and numbers.")
        }

        if (this.usernameInput.value.length > 30) {
            this.showValidationError(this.usernameDiv, this.usernamePrepend, this.usernameText,  "Username must be less than 30 characters.")
        }

        if (!this.usernameDiv.errors) {
            this.hideValidationError(this.usernameDiv, this.usernamePrepend, this.usernameText)
        }
    }

    passwordInputImmediately() {
        if (this.passwordInput.value.length > 50) {
            this.showValidationError(this.passwordDiv, this.passwordPrepend, this.passwordText,  "Password must be less than 50 characters.")
        }

        if (!this.passwordDiv.errors) {
            this.hideValidationError(this.passwordDiv, this.passwordPrepend, this.passwordText)
        }
    }

    hideValidationError(element1, element2, element3) {
        element1.previousElementSibling.classList.add('d-none')
        element2.style.borderRight = "1px solid rgb(179, 255, 0)"
        element3.style.color = "rgb(179, 255, 0)"
        element3.style.border = "1px solid rgb(179, 255, 0)"
    }

    showValidationError(element1, element2, element3, msg) {
        element1.previousElementSibling.innerHTML = msg
        element1.previousElementSibling.classList.remove('d-none')
        element1.errors = true
        element2.style.borderRight = "1px solid red"
        element3.style.color = "red"
        element3.style.border = "1px solid red"
    }

    fNameInputAfterDelay() {
        if (this.fNameInput.value.length < 2) {
            this.showValidationError(this.fNameDiv, this.fNamePrepend, this.fNameText,  "Name must be at least 2 characters.")
        }
    }

    lNameInputAfterDelay() {
        if (this.lNameInput.value.length < 2) {
            this.showValidationError(this.lNameDiv, this.lNamePrepend, this.lNameText,  "Name must be at least 2 characters.")
        }
    }

    parentNameInputAfterDelay() {
        if (this.parentNameInput.value.length < 2) {
            this.showValidationError(this.parentNameDiv, this.parentNamePrepend, this.parentNameText,  "Name must be at least 2 characters.")
        }
    }

    usernameInputAfterDelay() {
        if (this.usernameInput.value.length < 3) {
            this.showValidationError(this.usernameDiv, this.usernamePrepend, this.usernameText,  "Username name must be at least 3 characters.")
        }

        if (!this.usernameDiv.errors) {
            axios.post('/doesUsernameExist', {_csrf: this._csrf, username: this.usernameInput.value}).then((response) => {
                if (response.data) {
                    this.showValidationError(this.usernameDiv, this.usernamePrepend, this.usernameText,  "This username name is already taken.")
                    this.usernameInput.isUnique = false
                } else {
                    this.usernameInput.isUnique = true
                }
            }).catch(() => {
                console.log("Please try again later.")
            })
        }
    }

    passwordInputAfterDelay() {
        if (this.passwordInput.value.length < 8) {
            this.showValidationError(this.passwordDiv, this.passwordPrepend, this.passwordText,  "Password must be at least 8 characters.")
        }
    }

    emailInputAfterDelay() {
        if (!/^\S+@\S+$/.test(this.emailInput.value)) {
            this.showValidationError(this.emailDiv, this.emailPrepend, this.emailText,  "You must provide a valid email.")
        }

        if (!this.emailDiv.errors) {
            axios.post('/doesEmailExist', {_csrf: this._csrf, email: this.emailInput.value}).then((response) => {
                if (response.data) {
                    this.emailInput.isUnique = false
                    this.showValidationError(this.emailDiv, this.emailPrepend, this.emailText,  "This email is already taken.")
                } else {
                    this.emailInput.isUnique = true
                    this.hideValidationError(this.emailDiv, this.emailPrepend, this.emailText)
                }
            }).catch(() => {
                console.log("Please try again later.")
            })
        }
    }

    mobileInputAfterDelay() {
        if (!validator.isMobilePhone(this.mobileInput.value, 'en-AU')) {
            this.showValidationError(this.mobileDiv, this.mobilePrepend, this.mobileText,  "You must provide a valid Australian mobile (without spaces).")
        } else {
            this.hideValidationError(this.mobileDiv, this.mobilePrepend, this.mobileText)
        }
    }

    secretInputAfterDelay() {
        axios.post('/isCorrect', {_csrf: this._csrf, secret: this.secretInput.value}).then((response) => {
            if (response.data) {
                this.secretInput.isCorrect = true
                this.hideValidationError(this.secretDiv, this.secretPrepend, this.secretText)
            } else {
                this.showValidationError(this.secretDiv, this.secretPrepend, this.secretText,  "Maybe you need to ask Hanford again.")
            }
        }).catch(() => {
            console.log("Please try again later.")
        })
    }
    

    insertValidationElements() {
        this.allFields.forEach(function(el) {
            el.insertAdjacentHTML('beforebegin', '<div class="alert alert-danger small d-none"></div>')
        })
    }
}