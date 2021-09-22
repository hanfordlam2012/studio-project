import axios from 'axios'

export default class CreateWeek {
  constructor() {
    this._csrf = document.querySelector('[name="_csrf"]').value
    this.lastLessonDiv = document.querySelector("#lastLessonDiv")
    this.conversationDiv = document.querySelector("#conversationDiv")
    this.select = document.querySelector("#student")

    this.events()
  }

  events() {
    this.select.addEventListener("change", (e) => {
      this.getStudentData(e.target.value)
      this.insertReplyBox(e.target.value)
    })
  }

  getStudentData(studentId) {
    axios.post('/getStudentData', {_csrf: this._csrf, studentId: studentId}).then((response) => {
      console.log(response.data)
      this.conversationDiv.innerHTML = ""
      this.lastLessonDiv.innerText = ""

      response.data.lastLessonComments.forEach((comment) => {
        this.lastLessonDiv.innerText = comment.comments
      })
      response.data.practiceConversations.practiceConversations.forEach((entry) => {
        var node = document.createElement("p")
        var textnode = document.createTextNode(entry[0] + " : " + entry[1])
        node.appendChild(textnode)
        this.conversationDiv.appendChild(node)
      })
    }).catch((err) => console.log(err))
  }

  insertReplyBox(studentId) {
    var textbox = `
    <form id="PracticeConvo" class="my-2" action="/replyToStudent" method="POST">
      <input type="hidden" name="_csrf" value="${this._csrf}">
      <input type="hidden" name="studentId" value="${studentId}">
      <div class="form-group text-center" style="width:60%;margin:0 auto;">
        <textarea autocomplete="off" name="reply" class="form-control" style="background-color: rgb(30, 20, 51);color:chartreuse;" rows="6"></textarea>
        <button  type="submit" class="btn btn-outline-success btn-lg mt-4" style="font-size: 1.2rem;">Reply</button>
      </div>
    </form>`
    this.conversationDiv.insertAdjacentHTML('afterend', textbox)
  }
}