import RegistrationForm from './modules/registrationForm'
import ContactForm from './modules/contactForm'
import CreateWeek from './modules/createWeek'

if (document.querySelector("#registration-form")) {
    new RegistrationForm()
}

if (document.querySelector("#contactForm")) {
    new ContactForm()
}

if (document.querySelector("#create-week")) {
    new CreateWeek()
}