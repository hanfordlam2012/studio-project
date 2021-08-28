export default class ContactForm {
    constructor() {
        this.form = document.querySelector('#contact-form')
        this.allFields = document.querySelectorAll("#contactEmailDiv, #contactMessageDiv")
        this.insertValidationElements()
        // contactEmail
        this.contactEmailInput = document.querySelector("#contactEmailInput")
        this.contactEmailDiv = document.querySelector("#contactEmailDiv")
        this.contactEmailPrepend = document.querySelector("#contactEmailPrepend")
        this.contactEmailText = document.querySelector("#contactEmailText")
        this.contactEmailInput.previousValue = ""
        // contactMessage
        this.contactMessageInput = document.querySelector("#contactMessageInput")
        this.contactMessageDiv = document.querySelector("#contactMessageDiv")
        this.contactMessageInput.previousValue = ""
        // add recaptcha token
        this.recaptchaTokenInput = document.querySelector("#recaptchaTokenInput")
        this.events()
    }

    // Events
    events() {
        this.form.addEventListener("submit", (e) => {
            e.preventDefault()
            this.formSubmitHandler()
        })
        // keyup
        this.contactEmailInput.addEventListener("keyup", () => {
            this.isDifferent(this.contactEmailInput, this.contactEmailInputHandler)
        })
        this.contactMessageInput.addEventListener("keyup", () => {
            this.isDifferent(this.contactMessageInput, this.contactMessageInputHandler)
        })
        // blur
        this.contactEmailInput.addEventListener("blur", () => {
            this.isDifferent(this.contactEmailInput, this.contactEmailInputHandler)
        })
    }

    // Methods
    formSubmitHandler() {
        this.contactEmailInputAfterDelay()
        this.contactMessageOnlyOnSubmit()
        let self = this // SOLVE SCOPE PROBLEM

        if (
            !this.contactEmailDiv.errors &&
            !this.contactMessageDiv.errors
            ) {
            grecaptcha.ready(function(){
                grecaptcha.execute('6LdmwyccAAAAAAeyi3pmB9GFe7CqpJgEuqutQqVL', {action: 'submit'}).then(function(token){
                    document.getElementById("contactFormSubmit").innerHTML = "Sending..."
                    document.getElementById("contactFormSubmit").disabled = true
                    document.getElementById("recaptchaTokenInput").value = token // add token to form submit
                    self.form.submit() // use self instead of this to refer beyond scope
                })
            })
            
        }
    }

    contactMessageOnlyOnSubmit() {
        if (this.contactMessageInput.value == "") {
            this.contactMessageDiv.previousElementSibling.classList.remove('d-none')
            this.contactMessageDiv.previousElementSibling.innerHTML = "You need to include a message."
            this.contactMessageDiv.errors = true
        }
    }

    isDifferent(el, handler) {
        if (el.previousValue != el.value) {
            handler.call(this)
        }
        el.previousValue = el.value
    }

    contactEmailInputHandler() {
        this.contactEmailDiv.errors = false
        // this formula gives standard time delay after events
        clearTimeout(this.contactEmailInput.timer)
        this.contactEmailInput.timer = setTimeout(() => this.contactEmailInputAfterDelay(), 800)
    }

    contactMessageInputHandler() {
        this.contactMessageDiv.errors = false
        this.contactMessageInputImmediately()
    }

    contactMessageInputImmediately() {
        if (this.contactMessageInput.value == "") {
            this.contactMessageDiv.previousElementSibling.classList.remove('d-none')
            this.contactMessageDiv.previousElementSibling.innerHTML = "You need to include a message."
        } else {
            this.contactMessageDiv.previousElementSibling.classList.add('d-none')
        }
    }

    contactEmailInputAfterDelay() {
        if (!/^\S+@\S+$/.test(this.contactEmailInput.value)) {
            this.showValidationError(this.contactEmailDiv, this.contactEmailPrepend, this.contactEmailText,  "You must provide a valid email.")
        } else {
            this.hideValidationError(this.contactEmailDiv, this.contactEmailPrepend, this.contactEmailText)
        }
    }

    hideValidationError(element1, element2, element3) {
        try {
            element2.style.borderRight = "1.5px solid green"
            element3.style.color = "green"
            element3.style.border = "1.5px solid green"
        } finally {
            element1.previousElementSibling.classList.add('d-none')
        }
    }

    showValidationError(element1, element2, element3, msg) {
        try {
            element2.style.borderRight = "1.5px solid red"
            element3.style.color = "red"
            element3.style.border = "1.5px solid red"
            element1.previousElementSibling.innerHTML = msg
            element1.previousElementSibling.classList.remove('d-none')
            element1.errors = true
        } catch (err) {
            console.log(err)
        }
    }

    insertValidationElements() {
        this.allFields.forEach(function(element) {
            element.insertAdjacentHTML('beforebegin', '<div class="alert alert-danger small d-none"></div>')
        })
    }
}