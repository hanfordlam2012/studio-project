

Quiz.prototype.markQuiz = async function(quizReplies) {
    let q1status = ""
    let q2status = ""
    let q3status = ""
    let q4status = ""
    let q5status = ""
    let q6status = ""
    let q7status = ""
    let q8status = ""
    let q9status = ""
    let q10status = ""
    return new Promise(async(resolve, reject) => {
        let quizAnswers = await quizCollection.findOne(
            {}, 
            {q1a: 1,
            q2a: 1,
            q3a: 1,
            q4a: 1,
            q5a: 1,
            q6a: 1,
            q7a: 1,
            q8a: 1,
            q9a: 1,
            q10a: 1,
            })
        if (quizReplies.q1reply == quizAnswers.q1a) {
            q1status = "Correct"
        } else {
            q1status = "Incorrect"
        }
        if (quizReplies.q2reply == quizAnswers.q2a) {
            q2status = "Correct"
        } else {
            q2status = "Incorrect"
        }
        if (quizReplies.q3reply == quizAnswers.q3a) {
            q3status = "Correct"
        } else {
            q3status = "Incorrect"
        }
        if (quizReplies.q4reply == quizAnswers.q4a) {
            q4status = "Correct"
        } else {
            q4status = "Incorrect"
        }
        if (quizReplies.q5reply == quizAnswers.q5a) {
            q5status = "Correct"
        } else {
            q5status = "Incorrect"
        }
        if (quizReplies.q6reply == quizAnswers.q6a) {
            q6status = "Correct"
        } else {
            q6status = "Incorrect"
        }
        if (quizReplies.q7reply == quizAnswers.q7a) {
            q7status = "Correct"
        } else {
            q7status = "Incorrect"
        }
        if (quizReplies.q8reply == quizAnswers.q8a) {
            q8status = "Correct"
        } else {
            q8status = "Incorrect"
        }
        if (quizReplies.q9reply == quizAnswers.q9a) {
            q9status = "Correct"
        } else {
            q9status = "Incorrect"
        }
        if (quizReplies.q10reply == quizAnswers.q10a) {
            q10status = "Correct"
        } else {
            q10status = "Incorrect"
        }
        resolve ({
            q1status,
            q2status,
            q3status,
            q4status,
            q5status,
            q6status,
            q7status,
            q8status,
            q9status,
            q10status,
        })
    })
}

Quiz.prototype.updateLeaderboard = function () {

}

module.exports = Quiz