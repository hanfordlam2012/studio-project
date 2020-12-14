const missionsCollection = require('../db').db('studio-project').collection('missions')

let Mission = function(data) {
    this.data = data
    this.errors = []
}

Mission.checkQuiz = async function(quizSubmit) {
    return new Promise(async(resolve, reject) => {
        let quizDoc = await missionsCollection.findOne({name: quizSubmit.name})
        let q1status = ``
        let q2status = ``
        let q3status = ``
        let q4status = ``
        let q5status = ``
        if (!quizSubmit.q1r) {
            q1status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q1a}".</p>`
        } else if (quizSubmit.q1r == quizDoc.q1a) {
            q1status = `<p>You answered : "${quizSubmit.q1r}".</p><p class="green-text">Correct!</p>`
        } else {
            q1status = `<p>You answered : "${quizSubmit.q1r}". That's not the answer.</p><p class="pink-text">The correct response is "${quizDoc.q1a}".</p>`
        }
        if (!quizSubmit.q2r) {
            q2status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q2a}".</p>`
        } else if (quizSubmit.q2r == quizDoc.q2a) {
            q2status = `You answered : "${quizSubmit.q2r}".</p><p class="green-text">Correct!</p>`
        } else {
            q2status = `<p>You answered : "${quizSubmit.q2r}". That's not the answer.</p><p class="pink-text">The correct response is "${quizDoc.q2a}".</p>`
        }
        if (!quizSubmit.q3r) {
            q3status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q3a}".</p>`
        } else if (quizSubmit.q3r == quizDoc.q3a) {
            q3status = `You answered : "${quizSubmit.q3r}".</p><p class="green-text">Correct!</p>`
        } else {
            q3status = `<p>You answered : "${quizSubmit.q3r}". That's not the answer.</p><p class="pink-text">The correct response is "${quizDoc.q3a}".</p>`
        }
        if (!quizSubmit.q4r) {
            q4status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q4a}".</p>`
        } else if (quizSubmit.q4r == quizDoc.q4a) {
            q4status = `You answered : "${quizSubmit.q4r}".</p><p class="green-text">Correct!</p>`
        } else {
            q4status = `<p>You answered : "${quizSubmit.q4r}". That's not the answer.</p><p class="pink-text">The correct response is "${quizDoc.q4a}".</p>`
        }
        if (!quizSubmit.q5r) {
            q5status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q5a}".</p>`
        } else if (quizSubmit.q5r == quizDoc.q5a) {
            q5status = `You answered : "${quizSubmit.q5r}".</p><p class="green-text">Correct!</p>`
        } else {
            q5status = `<p>You answered : "${quizSubmit.q5r}". That's not the answer.</p><p class="pink-text">The correct response is "${quizDoc.q5a}".</p>`
        }

        let missionResult = `
        <div class="question-div">
        <h2>Q1 : <span class="small">${quizDoc.q1}</span></h2>
        ${q1status}
        </div>
        <div class="question-div">
        <h2>Q2 : <span class="small">${quizDoc.q2}</span></h2>
        ${q2status}
        </div>
        <div class="question-div">
        <h2>Q3 : <span class="small">${quizDoc.q3}</span></h2>
        ${q3status}
        </div>
        <div class="question-div">
        <h2>Q4 : <span class="small">${quizDoc.q4}</span></h2>
        ${q4status}
        </div>
        <div class="question-div">
        <h2>Q5 : <span class="small">${quizDoc.q5}</span></h2>
        ${q5status}
        </div>
        `
        resolve (missionResult)
    })
}
    

module.exports = Mission