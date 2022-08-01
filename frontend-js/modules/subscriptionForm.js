import axios from 'axios'
import validator from 'validator'

// UNUSED client side security
export default class SubscriptionForm {
    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#subscription-form")
        this.allFields = document.querySelectorAll("#subscription-form .input-group")
        this.insertValidationElements()
        // email
        this.emailInput = document.querySelector("#emailInput")
        this.emailDiv = document.querySelector("#emailDiv")
        this.emailInput.previousValue = ""
        this.emailInput.isUnique = false
        // username
        this.usernameInput = document.querySelector("#usernameInput")
        this.usernameDiv = document.querySelector("#usernameDiv")
        this.usernameInput.previousValue = ""
        this.usernameInput.isUnique = false
        // password
        this.passwordInput = document.querySelector("#passwordInput")
        this.passwordDiv = document.querySelector("#passwordDiv")
        this.passwordInput.previousValue = ""

        this.events()
    }


    // Events
    events() {
        this.form.addEventListener("submit", (e) => {
            e.preventDefault()
            this.formSubmitHandler()
        })
        // keyup
       this.usernameInput.addEventListener("keyup", () => {
            this.isDifferent(this.usernameInput, this.usernameInputHandler)
        })
        this.emailInput.addEventListener("keyup", () => {
            this.isDifferent(this.emailInput, this.emailInputHandler)
        })
        this.passwordInput.addEventListener("keyup", () => {
            this.isDifferent(this.passwordInput, this.passwordInputHandler)
        })
        // blur
        this.usernameInput.addEventListener("blur", () => {
            this.isDifferent(this.usernameInput, this.usernameInputHandler)
        })
        this.emailInput.addEventListener("blur", () => {
            this.isDifferent(this.emailInput, this.emailInputHandler)
        })
        this.passwordInput.addEventListener("blur", () => {
            this.isDifferent(this.passwordInput, this.passwordInputHandler)
        })
    }

    //Methods
    formSubmitHandler() {
        this.usernameInputImmediately()
        this.usernameInputAfterDelay()
        this.emailInputAfterDelay()
        this.passwordInputImmediately()
        this.passwordInputAfterDelay()

        if (
            this.usernameInput.isUnique &&
            !this.usernameDiv.errors &&
            this.emailInput.isUnique &&
            !this.emailDiv.errors &&
            !this.passwordDiv.errors
            ) {
            console.log(this.usernameInput.isUnique)
            console.log(this.usernameDiv.errors)
            console.log(this.emailInput.isUnique)
            console.log(this.emailDiv.errors)
            console.log(this.passwordDiv.errors)
            this.form.submit()
        }
        
    }

    isDifferent(el, handler) {
        if (el.previousValue != el.value) {
            handler.call(this)
        }
        el.previousValue = el.value
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

    usernameInputImmediately() {
        if (this.usernameInput.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.usernameInput.value)) {
            this.showValidationError(this.usernameDiv, "Username can only contain letters and numbers.")
        }

        if (this.usernameInput.value.length > 30) {
            this.showValidationError(this.usernameDiv, "Username must be less than 30 characters.")
        }

        if (!this.usernameDiv.errors) {
            this.hideValidationError(this.usernameDiv)
        }
    }

    passwordInputImmediately() {
        if (this.passwordInput.value.length > 50) {
            this.showValidationError(this.passwordDiv, "Password must be less than 50 characters.")
        }

        if (!this.passwordDiv.errors) {
            this.hideValidationError(this.passwordDiv)
        }
    }

    hideValidationError(element1) {
        element1.previousElementSibling.classList.add('d-none')
    }

    showValidationError(element1, msg) {
        element1.previousElementSibling.innerHTML = msg
        element1.previousElementSibling.classList.remove('d-none')
        element1.errors = true
    }

    usernameInputAfterDelay() {
        if (this.usernameInput.value.length < 3) {
            this.showValidationError(this.usernameDiv, "Username name must be at least 3 characters.")
        }

        if (!this.usernameDiv.errors) {
            axios.post('/doesUsernameExist', {_csrf: this._csrf, username: this.usernameInput.value}).then((response) => {
                if (response.data) {
                    this.showValidationError(this.usernameDiv, "This username name is already taken.")
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
            this.showValidationError(this.passwordDiv, "Password must be at least 8 characters.")
        }
    }

    emailInputAfterDelay() {
        if (!/^\S+@\S+$/.test(this.emailInput.value)) {
            this.showValidationError(this.emailDiv, "You must provide a valid email.")
        }

        if (!this.emailDiv.errors) {
            axios.post('/doesEmailExist', {_csrf: this._csrf, email: this.emailInput.value}).then((response) => {
                if (response.data) {
                    this.emailInput.isUnique = false
                    this.showValidationError(this.emailDiv, "This email is already taken.")
                } else {
                    this.emailInput.isUnique = true
                    this.hideValidationError(this.emailDiv)
                }
            }).catch(() => {
                console.log("Please try again later.")
            })
        }
    }

    insertValidationElements() {
        this.allFields.forEach(function(el) {
            el.insertAdjacentHTML('beforebegin', '<div class="alert alert-danger small d-none"></div>')
        })
    }
}