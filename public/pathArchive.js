(() => {
  const config = document.querySelector('#archiveConfig')
  const csrf = config.dataset.csrf
  const student = document.querySelector('#student')
  const search = document.querySelector('#search')
  const archive = document.querySelector('#archive')
  const heading = document.querySelector('#archiveHeading')
  const count = document.querySelector('#archiveCount')
  let weeks = []

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]))
  const date = value => {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? 'Undated' : new Intl.DateTimeFormat('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(parsed)
  }
  const rating = (name, label, value) => `<label>${label}<select name="${name}" required>${[1, 2, 3, 4, 5].map(number => `<option value="${number}" ${String(value) === String(number) ? 'selected' : ''}>${number} · ${['Beginning', 'Emerging', 'Developing', 'Secure', 'Expressive'][number - 1]}</option>`).join('')}</select></label>`

  function piecesFor(week) {
    if (Array.isArray(week.pieces) && week.pieces.length) return week.pieces
    return [{
      pieceName: week.pieceName || '', lessonFocus: week.lessonFocus || '', quietKnot: week.quietKnot || '',
      practiceTasks: Array.isArray(week.practiceTasks) ? week.practiceTasks : []
    }]
  }

  function taskMarkup(task = {}, index = 0) {
    return `<div class="task"><div class="task-head"><span>TASK ${index + 1}</span><button type="button" class="remove-task">Remove</button></div><input class="wide" data-key="task" placeholder="What to do" value="${esc(task.task)}"><input data-key="start" placeholder="Where to begin" value="${esc(task.start)}"><input data-key="why" placeholder="Why it matters" value="${esc(task.why)}"><input class="wide" data-key="success" placeholder="Success cue" value="${esc(task.success)}"></div>`
  }

  function pieceMarkup(piece = {}, index = 0) {
    const tasks = Array.isArray(piece.practiceTasks) && piece.practiceTasks.length ? piece.practiceTasks : [{}]
    return `<section class="piece-editor"><div class="piece-editor-head"><strong>Piece ${index + 1}</strong><div><button type="button" class="move-piece-up">Move up</button><button type="button" class="move-piece-down">Move down</button><button type="button" class="remove-piece">Remove piece</button></div></div><div class="two"><div class="field"><label>Piece or project</label><input data-piece-key="pieceName" value="${esc(piece.pieceName)}" required></div><div class="field"><label>Lesson focus</label><input data-piece-key="lessonFocus" value="${esc(piece.lessonFocus)}"></div></div><div class="field"><label>Practice path</label><div class="tasks">${tasks.map(taskMarkup).join('')}</div><button type="button" class="add-task">+ Add task</button></div><div class="field"><label>The quiet knot</label><textarea data-piece-key="quietKnot" rows="3">${esc(piece.quietKnot)}</textarea></div></section>`
  }

  function card(week) {
    const pieces = piecesFor(week)
    const names = pieces.map(piece => piece.pieceName).filter(Boolean)
    const isDraft = week.status === 'draft'
    const delivery = week.emailDelivery || {state: 'not-recorded'}
    const deliveryText = ({sent:'Family email sent',failed:'Family email failed',sending:'Family email sending','not-sent':'No family email sent','not-requested':'Family email not requested','not-recorded':'Email status not recorded'})[delivery.state] || 'Email status not recorded'
    return `<article class="path-card" data-id="${esc(week._id)}"><button class="path-summary" type="button" aria-expanded="false"><span class="path-date">${date(week.createdDate)}<br><span class="state-badge ${isDraft ? 'draft' : ''}">${isDraft ? 'Draft' : 'Published'}</span></span><span class="path-piece">${esc(names[0] || 'Untitled path')}${names.length > 1 ? ` + ${names.length - 1} more` : ''}</span><span class="path-focus">${esc(week.lessonFocus || week.generalNote || 'No focus recorded')}</span><span class="path-mark">+</span></button><div class="edit-region"><form action="/edit-week" method="POST" class="editor"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="week_id" value="${esc(week._id)}"><input type="hidden" name="pieceName"><input type="hidden" name="lessonFocus"><input type="hidden" name="quietKnot"><input type="hidden" name="practiceTasks"><input type="hidden" name="pieces"><input type="hidden" name="comments"><div class="editor-grid"><div class="edit-fields"><div class="piece-edit-list">${pieces.map(pieceMarkup).join('')}</div><button type="button" class="add-piece">+ Add another piece</button><div class="field"><label>Lesson-wide note</label><textarea name="generalNote" rows="4" placeholder="A note beyond any one piece.">${esc(week.generalNote)}</textarea></div><details><summary>Development snapshot</summary><div class="ratings">${rating('rhythm', 'Pulse and rhythm', week.rhythm)}${rating('coordination', 'Pitch', week.coordination)}${rating('tone', 'Articulation', week.tone)}${rating('dynamics', 'Dynamics', week.dynamics)}${rating('stylistic', 'Body feeling', week.stylistic)}</div></details>${!isDraft ? `<div class="email-state">${esc(deliveryText)}${delivery.sentAt ? ` on ${date(delivery.sentAt)}` : ''}</div>` : ''}<div class="save-row"><button type="button" class="cancel">Close</button>${!isDraft ? '<button class="resend-email" type="submit" formaction="/week-email-resend" formmethod="POST">Send family email again</button>' : ''}<button class="save" type="submit" name="submissionAction" value="save">Save changes</button>${isDraft ? '<button class="publish-draft" type="submit" name="submissionAction" value="publish">Publish draft</button>' : ''}</div></div><aside class="preview"><small>${isDraft ? 'Private draft preview' : 'Student preview'}</small><div class="preview-content"></div></aside></div></form></div></article>`
  }

  function taskData(pieceElement) {
    return [...pieceElement.querySelectorAll('.task')].map(row => Object.fromEntries(
      [...row.querySelectorAll('[data-key]')].map(input => [input.dataset.key, input.value.trim()])
    )).filter(task => task.task)
  }

  function pieceData(form) {
    return [...form.querySelectorAll('.piece-editor')].map(piece => ({
      pieceName: piece.querySelector('[data-piece-key="pieceName"]').value.trim(),
      lessonFocus: piece.querySelector('[data-piece-key="lessonFocus"]').value.trim(),
      quietKnot: piece.querySelector('[data-piece-key="quietKnot"]').value.trim(),
      practiceTasks: taskData(piece)
    }))
  }

  function notesFor(pieces, generalNote) {
    const lines = []
    pieces.forEach(piece => {
      if (piece.pieceName) lines.push(`# ${piece.pieceName}`)
      if (piece.lessonFocus) lines.push(`## Focus\n${piece.lessonFocus}`)
      if (piece.practiceTasks.length) {
        lines.push('## Practice Path')
        piece.practiceTasks.forEach((task, index) => lines.push(`${index + 1}. **${task.task}**${task.start ? `\n\n   **Begin at:** ${task.start}` : ''}${task.why ? `\n\n   **Why:** ${task.why}` : ''}${task.success ? `\n\n   **Success cue:** ${task.success}` : ''}`))
      }
      if (piece.quietKnot) lines.push(`## The Quiet Knot\n> ${piece.quietKnot}`)
    })
    if (generalNote) lines.push(`## Lesson-wide Note\n${generalNote}`)
    return lines.join('\n\n')
  }

  function renumber(form) {
    const pieces = [...form.querySelectorAll('.piece-editor')]
    pieces.forEach((piece, pieceIndex) => {
      piece.querySelector('.piece-editor-head strong').textContent = `Piece ${pieceIndex + 1}`
      piece.querySelector('.move-piece-up').disabled = pieceIndex === 0
      piece.querySelector('.move-piece-down').disabled = pieceIndex === pieces.length - 1
      piece.querySelector('.remove-piece').disabled = pieces.length === 1
      ;[...piece.querySelectorAll('.task')].forEach((task, taskIndex) => {
        task.querySelector('.task-head span').textContent = `TASK ${taskIndex + 1}`
        task.querySelector('.remove-task').disabled = piece.querySelectorAll('.task').length === 1
      })
    })
    form.querySelector('.add-piece').disabled = pieces.length >= 4
  }

  function refresh(cardElement) {
    const form = cardElement.querySelector('form')
    const pieces = pieceData(form)
    const first = pieces[0] || {pieceName: '', lessonFocus: '', quietKnot: '', practiceTasks: []}
    form.pieces.value = JSON.stringify(pieces)
    form.pieceName.value = first.pieceName
    form.lessonFocus.value = first.lessonFocus
    form.quietKnot.value = first.quietKnot
    form.practiceTasks.value = JSON.stringify(first.practiceTasks)
    form.comments.value = notesFor(pieces, form.generalNote.value.trim())
    form.querySelector('.preview-content').innerHTML = pieces.map(piece => `<section class="preview-piece"><h3>${esc(piece.pieceName || 'Untitled piece')}</h3>${piece.lessonFocus ? `<p>${esc(piece.lessonFocus)}</p>` : ''}<ol>${piece.practiceTasks.length ? piece.practiceTasks.map(task => `<li><strong>${esc(task.task)}</strong>${task.success ? ` · ${esc(task.success)}` : ''}</li>`).join('') : '<li>No tasks recorded.</li>'}</ol>${piece.quietKnot ? `<p class="preview-knot">The quiet knot: ${esc(piece.quietKnot)}</p>` : ''}</section>`).join('') + (form.generalNote.value.trim() ? `<p class="preview-general">Lesson-wide note: ${esc(form.generalNote.value.trim())}</p>` : '')
    renumber(form)
  }

  function bind(cardElement) {
    const form = cardElement.querySelector('form')
    cardElement.querySelector('.path-summary').addEventListener('click', () => {
      const open = cardElement.classList.toggle('open')
      cardElement.querySelector('.path-summary').setAttribute('aria-expanded', open)
      if (open) refresh(cardElement)
    })
    form.addEventListener('input', () => refresh(cardElement))
    form.addEventListener('click', event => {
      const piece = event.target.closest('.piece-editor')
      if (event.target.matches('.add-task')) {
        const tasks = piece.querySelector('.tasks')
        if (tasks.children.length < 6) tasks.insertAdjacentHTML('beforeend', taskMarkup({}, tasks.children.length))
      } else if (event.target.matches('.remove-task')) {
        event.target.closest('.task').remove()
      } else if (event.target.matches('.add-piece')) {
        const list = form.querySelector('.piece-edit-list')
        if (list.children.length < 4) list.insertAdjacentHTML('beforeend', pieceMarkup({}, list.children.length))
      } else if (event.target.matches('.remove-piece')) {
        piece.remove()
      } else if (event.target.matches('.move-piece-up') && piece.previousElementSibling) {
        piece.parentNode.insertBefore(piece, piece.previousElementSibling)
      } else if (event.target.matches('.move-piece-down') && piece.nextElementSibling) {
        piece.parentNode.insertBefore(piece.nextElementSibling, piece)
      } else if (event.target.matches('.cancel')) {
        cardElement.classList.remove('open')
      } else {
        return
      }
      refresh(cardElement)
    })
    form.addEventListener('submit', event => {
      if (event.submitter && event.submitter.classList.contains('resend-email') && !confirm('Send this published path to the family email currently saved for this student?')) { event.preventDefault(); return }
      refresh(cardElement)
      const pieces = pieceData(form)
      const publishing = event.submitter && event.submitter.value === 'publish'
      const snapshotMissing = [...form.querySelectorAll('.ratings select')].some(field => !field.value)
      if (publishing && (!pieces.length || pieces.some(piece => !piece.pieceName || !piece.practiceTasks.length) || snapshotMissing)) {
        event.preventDefault()
        alert('Every piece needs a name and at least one practice task, and the development snapshot must be complete before publishing.')
      }
    })
  }

  function render() {
    const query = search.value.trim().toLowerCase()
    const filtered = weeks.filter(week => [week.comments, week.generalNote, ...piecesFor(week).flatMap(piece => [piece.pieceName, piece.lessonFocus, piece.quietKnot])].join(' ').toLowerCase().includes(query))
    archive.innerHTML = filtered.length ? `<div class="path-list">${filtered.map(card).join('')}</div>` : '<div class="empty">No paths match this search.</div>'
    count.textContent = `${filtered.length} ${filtered.length === 1 ? 'path' : 'paths'}`
    archive.querySelectorAll('.path-card').forEach(bind)
  }

  student.addEventListener('change', async () => {
    weeks = []
    search.value = ''
    search.disabled = true
    count.textContent = ''
    if (!student.value) {
      heading.textContent = 'Recent paths'
      archive.innerHTML = '<div class="empty">Choose a student to open their archive.</div>'
      return
    }
    heading.textContent = `${student.options[student.selectedIndex].text}'s paths`
    archive.innerHTML = '<div class="empty">Opening the archive...</div>'
    try {
      const response = await fetch('/getStudentWeekArchive', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({_csrf: csrf, studentId: student.value})
      })
      const data = await response.json()
      weeks = data.weeks || []
      search.disabled = false
      render()
    } catch (error) {
      archive.innerHTML = '<div class="empty">The archive could not be loaded.</div>'
    }
  })
  search.addEventListener('input', render)
})()
