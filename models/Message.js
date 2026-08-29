const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
const usersCollection = require('../db').db('studio-project').collection('users')
const validator = require('validator')
dotenv.config({quiet: true})

let Message = function(data) {
    this.email = data.email
    this.message = data.message
}

const escapeEmailHTML = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const recipientList = value => {
    const recipients = (Array.isArray(value) ? value : String(value || '').split(';')).map(email => String(email).trim()).filter(Boolean)
    if (!recipients.length || recipients.length > 5 || recipients.some(email => !validator.isEmail(email))) throw new Error('Invalid family email recipient list.')
    return [...new Set(recipients)]
}

Message.sendLessonPathToParent = async function(data) {
    const pieces = Array.isArray(data.pieces) && data.pieces.length ? data.pieces : [{
        pieceName: data.pieceName,
        lessonFocus: data.lessonFocus,
        quietKnot: data.quietKnot,
        practiceTasks: data.practiceTasks || []
    }]
    const pieceSections = pieces.map((piece, index) => {
      const taskItems = (piece.practiceTasks || []).map((task) => `
        <li style="margin-bottom:12px"><strong>${escapeEmailHTML(task.task)}</strong>
        ${task.start ? `<br>Begin at: ${escapeEmailHTML(task.start)}` : ''}
        ${task.why ? `<br>Why: ${escapeEmailHTML(task.why)}` : ''}
        ${task.success ? `<br>Success cue: ${escapeEmailHTML(task.success)}` : ''}</li>`).join('')
      return `<section style="border-top:${index ? '1px solid #d7dfe2' : '0'};padding-top:${index ? '18px' : '0'};margin-top:${index ? '18px' : '0'}">
        <h2 style="font-size:22px">${escapeEmailHTML(piece.pieceName)}</h2>
        ${piece.lessonFocus ? `<p><strong>Focus:</strong> ${escapeEmailHTML(piece.lessonFocus)}</p>` : ''}
        ${taskItems ? `<h3 style="font-size:17px">Practice path</h3><ol>${taskItems}</ol>` : ''}
        ${piece.quietKnot ? `<p><strong>The quiet knot:</strong> ${escapeEmailHTML(piece.quietKnot)}</p>` : ''}
      </section>`
    }).join('')
    const output = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#17242b;max-width:640px">
        <p>Hello ${escapeEmailHTML(data.parentName || 'there')},</p>
        <p>Here is ${escapeEmailHTML(data.studentName)}'s next practice path from the studio.</p>
        ${pieceSections}
        ${data.generalNote ? `<p style="border-left:4px solid #087f76;padding:12px 14px;background:#eef7f5"><strong>Lesson-wide note:</strong><br>${escapeEmailHTML(data.generalNote)}</p>` : ''}
        <p>${escapeEmailHTML(data.familySummary)}</p>
        <p>The same notes are waiting in the Music Learning Studio portal.</p>
        <p>Warmly,<br>Hanford</p>
    </div>`
    const transporter = nodemailer.createTransport({
        host: "sg1-ts3.a2hosting.com",
        port: 465,
        secure: true,
        auth: {user: process.env.A2EMAIL, pass: process.env.A2EMAILPASSWORD}
    })
    const safeSubject = String(data.subject || 'A new practice path').replace(/[\r\n]+/g, ' ').trim().slice(0, 140)
    return transporter.sendMail({
        from: process.env.A2EMAIL,
        to: recipientList(data.to),
        subject: safeSubject,
        html: output
    })
}

Message.sendEmail = async function (data) {
    await saveToDatabase(data)
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

saveToDatabase = async function(data) {
    let userDoc = await usersCollection.findOne({username: "superuser"})
    let entry = []
    entry.push(data.email, data.message)
    let messages = userDoc.messages
    messages.push(entry)
    await usersCollection.updateOne({username: "superuser"}, {$set: {messages: messages}})
}

Message.sendFeedbackToHanford = function(data) {
    return new Promise(async(resolve, reject) => {
        try {
            let response1 = data.feedback1
            let response2 = data.feedback2
            let response3 = data.feedback3
            let student = data.Student
            let output = `
            student: ${student}
            feedback1: ${response1}
            feedback2: ${response2}
            feedback3: ${response3}
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
                subject: `Feedback submitted by ${student}`, // Subject line
                html: output, // html body
            });
            resolve()
        } catch (e) {
            console.log(e)
            reject("Oh no, your feedback could not be sent. Please let Hanford know!")
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

Message.sendCheckedSnapshot = function(req) {
    return new Promise(async(resolve, reject) => {
        try {
            const checkedItems = [].concat(req.body.checkedItems || []).map(item => String(item).trim()).filter(Boolean).slice(0, 30)
            if (!checkedItems.length) return reject('fail')
            const student = [req.session.user.fName, req.session.user.lName].filter(Boolean).join(' ') || req.session.user.username || 'A student'
            const submittedAt = new Intl.DateTimeFormat('en-AU', {timeZone: 'Australia/Sydney', dateStyle: 'full', timeStyle: 'short'}).format(new Date())
            const itemRows = checkedItems.map((item, index) => `<li style="margin:0 0 12px;padding:12px 14px;background:#f4f8f7;border-left:4px solid #087f76"><strong style="color:#087f76">${index + 1}.</strong> ${escapeEmailHTML(item)}</li>`).join('')
            const output = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#19303a;max-width:640px"><div style="background:#15364c;color:#fff;padding:20px 24px"><div style="font-size:12px;text-transform:uppercase;color:#9fddd4;font-weight:bold">Music Learning Studio</div><h1 style="font-size:24px;margin:6px 0 0">Practice items checked</h1></div><div style="padding:22px 24px;border:1px solid #d8ddd8;border-top:0"><p style="margin-top:0"><strong>${escapeEmailHTML(student)}</strong> shared ${checkedItems.length} completed ${checkedItems.length === 1 ? 'item' : 'items'}.</p><ol style="list-style:none;margin:20px 0;padding:0">${itemRows}</ol><p style="color:#63747a;font-size:13px;margin-bottom:0">Received ${escapeEmailHTML(submittedAt)}</p></div></div>`
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
                subject: `Practice update from ${student}: ${checkedItems.length} checked`,
                html: output, // html body
            });
            resolve("success")
        } catch (e) {
            console.log(e)
            reject("fail")
        }
    })
}

module.exports = Message
