import RegistrationForm from './modules/registrationForm'
import ContactForm from './modules/contactForm'

if (document.querySelector("#registration-form")) {
    new RegistrationForm()
}

if (document.querySelector("#contactForm")) {
    new ContactForm()
}