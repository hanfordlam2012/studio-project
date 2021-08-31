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
            // blacklist feature 
            if (email == "ericjonesonline@outlook.com") {
                reject('spam detected');
            } else {
                let message = data.message
                let output = `<ul>
                <li>Email: ${email}</li>
                <li>Message: ${message}</li>
                </ul>`
                // create reusable transporter object using the default SMTP transport
                let transporter = nodemailer.createTransport({
                    host: "sg1-ts3.a2hosting.com",
                    port: 465,
                    secure: true, // true for 465, false for other ports
                    auth: {
                    user: process.env.A2EMAIL,
                    pass: process.env.A2EMAILPASSWORD,
                    },
                });

                // send mail with defined transport object
                await transporter.sendMail({
                    from: process.env.A2EMAIL, // sender address
                    to: process.env.EMAIL, // list of receivers
                    subject: "Contact from hanfordlam.com", // Subject line
                    html: output, // html body
                });
                resolve('success')
                }
        } catch (err) {
            console.log(err)
            reject('fail')
        }
        
    })
}

Message.sendQuizToHanford = function(data) {
    return new Promise(async(resolve, reject) => {
        try {
            let student = data.Student
            let q1 = data.q1
            let q2 = data.q2
            let q3 = data.q3
            let q4a = data.q4a
            let q4b = data.q4b
            let q4c = data.q4c
            let q4d = data.q4d
            let q5 = data.q5
            let q6 = data.q6
            let q7 = data.q7
            let q8 = data.q8
            let q9 = data.q9
            let q10 = data.q10.toString().replace(/\[/, "").replace(/\]/, "").replace(/,/g, " ");
            let output = `
            <p>Student: <strong style="color:#FF0000;">${student}</strong></p>
            <p>Question 1: The piece begins with violas doing trills (fast alternating notes) at a low pitch and with a dramatic crescendo (increase volume) and diminuendo (decrease volume). Combined with randomness from individual players, this gives the music a/an <strong style="color:#FF0000;">${q1}</strong> feeling.</p>
            <p>Question 2: A solo oboe then brings in the main melody. The square wave made by the oboe together with the heavily articulated 'dancing' melodic line gives the oboe a/an <strong style="color:#FF0000;">${q2}</strong> character.</p>
            <p>Question 3: Next, the clarinets join in. It is hard to tell apart the tone colour because both clarinets and oboes rely on <strong style="color:#FF0000;">${q3}</strong> to make sound. These are made out of plants and vibrate when air is pushed across it.</p>
            <p>Question 4: Later, the flutes and violins join in with the melody too. The <strong style="color:#FF0000;">${q4a}</strong> wave of the <strong style="color:#FF0000;">${q4b}</strong> has a smooth quality while the <strong style="color:#FF0000;">${q4c}</strong> wave of the <strong style="color:#FF0000;">${q4d}</strong> has a jagged quality.</p>
            <p>Question 5: The piccolos join in here. Piccolos are little flutes! They produce a/an <strong style="color:#FF0000;">${q5}</strong> sound.</p>
            <p>Question 6: At 0:59 of Ritual Fire Dance, the timpani beats a steady pulse that helps create a marching feel. This makes us feel like we are moving steadily in anticipation. The timpani is being hit <strong style="color:#FF0000;">${q6}</strong></p>
            <p>Question 7: Wow! The horns and trumpets from the brass family of instruments arrive suddenly. Their tone is <strong style="color:#FF0000;">${q7}</strong> because of their loud volume and brass bells.</p>
            <p>Question 8: Which phrase could you use to describe the flutes here? <strong style="color:#FF0000;">${q8}</strong></p>
            <p>Question 9: The story of Ritual Fire Dance : A young gypsy girl’s frenzied dance lures the ghost of her jealous dead lover to be exorcised in flames. How does this part sound like luring? <strong style="color:#FF0000;">${q9}</strong></p>
            <p>Question 10: Which phrases help describe the final section of the piece? <strong style="color:#FF0000;">${q10}</strong></p>
            `
            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                host: "sg1-ts3.a2hosting.com",
                port: 465,
                secure: true, // true for 465, false for other ports
                auth: {
                user: process.env.A2EMAIL,
                pass: process.env.A2EMAILPASSWORD,
                },
            });

            // send mail with defined transport object
            await transporter.sendMail({
                from: process.env.A2EMAIL, // sender address
                to: process.env.EMAIL, // list of receivers
                subject: `Quiz submitted by ${student}`, // Subject line
                html: output, // html body
            });
            resolve()
        } catch (err) {
            console.log(err)
            reject('Failed to submit. Please let Mr Gunn or Hanford know!')
        }
    })
}

Message.sendMelodyToHanford = function(data) {
    return new Promise(async(resolve, reject) => {
        console.log(data)
        try {
            let student = data.Student
            let q1 = data.RangeReflection
            let q2 = data.RepeatReflection
            let q3 = data.MotionReflection
            let q4 = data.BasslineReflection
            let q5 = data.ClimaxReflection
            let output = `
            <p>Student: <strong style="color:#FF0000;">${student}</strong></p>
            <p>Range reflection: ${q1}</p>
            <p>Repeat reflection: ${q2}</p>
            <p>Motion reflection: ${q3}</p>
            <p>Bassline reflection: ${q4}</p>
            <p>Climax reflection: ${q5}</p>
            `
            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                host: "sg1-ts3.a2hosting.com",
                port: 465,
                secure: true, // true for 465, false for other ports
                auth: {
                user: process.env.A2EMAIL,
                pass: process.env.A2EMAILPASSWORD,
                },
            });

            // send mail with defined transport object
            await transporter.sendMail({
                from: process.env.A2EMAIL, // sender address
                to: process.env.EMAIL, // list of receivers
                subject: `Melody reflections submitted by ${student}`, // Subject line
                html: output, // html body
            });
            resolve()
        } catch (err) {
            console.log(err)
            reject('Failed to submit. Please let Mr Gunn or Hanford know!')
        }
    })
}

module.exports = Message